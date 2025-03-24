import os
import requests
import time
import pandas as pd
import random
import json
import base64
from io import BytesIO
from PIL import Image
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

# Unsplash API credentials
UNSPLASH_ACCESS_KEY = "x49l7PRQ_Du5MyKVvAK_Y4FTjcWXEzUgMtnp4SQeG8s"
UNSPLASH_SECRET_KEY = "ERPUpyD7d2CB3iDoN3mpX0v4YuNi3WfeYOoVanht11Y"

# Supabase credentials
SUPABASE_URL = "https://jeiuruhneitvfyjkmbvj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaXVydWhuZWl0dmZ5amttYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjU5NzQsImV4cCI6MjA1ODI0MTk3NH0.iYBsdI4p7o7rKbrMHstzis4KZYV_ks2p09pmtj5-bTo"

# Initialize Gemini API config
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

# Add Perplexity API configuration
PERPLEXITY_API_KEY = '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'
PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

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
# 7.5 is a good balance - it ensures high quality while not being too restrictive
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

def call_perplexity_api(prompt):
    """
    Call the Perplexity API with a prompt
    
    Args:
        prompt: The prompt to send to Perplexity
    
    Returns:
        The response content from Perplexity
    """
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "sonar-pro",  # Changed from "sonar-medium-online" to "sonar-pro"
        "messages": [
            {"role": "system", "content": "You are a helpful travel photography expert."},
            {"role": "user", "content": prompt}
        ]
    }
    
    try:
        # Add a delay to avoid rate limiting
        time.sleep(1)
        
        logger.info(f"Sending prompt to Perplexity API: {prompt[:100]}...")
        response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload, timeout=30)
        
        if not response.ok:
            logger.error(f"Perplexity API error: {response.status_code} - {response.text[:200]}...")
            return None
            
        result = response.json()
        
        # Extract the content from Perplexity's response format
        if 'choices' in result and result['choices'] and 'message' in result['choices'][0]:
            content = result['choices'][0]['message']['content']
            logger.info(f"Received response from Perplexity API: {content[:100]}...")
            return content
        else:
            logger.error("Unexpected response format from Perplexity API")
            return None
        
    except Exception as e:
        logger.error(f"Perplexity API Request Error: {str(e)}")
        return None

def generate_search_terms_for_tour(tour_name, rejected_terms=None, model="gemini"):
    """
    Generate search terms for a tour using the specified AI model
    
    Args:
        tour_name: Name of the tour
        rejected_terms: List of previously rejected search terms to avoid
        model: AI model to use ("gemini" or "perplexity")
    
    Returns:
        List of search terms
    """
    if rejected_terms is None:
        rejected_terms = []
        
    logger.info(f"Generating search terms for: '{tour_name}' using {model}")
    
    # Construct the prompt
    prompt = f"""
    I need 5 specific Unsplash search terms for beautiful and stunning places that would make excellent images for a luxury honeymoon tour titled "{tour_name}".
    
    Please provide search terms that:
    1. Are specific enough to return high-quality, relevant images
    2. Showcase the most beautiful and iconic aspects of the destinations
    3. Would appeal to luxury travelers and honeymooners
    4. Highlight natural beauty, luxury accommodations, or romantic settings
    5. Are diverse and represent different aspects of the tour
    
    Please avoid these previously rejected terms: {', '.join(rejected_terms) if rejected_terms else 'None'}
    
    Format your response as a JSON array of strings, with each string being a search term.
    Example: ["Santorini sunset view", "Maldives overwater bungalow", "Venice gondola canal", "Kyoto cherry blossoms", "Amalfi Coast cliffside"]
    """
    
    # Call the appropriate API based on the model parameter
    if model.lower() == "perplexity":
        response = call_perplexity_api(prompt)
    else:  # Default to Gemini
        response = call_gemini_api(prompt)
    
    if not response:
        logger.error(f"Failed to generate search terms")
        return []
    
    # Extract search terms from response
    try:
        # Try to parse as JSON
        search_terms = json.loads(response)
        
        # Validate that we got a list of strings
        if not isinstance(search_terms, list):
            logger.error(f"Invalid response format: not a list")
            return []
            
        # Filter out any previously rejected terms
        search_terms = [term for term in search_terms if term not in rejected_terms]
        
        return search_terms
        
    except json.JSONDecodeError:
        # If not valid JSON, try to extract terms using regex
        logger.warning(f"Failed to parse JSON, trying regex extraction")
        
        # Look for anything that might be a list of terms
        match = re.search(r'\[(.*?)\]', response, re.DOTALL)
        if match:
            terms_str = match.group(1)
            # Split by commas and clean up
            terms = [term.strip().strip('"\'') for term in terms_str.split(',')]
            # Filter out empty strings and previously rejected terms
            terms = [term for term in terms if term and term not in rejected_terms]
            return terms
            
        logger.error(f"Failed to extract search terms from response")
        return []

def call_gemini_api_for_image_validation(image_url, tour_name, search_term):
    """
    Call Gemini API to validate if an image is suitable for the tour
    
    Args:
        image_url: URL of the image to validate
        tour_name: Name of the tour
        search_term: Search term used to find the image
    
    Returns:
        Dictionary with validation results including score and feedback
    """
    # Construct the prompt for Gemini
    prompt = f"""
    Please evaluate this image for a luxury honeymoon website featuring a tour titled "{tour_name}".
    
    Image URL: {image_url}
    Search term used: "{search_term}"
    
    Evaluate on a scale of 1-10 for each criterion:
    1. Relevance: Does this image clearly relate to the search term "{search_term}"?
    2. Quality: Is this a high-quality, professional-looking image?
    3. Luxury Appeal: Does this image convey luxury and exclusivity?
    4. Romantic Atmosphere: Is this image suitable for a honeymoon website?
    5. Uniqueness: Does this image showcase something distinctive about the destination?
    
    For each criterion, provide a score (1-10) and brief explanation.
    Then provide an overall score (1-10) and final recommendation (Accept/Reject).
    
    Format your response as JSON with the following structure:
    {{
        "relevance": {{ "score": X, "feedback": "..." }},
        "quality": {{ "score": X, "feedback": "..." }},
        "luxury_appeal": {{ "score": X, "feedback": "..." }},
        "romantic_atmosphere": {{ "score": X, "feedback": "..." }},
        "uniqueness": {{ "score": X, "feedback": "..." }},
        "overall_score": X,
        "recommendation": "Accept" or "Reject",
        "summary": "Brief overall assessment"
    }}
    """
    
    # Call Gemini API
    response = call_gemini_api(prompt)
    
    if not response:
        logger.error(f"Failed to get validation from Gemini API for image: {image_url}")
        return None
    
    # Parse JSON response
    try:
        # Extract JSON from response (in case there's additional text)
        json_match = re.search(r'({.*})', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
            validation_result = json.loads(json_str)
        else:
            validation_result = json.loads(response)
        
        return validation_result
    except Exception as e:
        logger.error(f"Error parsing Gemini validation response: {e}")
        logger.error(f"Raw response: {response}")
        return None

def get_tours_from_supabase():
    """
    Get all tours from Supabase
    
    Returns:
        List of tour objects
    """
    try:
        response = supabase.table('tours').select('id, name').execute()
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

def insert_to_tour_images(tour_id, image_url, alt_text, search_term, validation_result, is_primary=False, display_order=0):
    """
    Insert image metadata into tour_images table
    
    Args:
        tour_id: ID of the tour
        image_url: URL of the image in storage
        alt_text: Alt text for the image
        search_term: Search term used to find the image
        validation_result: Validation result from Gemini
        is_primary: Whether this is the primary image
        display_order: Order to display the image (0 = first)
    
    Returns:
        ID of the inserted record or None if failed
    """
    try:
        now = datetime.now().isoformat()
        
        # Extract scores from validation result
        overall_score = validation_result.get('overall_score', 0)
        relevance_score = validation_result.get('relevance', {}).get('score', 0)
        quality_score = validation_result.get('quality', {}).get('score', 0)
        luxury_score = validation_result.get('luxury_appeal', {}).get('score', 0)
        romantic_score = validation_result.get('romantic_atmosphere', {}).get('score', 0)
        uniqueness_score = validation_result.get('uniqueness', {}).get('score', 0)
        
        # Create record
        record = {
            "tour_id": tour_id,
            "image_url": image_url,
            "alt_text": alt_text,
            "search_term": search_term,
            "is_primary": is_primary,
            "overall_score": overall_score,
            "relevance_score": relevance_score,
            "quality_score": quality_score,
            "luxury_score": luxury_score,
            "romantic_score": romantic_score,
            "uniqueness_score": uniqueness_score,
            "created_at": now,
            "updated_at": now,
            "display_order": display_order
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

def optimize_image(image_data):
    """
    Optimize an image for web use
    
    Args:
        image_data: Image data as bytes
    
    Returns:
        Optimized PIL Image object or None if failed
    """
    try:
        # Open the image with PIL
        image = Image.open(BytesIO(image_data))
        
        # Resize if too large (max dimension 1920px)
        max_size = 1920
        if image.width > max_size or image.height > max_size:
            # Calculate new dimensions while maintaining aspect ratio
            if image.width > image.height:
                new_width = max_size
                new_height = int(image.height * (max_size / image.width))
            else:
                new_height = max_size
                new_width = int(image.width * (max_size / image.height))
                
            # Resize the image
            image = image.resize((new_width, new_height), Image.LANCZOS)
            logger.info(f"Resized image to {new_width}x{new_height}")
        
        # Convert to RGB if needed (in case of RGBA)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return image
        
    except Exception as e:
        logger.error(f"Error optimizing image: {e}")
        return None

def search_unsplash(query, per_page=10):
    """
    Search Unsplash for images
    
    Args:
        query: Search query
        per_page: Number of images to return per page
    
    Returns:
        List of image objects
    """
    try:
        # Construct the URL
        url = "https://api.unsplash.com/search/photos"
        
        # Set up parameters
        params = {
            "query": query,
            "per_page": per_page,
            "orientation": "landscape",  # Prefer landscape images for tours
            "content_filter": "high"     # High quality content only
        }
        
        # Set up headers
        headers = {
            "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"
        }
        
        # Make the request
        logger.info(f"Searching Unsplash for: {query}")
        response = requests.get(url, params=params, headers=headers)
        
        if not response.ok:
            logger.error(f"Unsplash API error: {response.status_code} - {response.text[:200]}...")
            return []
            
        result = response.json()
        
        if 'results' not in result:
            logger.error(f"Unexpected response format from Unsplash API")
            return []
            
        images = result['results']
        logger.info(f"Found {len(images)} images on Unsplash for query: {query}")
        
        return images
        
    except Exception as e:
        logger.error(f"Error searching Unsplash: {e}")
        return []

def download_and_upload_images_for_tour(tour_id, tour_name, min_score=IMAGE_QUALITY_THRESHOLD, min_images=5, model="gemini"):
    """
    Download images from Unsplash and upload to Supabase for a tour
    
    Args:
        tour_id: ID of the tour
        tour_name: Name of the tour
        min_score: Minimum validation score (1-10) required to accept an image
        min_images: Minimum number of images to collect
        model: AI model to use for generating search terms ("gemini" or "perplexity")
    
    Returns:
        List of uploaded image metadata
    """
    # Check if tour already has images
    existing_images = []
    try:
        response = supabase.table(DB_TABLE_NAME).select('id, image_url, display_order').eq('tour_id', tour_id).execute()
        existing_images = response.data
        
        if existing_images:
            logger.info(f"Tour '{tour_name}' already has {len(existing_images)} images")
            
            # Ask if we should continue
            continue_input = input(f"Tour already has {len(existing_images)} images. Continue? (y/n): ")
            if continue_input.lower() != 'y':
                logger.info(f"Skipping tour as requested")
                return []
    except Exception as e:
        logger.error(f"Error checking existing images: {e}")
    
    # Find the highest existing display_order
    max_display_order = 0
    if existing_images:
        try:
            max_display_order = max([img.get('display_order', 0) for img in existing_images])
        except Exception as e:
            logger.error(f"Error finding max display_order: {e}")
    
    # Temporary list to store validated images before uploading
    validated_images = []
    rejected_search_terms = []
    
    # Keep generating and validating images until we have enough high-quality ones
    while len(validated_images) < min_images:
        # Generate search terms, excluding previously rejected ones
        search_terms = generate_search_terms_for_tour(tour_name, rejected_terms=rejected_search_terms, model=model)
        
        if not search_terms:
            logger.error(f"Failed to generate search terms for tour: {tour_name}")
            break
            
        logger.info(f"Generated search terms: {', '.join(search_terms)}")
        
        # Process each search term
        for search_term in search_terms:
            # Skip if we already have enough images
            if len(validated_images) >= min_images:
                break
                
            # Skip if this term was previously rejected
            if search_term in rejected_search_terms:
                continue
                
            logger.info(f"Searching for: '{search_term}'")
            
            # Search Unsplash for images
            unsplash_images = search_unsplash(search_term, 1)
            
            if not unsplash_images:
                logger.warning(f"No images found for: {search_term}")
                rejected_search_terms.append(search_term)
                continue
            
            # Process the image from Unsplash (just 1 per search term)
            unsplash_image = unsplash_images[0]
            image_url = unsplash_image['urls']['regular']
            
            # Validate image with Gemini
            validation_result = call_gemini_api_for_image_validation(image_url, tour_name, search_term)
            
            if not validation_result:
                logger.warning(f"Failed to validate: {search_term}")
                rejected_search_terms.append(search_term)
                continue
            
            # Check if image meets quality threshold
            overall_score = validation_result.get('overall_score', 0)
            recommendation = validation_result.get('recommendation', 'Reject')
            
            if overall_score < min_score or recommendation == 'Reject':
                logger.warning(f"Rejected: '{search_term}' - Score: {overall_score}")
                rejected_search_terms.append(search_term)
                continue
            
            logger.info(f"Accepted: '{search_term}' - Score: {overall_score}")
            
            # Download image
            image_data = download_image(image_url)
            if not image_data:
                logger.warning(f"Failed to download: {search_term}")
                rejected_search_terms.append(search_term)
                continue
            
            # Optimize image
            optimized_image = optimize_image(image_data)
            if not optimized_image:
                logger.warning(f"Failed to optimize: {search_term}")
                rejected_search_terms.append(search_term)
                continue
            
            # Add to validated images list
            validated_images.append({
                'image_url': image_url,
                'search_term': search_term,
                'validation_result': validation_result,
                'overall_score': overall_score,
                'optimized_image': optimized_image
            })
            
            logger.info(f"Progress: {len(validated_images)}/{min_images} images validated")
    
    # Sort validated images by overall score (highest first)
    validated_images.sort(key=lambda x: x['overall_score'], reverse=True)
    logger.info(f"Collected {len(validated_images)} validated images")
    
    # Upload images in order of score
    uploaded_images = []
    
    for i, validated_image in enumerate(validated_images):
        try:
            search_term = validated_image['search_term']
            
            # Generate a unique filename
            file_extension = 'jpg'
            filename = f"{tour_id}_{search_term.replace(' ', '_')}_{uuid.uuid4()}.{file_extension}"
            
            # Calculate display_order - higher scores get lower numbers (1 is first)
            display_order = max_display_order + i + 1
            
            # Upload to Supabase storage
            storage_path = f"{tour_id}/{filename}"
            
            # Convert PIL Image to bytes
            optimized_image = validated_image['optimized_image']
            img_byte_arr = BytesIO()
            optimized_image.save(img_byte_arr, format='JPEG')
            img_byte_arr.seek(0)
            
            # Upload to storage
            logger.info(f"Uploading: '{search_term}'")
            storage_response = supabase.storage.from_(STORAGE_BUCKET).upload(
                storage_path,
                img_byte_arr.getvalue(),
                file_options={"content-type": "image/jpeg"}
            )
            
            if not storage_response:
                logger.error(f"Failed to upload to storage: {search_term}")
                continue
            
            # Get public URL
            storage_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
            
            # Create alt text
            alt_text = f"Beautiful view of {tour_name} - {search_term}"
            
            # Set the first image (highest score) as primary if no existing images
            is_primary = (i == 0 and len(existing_images) == 0)
            
            # Insert into tour_images table
            image_id = insert_to_tour_images(
                tour_id=tour_id,
                image_url=storage_url,
                alt_text=alt_text,
                search_term=search_term,
                validation_result=validated_image['validation_result'],
                is_primary=is_primary,
                display_order=display_order
            )
            
            if not image_id:
                logger.error(f"Failed to insert into database: {search_term}")
                # Delete the uploaded file
                try:
                    supabase.storage.from_(STORAGE_BUCKET).remove([storage_path])
                    logger.warning(f"Deleted orphaned storage file: {storage_path}")
                except Exception as e:
                    logger.error(f"Failed to delete orphaned file: {e}")
                
                # Critical database error - stop processing
                raise Exception("Database insert failed - stopping process")
            
            uploaded_images.append({
                "id": image_id,
                "image_url": storage_url,
                "alt_text": alt_text,
                "is_primary": is_primary,
                "score": validated_image['overall_score'],
                "search_term": search_term,
                "display_order": display_order
            })
            logger.info(f"Uploaded: '{search_term}' (#{display_order}, Score: {validated_image['overall_score']})")
        
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            if "Database insert failed" in str(e):
                # Re-raise to stop processing
                raise
    
    # If we have uploaded images, set the highest scoring one as primary
    if uploaded_images:
        try:
            # Find the highest scoring image
            highest_score_image = max(uploaded_images, key=lambda x: x['score'])
            
            # Update all images to not be primary
            supabase.table(DB_TABLE_NAME).update({"is_primary": False}).eq('tour_id', tour_id).execute()
            
            # Set the highest scoring image as primary
            supabase.table(DB_TABLE_NAME).update({"is_primary": True}).eq('id', highest_score_image['id']).execute()
            
            logger.info(f"Set primary image: '{highest_score_image['search_term']}' (Score: {highest_score_image['score']})")
            
            # Update our local record
            for img in uploaded_images:
                if img["id"] == highest_score_image["id"]:
                    img["is_primary"] = True
                else:
                    img["is_primary"] = False
        except Exception as e:
            logger.error(f"Error setting primary image: {e}")
    
    # Clean up any orphaned records
    try:
        response = supabase.table(DB_TABLE_NAME).delete().eq('tour_id', tour_id).is_('image_url', 'null').execute()
        if response.data and len(response.data) > 0:
            logger.info(f"Cleaned up {len(response.data)} orphaned records")
    except Exception as e:
        logger.error(f"Error cleaning up orphaned records: {e}")
    
    logger.info(f"Completed: {len(uploaded_images)} images for '{tour_name}'")
    return uploaded_images

def process_all_tours(min_score=IMAGE_QUALITY_THRESHOLD):
    """
    Process all tours from Supabase
    
    Args:
        min_score: Minimum validation score (1-10) required to accept an image
    """
    # Get all tours
    tours = get_tours_from_supabase()
    
    if not tours:
        logger.error("No tours found in database")
        return
    
    # Create a DataFrame to store search terms
    search_terms_df = pd.DataFrame(columns=['tour_id', 'tour_name', 'search_terms'])
    
    # Process each tour
    for i, tour in enumerate(tours):
        tour_id = tour['id']
        tour_name = tour['name']
        
        logger.info(f"\nProcessing tour {i+1}/{len(tours)}: {tour_name}")
        
        # Generate search terms for the tour
        search_terms = generate_search_terms_for_tour(tour_name)
        
        if not search_terms:
            logger.error(f"Could not generate search terms for tour: {tour_name}")
            continue
        
        # Add to DataFrame
        search_terms_df = pd.concat([
            search_terms_df, 
            pd.DataFrame([{
                'tour_id': tour_id,
                'tour_name': tour_name,
                'search_terms': search_terms
            }])
        ], ignore_index=True)
        
        # Download and upload images
        download_and_upload_images_for_tour(tour_id, tour_name, min_score)
        
        # Sleep to avoid rate limiting
        time.sleep(2)
    
    # Save search terms to CSV
    search_terms_df.to_csv('tour_search_terms.csv', index=False)
    
    # Also save as JSON for easier parsing
    search_terms_dict = {
        row['tour_id']: {
            'tour_name': row['tour_name'],
            'search_terms': row['search_terms']
        }
        for _, row in search_terms_df.iterrows()
    }
    
    with open('tour_search_terms.json', 'w') as f:
        json.dump(search_terms_dict, f, indent=2)
    
    logger.info(f"Completed processing {len(tours)} tours")
    logger.info(f"Search terms saved to tour_search_terms.csv and tour_search_terms.json")

def process_single_tour(tour_id=None, tour_code=None, min_score=IMAGE_QUALITY_THRESHOLD):
    """
    Process a single tour by ID or code
    
    Args:
        tour_id: ID of the tour (optional)
        tour_code: Code of the tour (optional) - Note: This won't work if there's no code column
        min_score: Minimum validation score (1-10) required to accept an image
    """
    # Get all tours
    tours = get_tours_from_supabase()
    
    if not tours:
        logger.error("No tours found in database")
        return
    
    # Find the specific tour
    tour = None
    if tour_id:
        tour = next((t for t in tours if t['id'] == tour_id), None)
    elif tour_code:
        # Since there's no code column, we can try to match against the name instead
        logger.warning("Note: 'code' column doesn't exist in tours table. Trying to match against name instead.")
        tour = next((t for t in tours if tour_code.lower() in t['name'].lower()), None)
    
    if not tour:
        error_msg = f"No tour found with ID: {tour_id}"
        if tour_code:
            error_msg += f" or name containing: {tour_code}"
        logger.error(error_msg)
        return
    
    tour_id = tour['id']
    tour_name = tour['name']
    
    logger.info(f"Processing tour: {tour_name}")
    
    # Generate search terms for the tour
    search_terms = generate_search_terms_for_tour(tour_name)
    
    if not search_terms:
        logger.error(f"Could not generate search terms for tour: {tour_name}")
        return
    
    # Save search terms to JSON
    search_terms_dict = {
        tour_id: {
            'tour_name': tour_name,
            'search_terms': search_terms
        }
    }
    
    with open(f'tour_{tour_id}_search_terms.json', 'w') as f:
        json.dump(search_terms_dict, f, indent=2)
    
    # Download and upload images
    download_and_upload_images_for_tour(tour_id, tour_name, min_score)
    
    logger.info(f"Completed processing tour: {tour_name}")
    logger.info(f"Search terms saved to tour_{tour_id}_search_terms.json")

def main():
    """
    Main function
    """
    parser = argparse.ArgumentParser(description='Generate tour images')
    parser.add_argument('--tour-id', help='ID of a specific tour to process')
    parser.add_argument('--min-score', type=float, default=IMAGE_QUALITY_THRESHOLD, help='Minimum quality score (1-10)')
    parser.add_argument('--min-images', type=int, default=5, help='Minimum number of images to collect')
    parser.add_argument('--model', type=str, choices=['gemini', 'perplexity'], default='gemini', 
                        help='AI model to use for generating search terms')
    args = parser.parse_args()
    
    logger.info("=" * 80)
    logger.info("Starting image generation script")
    logger.info(f"Minimum quality score: {args.min_score}")
    logger.info(f"Minimum images per tour: {args.min_images}")
    logger.info(f"Using AI model: {args.model}")
    
    # Process a single tour if specified
    if args.tour_id:
        logger.info(f"Processing single tour by ID: {args.tour_id}")
        
        # Get tour details
        try:
            response = supabase.table('tours').select('id, name').execute()
            tours = response.data
            
            # Find the tour with the specified ID
            tour = next((t for t in tours if t['id'] == args.tour_id), None)
            
            if not tour:
                logger.error(f"Tour not found with ID: {args.tour_id}")
                return
                
            logger.info(f"Processing tour: {tour['name']}")
            
            # Process the tour
            images = download_and_upload_images_for_tour(
                tour_id=tour['id'], 
                tour_name=tour['name'],
                min_score=args.min_score,
                min_images=args.min_images,
                model=args.model
            )
            
            logger.info(f"Completed processing tour: {tour['name']}")
            
            # Save search terms to file for reference
            with open(f"tour_{tour['id']}_search_terms.json", 'w') as f:
                json.dump([img['search_term'] for img in images], f, indent=2)
                
            logger.info(f"Search terms saved to tour_{tour['id']}_search_terms.json")
            
        except Exception as e:
            logger.error(f"Error processing tour: {e}")
    
    # Process all tours if no specific tour is specified
    else:
        logger.info("Processing all tours")
        
        # Get all tours
        try:
            response = supabase.table('tours').select('id, name').execute()
            tours = response.data
            
            logger.info(f"Retrieved {len(tours)} tours from Supabase")
            
            # Process each tour
            for tour in tours:
                logger.info(f"Processing tour: {tour['name']}")
                
                try:
                    images = download_and_upload_images_for_tour(
                        tour_id=tour['id'], 
                        tour_name=tour['name'],
                        min_score=args.min_score,
                        min_images=args.min_images,
                        model=args.model
                    )
                    
                    logger.info(f"Completed processing tour: {tour['name']}")
                    
                    # Save search terms to file for reference
                    with open(f"tour_{tour['id']}_search_terms.json", 'w') as f:
                        json.dump([img['search_term'] for img in images], f, indent=2)
                        
                    logger.info(f"Search terms saved to tour_{tour['id']}_search_terms.json")
                    
                except Exception as e:
                    logger.error(f"Error processing tour {tour['name']}: {e}")
                    continue
                
        except Exception as e:
            logger.error(f"Error retrieving tours: {e}")
    
    logger.info("Image generation script completed")
    logger.info("=" * 80)

if __name__ == "__main__":
    main()