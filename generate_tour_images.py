import os
import requests
import time
import pandas as pd
import random
import json
import base64
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter
import uuid
import argparse
from supabase import create_client, Client
import re
import unicodedata
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("image_generation.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Hardcoded credentials
SUPABASE_URL = "https://jeiuruhneitvfyjkmbvj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaXVydWhuZWl0dmZ5amttYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjU5NzQsImV4cCI6MjA1ODI0MTk3NH0.iYBsdI4p7o7rKbrMHstzis4KZYV_ks2p09pmtj5-bTo"
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent'
PEXELS_API_KEY = "2nTDyWqcjwBRUWzyi2mpWlbqKHAy4xxAHuRbSHtA38kCOfoNQbDeOoye"

# Base directory for temporary local storage
TEMP_DIR = "temp_images"
os.makedirs(TEMP_DIR, exist_ok=True)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Storage bucket name (for storing the actual image files)
STORAGE_BUCKET = "tour-images"

# Database table name (for storing metadata about images)
DB_TABLE_NAME = "tour_images"

# Quality threshold for images (1-10 scale)
IMAGE_QUALITY_THRESHOLD = 7.5

def call_gemini_api(prompt):
    """
    Call the Gemini API with a prompt
    
    Args:
        prompt: The prompt to send to Gemini
    
    Returns:
        The response content from Gemini
    """
    # Construct the API URL with the API key
    url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    try:
        # Add a delay to avoid rate limiting
        time.sleep(1)
        
        logger.info(f"Sending prompt to Gemini API: {prompt[:100]}...")
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if not response.ok:
            logger.error(f"Gemini API error: {response.status_code} - {response.text[:200]}...")
            return None
            
        result = response.json()
        
        # Extract the content from Gemini's response format
        if 'candidates' in result and result['candidates'] and 'content' in result['candidates'][0]:
            content_parts = result['candidates'][0]['content']['parts']
            content = ''.join([part.get('text', '') for part in content_parts if 'text' in part])
            logger.info(f"Received response from Gemini API: {content[:100]}...")
            return content
        else:
            logger.error("Unexpected response format from Gemini API")
            return None
        
    except Exception as e:
        logger.error(f"Gemini API Request Error: {str(e)}")
        return None

def generate_search_terms_for_tour(tour_name, description=None, rejected_terms=None):
    """
    Generate 10 high-level search terms for a tour using Gemini
    
    Args:
        tour_name: Name of the tour
        description: Description of the tour (if available)
        rejected_terms: List of previously rejected search terms to avoid
    
    Returns:
        List of tuples with search terms and associated countries
    """
    if rejected_terms is None:
        rejected_terms = []
        
    logger.info(f"Generating search terms for: '{tour_name}' using Gemini")
    
    # Add description context if available
    description_text = f"\nTour Description: {description}" if description else ""
    
    # Construct the prompt
    prompt = f"""
    I need 8 high-level search terms for stunning places that would make excellent images for a luxury honeymoon tour titled "{tour_name}".{description_text}
    
    Please provide search terms that:
    1. Are very broad and generic (e.g., "Barcelona", "Barcelona sunset", "Colosseum")
    2. Never more than 3 words
    3. Showcase iconic landmarks or views that are recognizable (like "Eiffel Tower" or "Taj Mahal")
    4. Would appeal to luxury travelers and honeymooners
    5. Are diverse and represent different aspects of the tour
    6. Directly relate to the destinations mentioned in the tour name and description
    7. For places that are famous for food like Spain, Italy, France, Thailand, Greece, etc, include 1 search term for food in the search term.
    8. For places that are famous for festivities, do include a search term for the festivities (like "Carnival" in Venice).
    9. For places that are famous for beaches (jamaica, maldives or bali etc), include multiple search terms around beaches, sea life and water sports (like diving or surfing).
    10. For places like Japan famous for sumo or geisha, include search terms for sumo and geisha.
    11. For places like India famous for elephants, include search terms for elephants. Similar for sea turtles, lions, pandas etc.

    For each search term, also provide the country it is associated with.
    
    Please avoid these previously rejected terms: {', '.join(rejected_terms) if rejected_terms else 'None'}
    
    Format your response as a JSON array of objects, with each object containing a "term" and "country".
    Example: [
        {{"term": "Barcelona", "country": "Spain"}},
        {{"term": "Santorini", "country": "Greece"}},
        {{"term": "Venice canal", "country": "Italy"}}
    ]    
    """
    
    # Call Gemini API
    response = call_gemini_api(prompt)
    
    if not response:
        logger.error(f"Failed to generate search terms")
        return []
    
    # Extract search terms and countries from response
    try:
        # Clean up the response - remove markdown code blocks if present
        if "```json" in response:
            # Extract the JSON part from markdown code block
            json_match = re.search(r'```json\s*([\s\S]*?)```', response)
            if json_match:
                response = json_match.group(1).strip()
            else:
                # If regex fails, try simple string replacement
                response = response.replace("```json", "").replace("```", "").strip()
        
        # Try to parse as JSON
        logger.debug(f"Cleaned JSON response: {response[:100]}...")
        search_terms_data = json.loads(response)
        
        # Validate that we got a list of dictionaries
        if not isinstance(search_terms_data, list):
            logger.error(f"Invalid response format: not a list")
            return []
            
        # Filter out any previously rejected terms
        search_terms = [
            (item['term'], item['country']) 
            for item in search_terms_data 
            if 'term' in item and 'country' in item and item['term'] not in rejected_terms
        ]
        
        logger.info(f"Successfully extracted {len(search_terms)} search terms")
        return search_terms
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}")
        logger.debug(f"Raw response: {response}")
        return []

def get_tours_from_supabase():
    """
    Get all tours from Supabase
    
    Returns:
        List of tour objects
    """
    try:
        response = supabase.table('tours').select('id, name, description').execute()
        tours = response.data
        logger.info(f"Retrieved {len(tours)} tours from Supabase")
        return tours
    except Exception as e:
        logger.error(f"Error fetching tours from Supabase: {e}")
        return []

def upload_to_supabase_storage(image_data, filename):
    """
    Upload an image to Supabase Storage
    
    Args:
        image_data: Binary image data
        filename: Filename to use in storage
    
    Returns:
        URL of the uploaded file
    """
    # Define the storage path
    bucket_name = STORAGE_BUCKET
    storage_path = filename
    
    # API endpoint for Supabase storage
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket_name}/{storage_path}"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/jpeg"
    }
    
    # Upload the file
    try:
        response = requests.post(url, headers=headers, data=image_data)
        
        if response.status_code == 200:
            # Return the public URL without trailing question mark
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{storage_path}"
            logger.info(f"Successfully uploaded image to Supabase storage: {filename}")
            return public_url.rstrip('?')  # Remove any trailing question mark
        else:
            logger.error(f"Error uploading to storage: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Exception during storage upload: {e}")
        return None

def insert_to_tour_images(tour_id, image_url, alt_text, search_term, validation_result, is_primary=False, is_featured=False, display_order=0, country_name=None, alt=None):
    """
    Insert image metadata into tour_images table
    
    Args:
        tour_id: ID of the tour
        image_url: URL of the image in storage
        alt_text: Alt text for the image
        search_term: Search term used to find the image
        validation_result: Validation result from Gemini
        is_primary: Whether this is the primary image
        is_featured: Whether this is a featured image
        display_order: Order to display the image (0 = first)
        country_name: Name of the country
        alt: Original alt description from Pexels
    """
    try:
        now = datetime.now().isoformat()
        
        # Extract overall score from validation result
        overall_score = validation_result.get('score', 0)
        
        # Create record
        record = {
            "id": str(uuid.uuid4()),
            "tour_id": tour_id,
            "image_url": image_url,
            "alt_text": alt_text,
            "alt": alt,  # Store the original Pexels alt description
            "search_term": search_term,
            "is_primary": is_primary,
            "is_featured": is_featured,
            "overall_score": overall_score,
            "created_at": now,
            "updated_at": now,
            "display_order": display_order,
            "country_name": country_name
        }
        
        # Insert record
        response = supabase.table(DB_TABLE_NAME).insert(record).execute()
        
        if not response.data:
            logger.error(f"Failed to insert image metadata: No data returned")
            return None
            
        image_id = response.data[0]['id']
        return image_id
            
    except Exception as e:
        logger.error(f"Error inserting image metadata: {e}")
        return None

def download_image(url):
    """
    Download an image from a URL
    
    Args:
        url: URL of the image to download
    
    Returns:
        Image data as bytes or None if failed
    """
    try:
        logger.info(f"Downloading image from: {url}")
        response = requests.get(url, stream=True, timeout=10)
        
        if not response.ok:
            logger.error(f"Failed to download image: {response.status_code} - {response.reason}")
            return None
            
        # Return the image data
        return response.content
        
    except Exception as e:
        logger.error(f"Error downloading image: {e}")
        return None

def post_process_image(image):
    """
    Apply post-processing effects to beautify the image and make it visually consistent
    
    Args:
        image: PIL Image object
    
    Returns:
        Processed PIL Image object
    """
    try:
        # 1. Enhance contrast slightly
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.2)  # Increase contrast by 20%
        
        # 2. Enhance color saturation
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(1.15)  # Increase saturation by 15%
        
        # 3. Enhance brightness slightly
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.05)  # Increase brightness by 5%
        
        # 4. Apply slight sharpening
        image = image.filter(ImageFilter.SHARPEN)
        
        # 5. Apply subtle warming filter 
        # (This creates a slight warm tone that works well for travel/luxury images)
        r, g, b = image.split()
        r = ImageEnhance.Brightness(r).enhance(1.06)  # Boost red channel slightly
        g = ImageEnhance.Brightness(g).enhance(1.02)  # Boost green channel very slightly
        # Blue channel left as is
        image = Image.merge("RGB", (r, g, b))
        
        return image
        
    except Exception as e:
        logger.error(f"Error in post-processing image: {e}")
        return image  # Return original image if processing fails

def optimize_image(image_data, target_width=1920, quality=90):
    """
    Optimize an image for web use
    
    Args:
        image_data: Image data as bytes
        target_width: Maximum width for resized image
        quality: JPEG compression quality (0-100)
    
    Returns:
        Tuple of (optimized PIL Image, bytes for storage)
    """
    try:
        # Open the image with PIL
        image = Image.open(BytesIO(image_data))
        
        # Resize if too large (max width target_width)
        if image.width > target_width:
            # Calculate new dimensions while maintaining aspect ratio
            aspect_ratio = image.height / image.width
            new_width = target_width
            new_height = int(target_width * aspect_ratio)
                
            # Resize the image
            image = image.resize((new_width, new_height), Image.LANCZOS)
            logger.info(f"Resized image to {new_width}x{new_height}")
        
        # Convert to RGB if needed (in case of RGBA)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Apply post-processing to beautify the image
        processed_image = post_process_image(image)
        
        # Convert the processed image to bytes
        img_byte_arr = BytesIO()
        processed_image.save(img_byte_arr, format='JPEG', quality=quality)
        img_bytes = img_byte_arr.getvalue()
        
        return processed_image, img_bytes
        
    except Exception as e:
        logger.error(f"Error optimizing image: {e}")
        return None, None

def search_pexels(query, per_page=4):
    """
    Search Pexels API for images matching a query
    
    Args:
        query: Search term
        per_page: Number of results to return (max 80)
    
    Returns:
        List of photo objects from Pexels
    """
    try:
        logger.info(f"Searching Pexels for term: {query}")
        headers = {
            'Authorization': PEXELS_API_KEY
        }
        
        # Construct the URL with parameters
        params = {
            'query': query,
            'per_page': per_page,
            'orientation': 'landscape'  # Prefer landscape images for tour photos
        }
        
        url = "https://api.pexels.com/v1/search"
        
        # Make the request
        response = requests.get(url, headers=headers, params=params, timeout=30)
        
        # Implement rate limiting - pause for 15 seconds after each API call
        logger.info(f"Rate limiting: sleeping for 15 seconds after Pexels API call")
        time.sleep(15)
        
        if not response.ok:
            logger.error(f"Pexels API error: {response.status_code} - {response.text}")
            return []
            
        # Parse the response
        data = response.json()
        
        if 'photos' not in data or not data['photos']:
            logger.warning(f"No photos found for query: {query}")
            return []
            
        logger.info(f"Found {len(data['photos'])} photos for query: {query}")
        return data['photos']
        
    except Exception as e:
        logger.error(f"Error searching Pexels: {e}")
        return []

def simple_image_validation(image_url, tour_name, search_term, description=None, alt_text=None):
    """
    Simple validation of an image using Gemini
    
    Args:
        image_url: URL of the image to validate
        tour_name: Name of the tour
        search_term: Search term used to find the image
        description: Description of the tour (if available)
        alt_text: Alt text description of the image from Pexels
    
    Returns:
        Tuple of (is_valid, score)
    """
    # Add description context if available
    description_text = f"\nTour Description: {description}" if description else ""
    
    # Add alt text information if available
    alt_text_info = f"\nImage description: {alt_text}" if alt_text else ""
    
    prompt = f"""
    I am building a luxury travel website and I am using Pexels API to retrieve images.
    THe problem is that sometimes these images are not always of high quality.
    Your job is to evaluate the relevance, quality and suitability of an image given the context. 
    
    Context includes: 
    1) the tour titled "{tour_name}" 
    2) the tour description:{description_text}
    3) the search term we used to call Pexels's API: {search_term}

    The output we have which you need to evaluate includes: 
    1) Image URL: {image_url}
    2) Image description: {alt_text_info}
    
    On a scale of 1-10, rate how suitable this image is for a luxury travel website based on these criteria:
    1) Is the image relevant to the search term and the tour description? For example, if the search term is about Victoria Falls, the image should show Victoria Falls.
    2) We don't want the image to focus on random people. However tourists in background and even more so characteristic locals like Sumo or Geisha in Japan are great.
    3) Is the image in line what you would expect from a luxury travel website?
    4) The image seems to come from the countries / places mentioned in {description_text} and not some other country or tour. Given the tour description, please ensure the image matches one of the destinations or activities mentioned.
    5) If there are pictures of food, let's only keep them if they are authentic food from the countries mentioned in the tour. Eg generic breakfast or generic bottles are NOT OK. A pad thai on a bustling market for Thailand great.
    6) Let's avoid black and white images.
    7) Let's avoid images of specific hotels where the name is very clearly visible. Fine if it's a generic landmark.
    8) Let's avoid generic images such as a generic INDOOR pool which could have been taken anywhere.

    Consider image quality, composition, aesthetic appeal, and relevance to the tour and search term.
    
    Provide only a single score (1-10) and a brief one-sentence explanation. Pictures above 7 will be used.
    Format your response as JSON: {{"score": X, "explanation": "..."}}
    """
    
    # Call Gemini API
    response = call_gemini_api(prompt)
    
    if not response:
        logger.error(f"Failed to validate image")
        return False, 0
    
    # Parse JSON response
    try:
        # Clean up the response - remove markdown code blocks if present
        if "```json" in response:
            json_match = re.search(r'```json\s*([\s\S]*?)```', response)
            if json_match:
                response = json_match.group(1).strip()
            else:
                response = response.replace("```json", "").replace("```", "").strip()
        
        validation_result = json.loads(response)
        
        # Extract score
        score = float(validation_result.get('score', 0))
        explanation = validation_result.get('explanation', '')
        
        logger.info(f"Image validation score: {score}/10 - {explanation}")
        
        # Image passes if score is 7 or higher
        is_valid = score >= 7.0
        
        return is_valid, score
    except Exception as e:
        logger.error(f"Error parsing validation response: {e}")
        return False, 0

def check_redundancy(validated_images):
    """
    Check for redundancy in validated images using Gemini
    
    Args:
        validated_images: List of validated image data
    
    Returns:
        List of non-redundant images (up to 13, sorted by score)
    """
    # First sort by score (highest first)
    validated_images.sort(key=lambda x: x.get('score', 0), reverse=True)
    
    # If we have 13 or fewer images, no need for redundancy check
    if len(validated_images) <= 13:
        return validated_images[:13]  # Return all images, up to 13
    
    # Try to use Gemini for redundancy check
    try:
        # Create prompt
        image_descriptions = []
        for i, img in enumerate(validated_images):
            desc = f"Image {i+1}: {img['search_term']}, Description: {img.get('description', 'No description')}, Score: {img.get('score', 0)}"
            image_descriptions.append(desc)
            
        descriptions_text = "\n".join(image_descriptions)
        
        prompt = f"""
        I have a set of {len(validated_images)} images for a luxury travel website.
        Please identify any redundant or very similar images that should be removed to ensure diversity.
        
        {descriptions_text}
        
        Return a JSON array with the indices of the images to KEEP (not the ones to remove).
        Select up to 13 diverse images with the highest scores.
        
        Example response format:
        [1, 2, 5, 7, 9, 10, 13, 15, 17, 20]
        
        IMPORTANT: Respond ONLY with the JSON array and nothing else.
        """
        
        # Call Gemini API
        response = call_gemini_api(prompt)
        
        if not response:
            logger.warning("No response from Gemini for redundancy check, falling back to top 13")
            return validated_images[:13]
            
        # Clean up response - remove markdown code blocks if present
        if "```" in response:
            response = re.sub(r'```(?:json)?\s*([\s\S]*?)```', r'\1', response).strip()
        
        # Try to parse JSON
        try:
            indices = json.loads(response)
            
            # Validate that we got a list of indices
            if not isinstance(indices, list):
                logger.warning("Invalid response format for redundancy check, falling back to top 13")
                return validated_images[:13]
                
            # Convert to 0-based indexing if necessary
            if indices and min(indices) > 0:
                indices = [i-1 for i in indices]
                
            # Filter out invalid indices and sort by original score
            valid_indices = [i for i in indices if 0 <= i < len(validated_images)]
            selected_images = [validated_images[i] for i in valid_indices]
            
            # Sort by score
            selected_images.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            # Limit to 13 images
            selected_images = selected_images[:13]
            
            if not selected_images:
                logger.warning("No valid images after redundancy check, falling back to top 13")
                return validated_images[:13]
                
            logger.info(f"Successfully applied redundancy check, selected {len(selected_images)} images")
            return selected_images
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing redundancy check response: {e}")
            # Fall back to top 13 by score
            return validated_images[:13]
            
    except Exception as e:
        logger.error(f"Exception during redundancy check: {e}")
        # Fall back to top 13 by score
        return validated_images[:13]

def process_tour(tour, override=False):
    """
    Process a tour to generate and upload images
    
    Args:
        tour: Tour object with id, name, description
        override: Whether to override existing entries
    
    Returns:
        Number of successfully uploaded images
    """
    tour_id = tour['id']
    tour_name = tour['name']
    description = tour.get('description', '')
    
    logger.info(f"Processing tour: {tour_name} (ID: {tour_id})")
    
    # Check if entries already exist for this tour
    response = supabase.table(DB_TABLE_NAME).select('id').eq('tour_id', tour_id).execute()
    existing_entries = response.data
    
    if existing_entries and not override:
        logger.info(f"Entries already exist for tour {tour_id}. Skipping processing. Use --override to replace them.")
        return 0
    
    if existing_entries and override:
        # Delete existing entries
        logger.info(f"Existing entries found for tour {tour_id}. Override flag is set, deleting existing entries.")
        supabase.table(DB_TABLE_NAME).delete().eq('tour_id', tour_id).execute()
        
        # Try to delete existing images from storage if they exist
        try:
            # List files in the tour_id folder
            files_response = supabase.storage.from_(STORAGE_BUCKET).list(tour_id)
            if files_response:
                logger.info(f"Deleting {len(files_response)} existing images from storage for tour {tour_id}")
                # Delete each file
                for file in files_response:
                    supabase.storage.from_(STORAGE_BUCKET).remove([f"{tour_id}/{file['name']}"])
                logger.info(f"Successfully deleted existing images from storage for tour {tour_id}")
        except Exception as e:
            logger.warning(f"Error while trying to delete existing images from storage: {e}")
    
    # Keep track of rejected search terms
    rejected_terms = []
    
    # Keep track of validated images
    validated_images = []
    
    # Get search terms for the tour, including description context
    search_terms_with_countries = generate_search_terms_for_tour(tour_name, description, rejected_terms)
    
    if not search_terms_with_countries:
        logger.error(f"Failed to generate search terms for tour: {tour_name}")
        return 0
    
    # Number of search terms to try before getting new ones
    max_search_attempts = 2
    
    for attempt in range(max_search_attempts):
        # Check if we already have enough images
        if len(validated_images) >= 15:  # Get more than needed for redundancy check
            logger.info(f"Already have {len(validated_images)} validated images, proceeding to redundancy check.")
            break
            
        logger.info(f"Attempt {attempt+1}: Processing search terms")
        
        # Process search terms
        for term, country_name in search_terms_with_countries:
            if len(validated_images) >= 20:  # Cap at 20 validated images before redundancy check
                break
                
            logger.info(f"Searching Pexels for term: {term} (Country: {country_name})")
            photos = search_pexels(term, per_page=4)
            
            if not photos:
                logger.warning(f"No images found for term: {term}")
                rejected_terms.append(term)
                continue
            
            # Process individual images
            valid_count = 0
            for photo in photos:
                image_url = photo['src']['original']
                # Get the alt text/description from Pexels
                image_description = photo.get('alt', '')
                
                logger.info(f"Validating image: {image_url}")
                logger.debug(f"Image description: {image_description}")
                
                # Simple validation - now includes the Pexels description
                is_valid, score = simple_image_validation(image_url, tour_name, term, description, image_description)
                
                if is_valid:
                    # Download and process the image
                    image_data = download_image(image_url)
                    
                    if not image_data:
                        logger.warning(f"Failed to download image: {image_url}")
                        continue
                    
                    # Optimize and post-process the image
                    processed_image, optimized_data = optimize_image(image_data)
                    
                    if not processed_image or not optimized_data:
                        logger.warning(f"Failed to process image: {image_url}")
                        continue
                    
                    # Add to validated images - now including the description
                    validated_images.append({
                        'image_data': optimized_data,
                        'url': image_url,
                        'search_term': term,
                        'country_name': country_name,
                        'score': score,
                        'description': image_description
                    })
                    
                    valid_count += 1
                    logger.info(f"Image validated successfully: {image_url} (Score: {score})")
                    
                    if valid_count >= 3:  # Limit to top 3 images per search term
                        break
        
        # If we don't have enough images, get more search terms
        if len(validated_images) < 8 and attempt < max_search_attempts - 1:
            logger.warning(f"Only found {len(validated_images)} valid images, getting more search terms.")
            new_terms = generate_search_terms_for_tour(tour_name, description, rejected_terms)
            
            if new_terms:
                search_terms_with_countries = new_terms
            else:
                logger.error(f"Failed to generate more search terms.")
                break
    
    # Check for redundancy
    final_images = check_redundancy(validated_images)
    
    # Limit to 13 highest-rated images
    if len(final_images) > 13:
        logger.info(f"More than 13 images after redundancy check. Limiting to 13 highest-rated images.")
        final_images = final_images[:13]  # Already sorted by score
    
    # Check if we have enough valid images (minimum 6)
    if len(final_images) < 6:
        logger.error(f"Not enough valid images found ({len(final_images)}/6). Aborting.")
        return 0
    
    # Upload images to Supabase Storage and insert metadata
    successful_uploads = 0
    
    for i, img_data in enumerate(final_images):
        # Generate unique filename
        filename = f"{tour_id}/{str(uuid.uuid4())}.jpg"
        
        # Upload to Supabase Storage
        image_url = upload_to_supabase_storage(img_data['image_data'], filename)
        
        if not image_url:
            logger.error(f"Failed to upload image {i+1} for tour: {tour_name}")
            continue
        
        # Get the original Pexels description
        original_alt = img_data.get('description', '')
        
        # Create alt text using the Pexels description if available
        alt_text = original_alt if original_alt else f"{tour_name} - {img_data['search_term']}"
        
        # Determine if this is the primary or featured image
        is_primary = (i == 0)
        is_featured = (i <= 1)  # First two images are featured
        
        # Create simple validation result
        validation_result = {
            'score': img_data.get('score', 0)
        }
        
        # Insert metadata to tour_images table - now passing the original alt description
        image_id = insert_to_tour_images(
            tour_id=tour_id,
            image_url=image_url,
            alt_text=alt_text,
            search_term=img_data['search_term'],
            validation_result=validation_result,
            is_primary=is_primary,
            is_featured=is_featured,
            display_order=i,
            country_name=img_data['country_name'],
            alt=original_alt  # Pass the original alt description
        )
        
        if image_id:
            successful_uploads += 1
            logger.info(f"Successfully processed image {i+1} for tour: {tour_name}")
        else:
            logger.error(f"Failed to insert metadata for image {i+1} for tour: {tour_name}")
    
    logger.info(f"Completed processing tour: {tour_name}. Uploaded {successful_uploads}/{len(final_images)} images.")
    
    return successful_uploads

# Test Supabase connection
def test_supabase_connection():
    try:
        response = supabase.table('tours').select('id').limit(1).execute()
        if response.data:
            logger.info("Supabase connection successful.")
        else:
            logger.error("Supabase connection failed or no data found.")
    except Exception as e:
        logger.error(f"Supabase connection error: {e}")

def main():
    parser = argparse.ArgumentParser(description="Generate images for tours")
    parser.add_argument('--tour_id', help='Process a specific tour by ID')
    parser.add_argument('--all', action='store_true', help='Process all tours')
    parser.add_argument('--override', action='store_true', help='Override existing entries in the table')
    args = parser.parse_args()
    
    logger.info("Starting the image generation process...")
    
    if args.tour_id:
        logger.info(f"Processing tour with ID: {args.tour_id}")
        try:
            response = supabase.table('tours').select('id, name, description').eq('id', args.tour_id).execute()
            tours = response.data
            
            if not tours:
                logger.error(f"Tour with ID {args.tour_id} not found")
                return
                
            tour = tours[0]
            process_tour(tour, args.override)
            
        except Exception as e:
            logger.error(f"Error processing specific tour: {e}")
            
    elif args.all:
        logger.info("Processing all tours")
        tours = get_tours_from_supabase()
        
        if not tours:
            logger.error("No tours found to process")
            return
            
        for tour in tours:
            try:
                process_tour(tour, args.override)
            except Exception as e:
                logger.error(f"Error processing tour {tour['name']}: {e}")
                continue
    else:
        logger.error("Please specify either --tour_id or --all")

if __name__ == "__main__":
    test_supabase_connection()
    main()
