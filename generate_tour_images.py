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

# Unsplash API credentials
UNSPLASH_ACCESS_KEY = "x49l7PRQ_Du5MyKVvAK_Y4FTjcWXEzUgMtnp4SQeG8s"
UNSPLASH_SECRET_KEY = "ERPUpyD7d2CB3iDoN3mpX0v4YuNi3WfeYOoVanht11Y"

# Pexels API Key (Add this)
PEXELS_API_KEY = "2nTDyWqcjwBRUWzyi2mpWlbqKHAy4xxAHuRbSHtA38kCOfoNQbDeOoye"

# Supabase credentials
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

# Initialize Gemini API config
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent'

# Pexels Headers (Add this)
PEXELS_HEADERS = {"Authorization": PEXELS_API_KEY}

# Unsplash Headers
UNSPLASH_HEADERS = {
    "Accept-Version": "v1",
    "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"
}

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
IMAGE_QUALITY_THRESHOLD = 8

def call_gemini_api(prompt, max_retries=3, initial_timeout=60, image_data=None):
    """
    Call the Gemini API with a prompt and retry logic
    
    Args:
        prompt: The prompt to send to Gemini
        max_retries: Maximum number of retry attempts
        initial_timeout: Initial timeout in seconds (doubles with each retry)
        image_data: The image data to send to Gemini for image validation
    
    Returns:
        The response content from Gemini
    """
    # Construct the API URL with the API key
    url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    # Dynamically construct the parts list
    parts = [{"text": prompt}]
    if image_data:
        parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": base64.b64encode(image_data).decode('utf-8')
            }
        })
    
    payload = {
        "contents": [{"parts": parts}] # Use the constructed parts list
    }
    
    for attempt in range(max_retries):
        try:
            # Calculate timeout with exponential backoff
            timeout = initial_timeout * (2 ** attempt)
            
            # Add a delay between retries
            if attempt > 0:
                delay = 2 ** attempt  # Exponential backoff delay
                # logger.info(f"Retry attempt {attempt + 1}/{max_retries} after {delay} seconds...") # Commented out
                time.sleep(delay)
            
            # logger.info(f"Sending prompt to Gemini API - Attempt {attempt + 1}/{max_retries}") # Commented out
            # logger.info(f"Timeout set to {timeout} seconds") # Commented out
            
            response = requests.post(url, headers=headers, json=payload, timeout=timeout)
            
            if response.status_code == 429:  # Rate limit
                logger.warning("Rate limit hit, waiting longer before retry...")
                time.sleep(5 * (2 ** attempt))  # Longer delay for rate limits
                continue
                
            if not response.ok:
                logger.error(f"Gemini API error: {response.status_code} - {response.text[:200]}...")
                if attempt < max_retries - 1:
                    continue
                return None
                
            result = response.json()
            
            # Extract the content from Gemini's response format
            if 'candidates' in result and result['candidates'] and 'content' in result['candidates'][0]:
                content_parts = result['candidates'][0]['content']['parts']
                content = ''.join([part.get('text', '') for part in content_parts if 'text' in part])
                logger.info(f"Successfully received response from Gemini API")
                return content
            else:
                logger.error("Unexpected response format from Gemini API")
                if attempt < max_retries - 1:
                    continue
                return None
            
        except requests.Timeout:
            logger.error(f"Request timed out after {timeout} seconds") # Keep error log
            if attempt < max_retries - 1:
                continue
            return None
        except requests.ConnectionError as e:
            logger.error(f"Connection error: {str(e)}")
            if attempt < max_retries - 1:
                continue
            return None
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            if attempt < max_retries - 1:
                continue
            return None
    
    logger.error(f"All {max_retries} attempts failed")
    return None

def generate_search_terms_for_tour(tour_name, tour_summary):
    """
    Generate diverse Pexels search terms for a tour using Gemini API
    
    Args:
        tour_name: The name of the tour
        tour_summary: The summary description of the tour
    
    Returns:
        List of search terms organized by category
    """
    logger.info(f"Generating diverse Pexels search terms for tour: {tour_name}")
    
    prompt = f"""
    I need 8 specific Pexels search terms for beautiful and stunning images to convey the tour for a luxury honeymoon titled:
    
    Tour Title: "{tour_name}"
    Tour Summary: "{tour_summary}"
    
    Please provide search terms in these categories:
    1. Landmarks & Natural Features (5 terms): Specific locations, landmarks, or natural wonders one can expect from the tour
    2. Cultural Elements (2 terms): Local food, traditions, festivals, or cultural experiences
    3. Activities & Experiences (1 terms): Activities or experiences
    
    Important criteria to consider: 
    1) The search terms should not be too specific or they run risk of not returning any images. For example, for lesser known places like Sifnos in Greece,"Sifnos Uncrowded Beach" is too specific and will not return any images. "Sifnox Greece" is ok. 
    2) If there are 4 locations mentioned in the tour summary, then there should be at least 1 search term for each.
    3) Be smart in selecting the search terms. Give terms that represent what customers would want from that honeymoon. Eg for the maldives, give a term for diving or a beautiful beach. For Italy, give a term for a beautiful museum or food.
    4) The search term needs to relate to the tour summary.  Eg 'Sunset Boat Trip' is not a good search term because it's not specific to the tour summary. 'Greece Sailing' is ok instead if the tour is in Greece.
    5) Please ensure some diversity in the search terms. For example, if one term from landmarks is 'Venice Canals', then the activity term should not be 'Gondola Ride' but maybe 'Amalfi Coast Drive' or 'Amalfi Coast Boat'. Otherwise we repeat ourselves.
    6) For activities: focus on food, culture, nature and adventure. Remember it's a luxury honeymoon. 'Italian Cafe' is not special. 'Reinessance Italy Art' or 'Italian Food' are better.
    7) ONLY for places that are famous with probably a lot of pictures (Italy, Japan, France, Spain, etc), avoid generic terms like 'Italian Food' or 'Italian Village' and try to be more specific. For example, if tour is in Amalfi, you could use 'Amalfi Lemons' or 'Amalfi Food' instead of 'Italian Food'.  
    
    Format your response as a JSON object with these categories, like this:
    {{
        "landmarks": ["Bali Rice Terraces", "Colosseum", "Mount Batur", "Machu Picchu"],
        "cultural": ["Balinese Dancers", "Italian Osteria"],
        "activities": ["Sunrise Yoga", "Driving Amalfi Coast", "Snorkleing Maldives"]
    }}
    
    Do not include any explanations or additional text, just the JSON object.

    """
    
    response = call_gemini_api(prompt)
    
    if not response:
        logger.error(f"Failed to generate Pexels search terms for tour: {tour_name}")
        return []
    
    # Log the full response
    # logger.info(f"Full Gemini response for search terms:\n{response}") # Commented out
    
    # Try to extract JSON from response
    try:
        # Find anything that looks like a JSON object
        json_match = re.search(r'({[\s\S]*})', response, re.DOTALL)
        if json_match:
            search_terms = json.loads(json_match.group(1))
            logger.info(f"Successfully extracted Pexels search terms: {search_terms}")
            return search_terms
        else:
            logger.error(f"Could not find JSON object in response for tour: {tour_name}")
            return []
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON from response for tour: {tour_name}: {e}")
        return []

def search_pexels_images(search_term: str, per_page: int = 3):
    """Search for images on Pexels API"""
    url = f"https://api.pexels.com/v1/search"
    params = {
        "query": search_term,
        "per_page": per_page,
        "orientation": "landscape",
    }
    
    logger.info(f"Sending request to Pexels API with query: '{search_term}'")
    
    try:
        response = requests.get(url, params=params, headers=PEXELS_HEADERS)
        response.raise_for_status()
        data = response.json()
        photos = data.get("photos", [])
        
        logger.info(f"Pexels returned {len(photos)} images:")
        # Adapt the structure for consistency
        formatted_photos = []
        for i, photo in enumerate(photos):
             # Prefer larger sizes if available
            img_url = photo['src'].get('large2x') or photo['src'].get('original') or photo['src'].get('large')
            if not img_url:
                logger.warning(f"Skipping Pexels image {i+1} due to missing URL.")
                continue
            # logger.info(f"  Image {i+1}: {img_url}") # Commented out individual URL
            formatted_photos.append({
                "src": {
                    "large2x": img_url, 
                    "original": img_url # Use the same URL for simplicity here
                },
                "alt": photo.get('alt', '')
            })
        return formatted_photos
    except Exception as e:
        logger.error(f"Error searching Pexels: {e}")
        return []

def search_unsplash_images(search_term: str, per_page: int = 3):
    """Search for images on Unsplash API"""
    url = f"https://api.unsplash.com/search/photos"
    params = {
        "query": search_term,
        "per_page": per_page,
        "orientation": "landscape"
    }
    
    logger.info(f"Sending request to Unsplash API with query: '{search_term}'")
    
    try:
        response = requests.get(url, params=params, headers=UNSPLASH_HEADERS)
        response.raise_for_status()
        data = response.json()
        photos = data.get("results", [])
        
        logger.info(f"Unsplash returned {len(photos)} images:")
        # Adapt the structure to be similar to Pexels for easier processing downstream
        formatted_photos = []
        for i, photo in enumerate(photos):
            # logger.info(f"  Image {i+1}: {photo['urls']['regular']}") # Commented out individual URL
            formatted_photos.append({
                "src": {
                    "large2x": photo['urls']['regular'], # Use 'regular' or 'full'
                    "original": photo['urls']['full'] 
                },
                "alt": photo.get('alt_description', '') # Use 'alt_description' as 'alt'
            })
        return formatted_photos
    except Exception as e:
        logger.error(f"Error searching Unsplash: {e}")
        return []

def call_gemini_api_for_single_image_validation(image_data, image_url, tour_name, tour_summary, search_term, source_alt):
    """
    Call Gemini API to validate a single image using its data.
    
    Args:
        image_data: The image content in bytes.
        image_url: The original URL of the image (for logging).
        tour_name: Name of the tour.
        tour_summary: Summary of the tour.
        search_term: The search term used to find this image.
        source_alt: The original alt text from the image source (Pexels/Unsplash).
    
    Returns:
        Dictionary with validation results including score, description, and country.
    """
    logger.info(f"Validating single image data for tour '{tour_name}', search term '{search_term}'")
    # logger.info(f"Image source URL (for reference): {image_url}") # Commented out
    
    # Construct the prompt for single image validation
    prompt = f"""
    Please evaluate this image for a luxury honeymoon website featuring a tour titled: "{tour_name}"
    Tour Summary: "{tour_summary}"
    Search term used: "{search_term}"
    Original Alt Text: "{source_alt}"

    Evaluate on a scale of 1-10 for overall suitability. Consider these criteria:
    1. Relevance to the Tour Summary, the specific 'search_term', and the Original Alt Text.
    2. Quality and professional appearance suitable for a luxury brand.
    3. Luxury appeal and visual attractiveness.
    
    A score of 8 is the minimum acceptable.

    Big no no: 
    1) Closeups of people UNLESS they are local people or folkrostic (eg Balinese dancers).
    2) The picture is clearly from a country that is NOT consistent with the tour.
    3) Picture is from a location that is not mentioned in the tour summary.
    4) Picture is black and white.
    5) Picture is too vague - could be taken anywhere.
    6) Pictures that are cheesy and banal.
    
    Format your response ONLY as JSON with the following structure, no other text:
    {{ 
        "overall_score": X, 
        "description": "Brief description of what's in the image (refine original alt text if needed)", 
        "country": "Country depicted in the image, or 'Unknown'"
    }}
    """
    
    # Call the base Gemini API function with image data
    response_text = call_gemini_api(prompt, image_data=image_data)
    
    fallback_result = {
        "overall_score": 0,
        "description": "",
        "country": "Unknown"
    }

    if not response_text:
        logger.error(f"Failed to get validation from Gemini API for image: {image_url}")
        return fallback_result
    
    # Log the full response - Commented out
    # logger.info(f"Full Gemini response for single image validation ({image_url}):\n{response_text}") 
    
    # Try to extract JSON from the response
    try:
        json_match = re.search(r'({[\s\S]*})', response_text)
        if json_match:
            json_str = json_match.group(1)
            json_str = re.sub(r'^```json\n|\n```$', '', json_str).strip()
            validation_result = json.loads(json_str)
            
            if "overall_score" not in validation_result or "description" not in validation_result or "country" not in validation_result:
                 logger.error(f"Gemini validation JSON missing required keys: {validation_result}")
                 return fallback_result

            logger.info(f"Single image validation result: Score {validation_result.get('overall_score', 0)}/10")
            return validation_result
        else:
            logger.error(f"Could not find JSON in Gemini response for single image validation: {image_url}")
            return fallback_result
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON from single image validation response ({image_url}): {e}")
        return fallback_result
    except Exception as e:
        logger.error(f"Unexpected error during single image validation parsing ({image_url}): {e}")
        return fallback_result

def get_tours_from_supabase():
    """
    Get all tours from Supabase
    
    Returns:
        List of tour objects
    """
    try:
        response = supabase.table('tours').select('id, title, summary').execute()
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

def insert_to_tour_images(tour_id, image_url, alt_text, search_term, validation_result, display_order, pexels_alt, is_featured=False):
    """
    Insert a record into the tour_images table
    
    Args:
        tour_id: ID of the tour
        image_url: URL of the image in Supabase storage
        alt_text: Alternative text for the image (from Gemini description)
        search_term: The search term used to find this image
        validation_result: The validation result dict from Gemini (containing score, country)
        display_order: The display order of the image
        pexels_alt: The original alt text from Pexels (Added)
        is_featured: Whether this is the featured image for the tour
    
    Returns:
        The inserted record ID
    """
    url_endpoint = f"{SUPABASE_URL}/rest/v1/{DB_TABLE_NAME}"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # Current timestamp
    now = datetime.now().isoformat()
    
    # Extract data from validation_result
    overall_score = validation_result.get("overall_score", 0)
    country_name = validation_result.get("country", "Unknown")
    
    # Construct the simplified data payload
    data = {
        "tour_id": tour_id,
        "image_url": image_url, # Renamed from url
        "alt_text": alt_text,
        "is_featured": is_featured,
        "search_term": search_term,
        "overall_score": overall_score,
        "country_name": country_name, # Renamed from country
        "created_at": now,
        "updated_at": now,
        "display_order": display_order,
        "alt": pexels_alt, # Store Pexels alt text in the 'alt' column
        # Removed relevance_score, quality_score, luxury_score, romantic_score,
        # visual_impact_score, validation_summary, is_primary
    }
    
    try:
        response = requests.post(url_endpoint, headers=headers, json=data)
        
        if response.status_code == 201:
            inserted_id = response.json()[0]["id"]
            logger.info(f"Successfully inserted record into {DB_TABLE_NAME} table with ID: {inserted_id}")
            return inserted_id
        else:
            # Log the actual error from Supabase
            error_detail = response.text
            logger.error(f"Error inserting to {DB_TABLE_NAME}: {response.status_code} - {error_detail}")
            return None
    except Exception as e:
        logger.error(f"Exception during database insert: {e}")
        return None

def post_process_image(image_data: bytes) -> bytes:
    """Apply post-processing optimized for luxury travel photography
    Enhances colors particularly for sea, sky and nature while maintaining bright, premium aesthetic"""
    with Image.open(BytesIO(image_data)) as img:
        # Preserve original aspect ratio
        original_aspect = img.height / img.width
        
        # Maintain 1920px width for premium quality
        img_main = img.resize((1920, int(1920 * original_aspect)), Image.LANCZOS)
        
        # Enhance brightness more to make images less dark
        enhancer = ImageEnhance.Brightness(img_main)
        img_main = enhancer.enhance(0.97)  # Increased from 1.1 to 1.15
        
        # Reduce contrast slightly for a more natural look
        enhancer = ImageEnhance.Contrast(img_main)
        img_main = enhancer.enhance(1.1)  # Reduced from 1.15 to 1.1
        
        # Enhance saturation slightly for vibrant nature and sea colors
        enhancer = ImageEnhance.Color(img_main)
        img_main = enhancer.enhance(1.2)  # Increased from 1.15 to 1.2
        
        # Enhance colors with focus on blues for sea and sky
        r, g, b = img_main.split()
        r = r.point(lambda i: i * 1.02)  # Reduced from 1.05 to 1.02
        g = g.point(lambda i: i * 1.02)  # Reduced from 1.03 to 1.02
        b = b.point(lambda i: i * 1.05)  # Added blue enhancement for sea/sky
        img_main = Image.merge('RGB', (r, g, b))
        
        # Sharpen with refined parameters for luxury detail
        img_main = img_main.filter(ImageFilter.UnsharpMask(radius=0.8, percent=70, threshold=2))
        
        # Very subtle vignette for a clean, premium look
        vignette = Image.new('L', img_main.size, 255)
        for x in range(img_main.width):
            for y in range(img_main.height):
                dx = x - img_main.width / 2
                dy = y - img_main.height / 2
                distance = (dx**2 + dy**2)**0.5
                vignette.putpixel((x, y), int(255 * (1 - min(1, distance / (img_main.width / 2) * 0.08))))
        
        img_main = Image.composite(img_main, Image.new('RGB', img_main.size, (0, 0, 0)), vignette)
        
        # Save to bytes with higher quality for luxury brand
        output = BytesIO()
        img_main.save(output, format='JPEG', quality=90, optimize=True, progressive=True)
        # logger.info(f"Post-processed image from {len(image_data)} bytes to {output.tell()} bytes") # Commented out
        return output.getvalue()

def calculate_image_diversity_score(images, current_image):
    """
    Calculate a diversity score for a potential new image based on existing images
    
    Args:
        images: List of already selected images
        current_image: The image being evaluated
    
    Returns:
        Diversity score (higher is better)
    """
    if not images:
        return 1.0  # First image gets maximum diversity score
    
    # Extract features for diversity scoring
    current_description = current_image.get("description", "").lower()
    
    # Calculate similarity scores
    description_similarity = 0
    country_similarity = 0
    
    for existing_image in images:
        existing_description = existing_image.get("description", "").lower()
        existing_country = existing_image.get("country", "").lower()
        
        # Calculate description similarity (simple word overlap)
        current_words = set(current_description.split())
        existing_words = set(existing_description.split())
        overlap = len(current_words & existing_words)
        description_similarity = max(description_similarity, overlap / max(len(current_words), 1))
        
    # Combine scores (higher is worse for diversity)
    similarity_score = (description_similarity )
    
    # Convert to diversity score (higher is better)
    diversity_score = 1 - similarity_score
    
    return diversity_score

def select_diverse_images(images, max_images=13, max_per_search_term=2):
    """
    Select a diverse subset of images based on quality and diversity scores,
    with a limit on images per search term.

    Args:
        images: List of all candidate images (must include 'search_term').
        max_images: Maximum number of total images to select.
        max_per_search_term: Maximum number of images allowed from the same search term.

    Returns:
        List of selected images.
    """
    if not images:
        return []

    # Sort by quality score first (as an initial pool)
    sorted_images = sorted(images, key=lambda x: x.get("score", 0), reverse=True)

    selected_images = []
    remaining_images = sorted_images.copy()
    search_term_counts = {} # Track counts per search term

    while len(selected_images) < max_images and remaining_images:
        # Calculate diversity scores for remaining images relative to selected ones
        for img in remaining_images:
            diversity_score = calculate_image_diversity_score(selected_images, img)
            img["diversity_score"] = diversity_score

        # Sort remaining images by combined score (quality and diversity)
        remaining_images.sort(key=lambda x:
            (x.get("score", 0) * 0.7) + (x.get("diversity_score", 0) * 0.3),
            reverse=True)

        image_selected_this_iteration = False
        # Iterate through the *sorted* remaining images to find the next best *eligible* one
        for idx, potential_image in enumerate(remaining_images):
            term = potential_image.get("search_term", "unknown_term") # Ensure search term exists
            current_term_count = search_term_counts.get(term, 0)

            # Check if this search term's limit has been reached
            if current_term_count < max_per_search_term:
                # Select this image
                selected_image = remaining_images.pop(idx) # Remove from remaining
                selected_images.append(selected_image)
                search_term_counts[term] = current_term_count + 1 # Increment count
                image_selected_this_iteration = True
                break # Move to the next iteration of the outer while loop

        # If no eligible image was found in this iteration (e.g., all remaining are from maxed-out terms)
        if not image_selected_this_iteration:
            break # Stop the selection process

    logger.info(f"Selected {len(selected_images)} images. Final counts per search term: {search_term_counts}")
    return selected_images

def download_and_upload_images_for_tour(tour_id, tour_name, tour_summary, search_terms, api_source, min_score=IMAGE_QUALITY_THRESHOLD, unsplash_requests=None, override=False):
    """
    Download images from the specified API source(s) and upload them to Supabase for a tour
    
    Args:
        tour_id: ID of the tour
        tour_name: Name of the tour
        tour_summary: Summary of the tour
        search_terms: Dictionary of search terms by category
        api_source: The API to use ('pexels', 'unsplash', or 'boosted')
        min_score: Minimum validation score (1-10) required to accept an image
        unsplash_requests: Dictionary tracking Unsplash API request counts
        override: Boolean indicating if existing images should be overridden without prompt.
    
    Returns:
        List of dictionaries containing image metadata
    """
    logger.info(f"Processing images for tour: {tour_name} (ID: {tour_id}) using {api_source.upper()} API")
    
    # Check if we already have images for this tour
    existing_images = supabase.table(DB_TABLE_NAME).select('id', count='exact').eq('tour_id', tour_id).execute()
    existing_count = existing_images.count

    if existing_count > 0:
        logger.info(f"Tour {tour_name} already has {existing_count} images")
        # Only ask if override is NOT set
        if not override:
            response = input(f"Tour {tour_name} already has {existing_count} images. Continue and replace? (y/n): ")
            # Check the user's response
            if response.lower() != 'y':
                logger.info("Skipping tour due to user input.")
                return [] # Correctly indented return statement
            else:
                logger.info("Override confirmed by user. Proceeding to replace images.")
        else:
            logger.info("--override flag is set. Proceeding to replace existing images automatically.")

        # If continuing (either via override or user confirmation), delete existing images first
        logger.warning(f"Deleting {existing_count} existing images for tour {tour_id} before adding new ones...")
        delete_response = supabase.table(DB_TABLE_NAME).delete().eq('tour_id', tour_id).execute()
        # Check if deletion was successful (simple check on returned data length vs expected count)
        if len(getattr(delete_response, 'data', [])) == existing_count: # Safer attribute access
            logger.info(f"Successfully deleted {existing_count} existing images.")
        else:
            # Log the error response if available
            error_msg = getattr(delete_response, 'error', 'Unknown error during deletion')
            logger.error(f"Error deleting existing images. Expected {existing_count}, deleted {len(getattr(delete_response, 'data', []))}. Error: {error_msg}. Aborting for this tour.")
            return [] # Abort if deletion failed

    all_candidate_images = []
    display_order_counter = 0
    
    # Process each category of search terms
    for category, terms in search_terms.items():
        logger.info(f"Processing {category} search terms for tour: {tour_name}")
        
        # Process each search term in the category
        for search_term in terms:
            logger.info(f"Processing search term: '{search_term}' for tour: {tour_name} using {api_source.upper()}")
            
            # Parameters for API requests (mostly handled within search functions)
            per_page = 3
            results = []
            all_api_results = [] # Store results from both APIs in boosted mode
            
            # Use the selected API source(s)
            if api_source == 'pexels' or api_source == 'boosted':
                pexels_results = search_pexels_images(search_term, per_page=per_page)
                for res in pexels_results:
                    res['source'] = 'pexels' # Tag source
                all_api_results.extend(pexels_results)
                
            if api_source == 'unsplash' or api_source == 'boosted':
                unsplash_results = search_unsplash_images(search_term, per_page=per_page)
                for res in unsplash_results:
                    res['source'] = 'unsplash' # Tag source
                all_api_results.extend(unsplash_results)
            
            if api_source not in ['pexels', 'unsplash', 'boosted']:
                logger.error(f"Invalid API source specified: {api_source}")
                continue # Skip this search term
            
            # Use the combined results (or single source results)
            results = all_api_results 
            
            if not results:
                logger.warning(f"No results found from {api_source.upper()} source(s) for search term: '{search_term}'")
                continue
            
            logger.info(f"Found {len(results)} total images from {api_source.upper()} source(s) for search term: '{search_term}'")
            
            # --- Start Individual Image Download and Validation --- 
            logger.info(f"-- Validating images individually for '{search_term}' --")
            for i, image_meta in enumerate(results):
                try:
                    # Extract URL and Alt Text (standardized format)
                    image_url = image_meta["src"]["large2x"]
                    if not image_url:
                        image_url = image_meta["src"]["original"]
                    
                    source_alt_text = image_meta.get("alt", "") 
                    image_source_api = image_meta.get("source", api_source) # Get tagged source or default
                    
                    logger.info(f"  Processing candidate [{i+1}/{len(results)}] from {image_source_api.upper()}: {image_url}")

                    # Download the image data
                    try:
                        img_response = requests.get(image_url, timeout=20) # Added timeout
                        img_response.raise_for_status() # Raise HTTP errors
                        image_data = img_response.content
                        # logger.info(f"    Downloaded {len(image_data)} bytes.") # Commented out
                    except requests.Timeout:
                        logger.error(f"    Timeout downloading image: {image_url}")
                        continue # Skip this image
                    except requests.RequestException as download_err:
                        logger.error(f"    Error downloading image {image_url}: {download_err}")
                        continue # Skip this image

                    # Validate the single image using its data
                    validation_result = call_gemini_api_for_single_image_validation(
                        image_data=image_data,
                        image_url=image_url, 
                        tour_name=tour_name, 
                        tour_summary=tour_summary, 
                        search_term=search_term,
                        source_alt=source_alt_text
                    )
                    
                    # Get the overall score
                    overall_score = validation_result.get("overall_score", 0)
                    try:
                        overall_score = float(overall_score)
                    except (ValueError, TypeError):
                        logger.warning(f"    Could not convert overall_score '{overall_score}' to float. Setting to 0.")
                        overall_score = 0.0
                    
                    # Skip images that don't meet the minimum score
                    if overall_score < min_score:
                        logger.warning(f"    Image rejected: Score {overall_score}/10 below minimum {min_score}.")
                        continue
                    
                    logger.info(f"    Image ACCEPTED with score {overall_score}/10.")
                    # Add to candidate images using data from the current index
                    all_candidate_images.append({
                        "image_data": image_data, # Store the downloaded bytes
                        "url": image_url, 
                        "description": validation_result.get("description", ""),
                        "country": validation_result.get("country", "Unknown"),
                        "score": overall_score,
                        "search_term": search_term, 
                        "category": category, 
                        "alt": source_alt_text, # Store the original source alt text
                        "source": image_source_api 
                    })
                        
                except Exception as e:
                    image_source_api = image_meta.get("source", api_source) 
                    logger.error(f"    Error processing {image_source_api.upper()} candidate image {i+1} for search term '{search_term}': {e}", exc_info=True)
            
            # Add rate limiting sleep after processing all images for one search term
            logger.info(f"Finished processing search term '{search_term}'. Sleeping...")
            time.sleep(2) # Increased sleep after each search term processed
            
    # Select diverse subset of images (this now applies the per-term limit)
    # Pass max_images=13 and the default max_per_search_term=2
    selected_images = select_diverse_images(all_candidate_images, max_images=13)
    
    # Upload selected images
    logger.info(f"Uploading {len(selected_images)} selected images for tour '{tour_name}'.") # Log the actual number being uploaded
    uploaded_images = [] # Initialize the list here
    featured_set = False

    for image in selected_images:
        try:
            # Generate a unique filename
            unique_id = str(uuid.uuid4()).replace("-", "")[:12]
            safe_tour_name = re.sub(r'[^a-zA-Z0-9]', '_', tour_name.lower())
            safe_search_term = re.sub(r'[^a-zA-Z0-9]', '_', image["search_term"].lower())
            filename = f"{safe_tour_name}_{safe_search_term}_{unique_id}.jpg"

            # Use the already downloaded image data
            image_data_to_upload = image.get("image_data")
            if not image_data_to_upload:
                logger.error(f"Missing image data for image from search term '{image['search_term']}'. Skipping upload.")
                continue

            # Post-process the image
            processed_image_data = post_process_image(image_data_to_upload)

            # Upload to Supabase storage
            storage_url = upload_to_supabase_storage(processed_image_data, filename)
            if not storage_url:
                logger.error(f"Failed to upload image to storage")
                continue

            # Set as featured if this is the first high-scoring image (score >= 9.0)
            is_featured = not featured_set and image["score"] >= 9.0
            if is_featured:
                featured_set = True
                logger.info(f"Setting image as featured (Score: {image['score']})")

            # Increment display order
            display_order_counter += 1

            # Insert into tour_images table
            image_id = insert_to_tour_images(
                tour_id=tour_id,
                image_url=storage_url,
                alt_text=image["description"],
                search_term=image["search_term"],
                validation_result={
                    "overall_score": image["score"],
                    "description": image["description"],
                    "country": image["country"]
                },
                display_order=display_order_counter,
                pexels_alt=image["alt"], # Pass Pexels alt text
                is_featured=is_featured
            )

            if image_id:
                uploaded_images.append({
                    "id": image_id,
                    "url": storage_url,
                    "alt_text": image["description"],
                    "search_term": image["search_term"],
                    "is_featured": is_featured,
                    "score": image["score"],
                    "country": image["country"],
                    "display_order": display_order_counter,
                    "source": image["source"]
                })
                logger.info(f"Successfully processed image (Score: {image['score']}/10, Order: {display_order_counter})")

        except Exception as e:
            logger.error(f"Error processing image: {e}", exc_info=True)

    logger.info(f"Successfully processed {len(uploaded_images)} images for tour: {tour_name}")
    return uploaded_images

def process_all_tours(api_source, min_score=IMAGE_QUALITY_THRESHOLD, override=False):
    """
    Process all tours from Supabase
    
    Args:
        api_source: The API to use ('pexels' or 'unsplash')
        min_score: Minimum validation score (1-10) required to accept an image
        override: If True, process tours even if they already have images
    """
    # Get all tours
    tours = get_tours_from_supabase()
    
    if not tours:
        logger.error("No tours found in database")
        return

    # Initialize Unsplash request counter and timestamp
    unsplash_requests = {
        'count': 0,
        'hour_start': time.time()
    }
    
    # Create a DataFrame to store search terms
    search_terms_df = pd.DataFrame(columns=['tour_id', 'tour_name', 'search_terms'])
    
    # Process each tour
    for i, tour in enumerate(tours):
        tour_id = tour['id']
        tour_name = tour['title']
        tour_summary = tour.get('summary', '')
        
        logger.info(f"\nProcessing tour {i+1}/{len(tours)}: {tour_name}")
        
        # !! Note: The check for existing images is now primarily handled inside download_and_upload_images_for_tour !!
        # The override flag is passed down to control its behavior.
        # This outer check can be removed or kept as a pre-check log if desired, but it's redundant for skipping logic.
        # Example: Log if skipping based on override=False *before* even calling the main function
        if not override:
             existing_images_precheck = supabase.table(DB_TABLE_NAME).select('id', count='exact').eq('tour_id', tour_id).execute()
             if existing_images_precheck.count > 0:
                 logger.info(f"Tour {tour_name} has existing images and override is False. Skipping call to download/upload function.")
                 continue # Skip to the next tour

        # Check Unsplash rate limit if using Unsplash
        if api_source in ['unsplash', 'boosted']:
            # Reset counter if an hour has passed
            current_time = time.time()
            if current_time - unsplash_requests['hour_start'] >= 3600:
                logger.info("Resetting Unsplash request counter for new hour")
                unsplash_requests['count'] = 0
                unsplash_requests['hour_start'] = current_time
            
            # If we're about to exceed the limit, wait until the next hour
            if unsplash_requests['count'] >= 48:  # Leave buffer of 2 requests
                wait_time = 3600 - (current_time - unsplash_requests['hour_start'])
                logger.info(f"Reached Unsplash rate limit. Waiting {wait_time/60:.1f} minutes for next hour...")
                time.sleep(wait_time + 60)  # Add 60 seconds buffer
                unsplash_requests['count'] = 0
                unsplash_requests['hour_start'] = time.time()
        
        # Generate search terms for the tour
        search_terms = generate_search_terms_for_tour(tour_name, tour_summary)
        
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
        
        # Download and upload images - Pass the override flag here
        download_and_upload_images_for_tour(
            tour_id, 
            tour_name, 
            tour_summary, 
            search_terms, 
            api_source, 
            min_score,
            unsplash_requests, # Pass the request counter
            override=override  # Pass the override flag
        )
        
        # Update Unsplash request count if applicable
        if api_source in ['unsplash', 'boosted']:
            # Each tour makes 8 Unsplash API calls (one per search term)
            unsplash_requests['count'] += 8
            logger.info(f"Unsplash API calls this hour: {unsplash_requests['count']}/50")
        
        # Sleep to avoid general rate limiting
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

def process_single_tour(api_source, tour_id=None, tour_code=None, min_score=IMAGE_QUALITY_THRESHOLD, override=False):
    """
    Process a single tour by ID or code
    
    Args:
        api_source: The API to use ('pexels' or 'unsplash') (Added)
        tour_id: ID of the tour (optional)
        tour_code: Code of the tour (optional)
        min_score: Minimum validation score (1-10) required to accept an image
        override: Boolean indicating if existing images should be overridden without prompt.
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
        tour = next((t for t in tours if t['code'] == tour_code), None)
    
    if not tour:
        logger.error(f"No tour found with ID: {tour_id} or code: {tour_code}")
        return
    
    tour_id = tour['id']
    tour_name = tour['title']
    tour_summary = tour.get('summary', '') # Get summary, default to empty string if missing
    
    logger.info(f"Processing tour: {tour_name}")
    
    # Generate search terms for the tour
    search_terms = generate_search_terms_for_tour(tour_name, tour_summary)
    
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
    
    # Download and upload images - Pass the override flag here
    download_and_upload_images_for_tour(
        tour_id,
        tour_name,
        tour_summary,
        search_terms,
        api_source,
        min_score,
        override=override # Pass the override flag
        # Note: unsplash_requests not needed here as it's for the loop in process_all_tours
    )
    
    logger.info(f"Completed processing tour: {tour_name}")
    logger.info(f"Search terms saved to tour_{tour_id}_search_terms.json")

def main():
    parser = argparse.ArgumentParser(description='Download and upload images for tours')
    parser.add_argument('--tour-id', type=str, help='Process a specific tour by ID')
    parser.add_argument('--api-source', type=str, choices=['pexels', 'unsplash', 'boosted'], default='pexels', 
                        help='Image API source(s) to use (pexels, unsplash, or boosted), default: pexels')
    parser.add_argument('--min-score', type=float, default=IMAGE_QUALITY_THRESHOLD, 
                        help=f'Minimum validation score (1-10), default: {IMAGE_QUALITY_THRESHOLD}')
    parser.add_argument('--override', action='store_true',
                        help='Process tours even if they already have images, deleting existing ones first.')
    
    args = parser.parse_args()
    
    # Log the start of the script
    logger.info("=" * 80)
    logger.info("Starting image generation script")
    logger.info(f"Minimum quality score threshold: {args.min_score}")
    logger.info(f"Using API source: {args.api_source.upper()}")
    logger.info(f"Override mode: {args.override}")
    
    if args.tour_id:
        process_single_tour(api_source=args.api_source, tour_id=args.tour_id, min_score=args.min_score, override=args.override)
    else:
        process_all_tours(api_source=args.api_source, min_score=args.min_score, override=args.override)
    
    logger.info("Image generation script completed")
    logger.info("=" * 80)

if __name__ == "__main__":
    main()