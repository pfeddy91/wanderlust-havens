import argparse
import requests
import json
import os
import time
import uuid
import re
import csv
import hashlib
from datetime import datetime
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter
from supabase import create_client, Client

# API credentials
UNSPLASH_ACCESS_KEY = "x49l7PRQ_Du5MyKVvAK_Y4FTjcWXEzUgMtnp4SQeG8s"
PEXELS_API_KEY = "2nTDyWqcjwBRUWzyi2mpWlbqKHAy4xxAHuRbSHtA38kCOfoNQbDeOoye"
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

# Supabase credentials
SUPABASE_URL = "https://jeiuruhneitvfyjkmbvj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaXVydWhuZWl0dmZ5amttYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjU5NzQsImV4cCI6MjA1ODI0MTk3NH0.iYBsdI4p7o7rKbrMHstzis4KZYV_ks2p09pmtj5-bTo"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Storage bucket name (for storing the actual image files)
STORAGE_BUCKET = "tour-images"

# Database table name (for storing metadata about images)
DB_TABLE_NAME = "tour_images"

# Base directory for temporary local storage
TEMP_DIR = "temp_images"
os.makedirs(TEMP_DIR, exist_ok=True)

# Create a directory for results if it doesn't exist
os.makedirs("image_results", exist_ok=True)

def calculate_image_hash(image_data):
    """
    Calculate a hash for an image to detect duplicates
    
    Args:
        image_data: Binary image data
    
    Returns:
        Hash string
    """
    return hashlib.md5(image_data).hexdigest()

def is_duplicate_image(image_data, processed_hashes):
    """
    Check if an image is a duplicate based on its hash
    
    Args:
        image_data: Binary image data
        processed_hashes: Set of hashes of already processed images
    
    Returns:
        True if duplicate, False otherwise
    """
    image_hash = calculate_image_hash(image_data)
    if image_hash in processed_hashes:
        return True
    processed_hashes.add(image_hash)
    return False

def check_visual_similarity(image_data, accepted_images_data):
    """
    Check if an image is visually similar to already accepted images
    
    Args:
        image_data: Binary image data
        accepted_images_data: List of binary data of already accepted images
    
    Returns:
        True if similar, False otherwise
    """
    try:
        # Open the new image
        new_image = Image.open(BytesIO(image_data))
        
        # Resize for faster comparison
        new_image = new_image.resize((100, 100))
        new_image = new_image.convert('L')  # Convert to grayscale
        new_pixels = list(new_image.getdata())
        
        # Compare with each accepted image
        for accepted_data in accepted_images_data:
            accepted_image = Image.open(BytesIO(accepted_data))
            accepted_image = accepted_image.resize((100, 100))
            accepted_image = accepted_image.convert('L')
            accepted_pixels = list(accepted_image.getdata())
            
            # Calculate difference
            diff = sum(abs(p1 - p2) for p1, p2 in zip(new_pixels, accepted_pixels))
            avg_diff = diff / (100 * 100)
            
            # If difference is less than threshold, consider it similar
            if avg_diff < 10:  # Threshold can be adjusted
                return True
                
        return False
    except Exception as e:
        print(f"Error checking visual similarity: {e}")
        return False

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
        
        print(f"Sending prompt to Gemini API: {prompt[:100]}...")
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if not response.ok:
            print(f"Gemini API error: {response.status_code} - {response.text[:200]}...")
            return None
            
        result = response.json()
        
        # Extract the content from Gemini's response format
        if 'candidates' in result and result['candidates'] and 'content' in result['candidates'][0]:
            content_parts = result['candidates'][0]['content']['parts']
            content = ''.join([part.get('text', '') for part in content_parts if 'text' in part])
            print(f"Received response from Gemini API: {content[:100]}...")
            return content
        else:
            print("Unexpected response format from Gemini API")
            return None
        
    except Exception as e:
        print(f"Gemini API Request Error: {str(e)}")
        return None

def get_tours_from_supabase(tour_id=None):
    """
    Get tours from Supabase
    
    Args:
        tour_id: Optional specific tour ID to fetch
    
    Returns:
        List of tour objects
    """
    try:
        query = supabase.table('tours').select('id, name, summary')
        
        if tour_id:
            query = query.eq('id', tour_id)
            
        response = query.execute()
        tours = response.data
        
        print(f"Retrieved {len(tours)} tours from Supabase")
        return tours
    except Exception as e:
        print(f"Error fetching tours from Supabase: {e}")
        return []

def generate_search_terms_for_tour(tour_name, tour_summary=None, rejected_terms=None):
    """
    Generate search terms for a tour using Gemini
    
    Args:
        tour_name: Name of the tour
        tour_summary: Summary description of the tour (optional)
        rejected_terms: List of previously rejected search terms to avoid
    
    Returns:
        List of search terms
    """
    if rejected_terms is None:
        rejected_terms = []
        
    print(f"Generating search terms for: '{tour_name}'")
    
    # Construct the prompt, including the summary if available
    if tour_summary:
        prompt = f"""
        I am building a luxury honeymoon website and need your help in selecting 6 search terms which I can pass to Pexels API in order to find images for a tour titled "{tour_name}".

        Here's a detailed description of the tour:
        {tour_summary}
        
        Please provide search terms that:
        1. Are high level enough to return a lot of relevant images. DO: 'Napa Valley' or 'Big Sur Coastal Highway'(generic enough). DON'T DO: 'Napa Valley Rural House' or 'Big Sur Coastal Highway at sunset car' (specific enough).
        2. Showcase the most beautiful and iconic aspects of the destinations mentioned in the tour. Please ensure to cover at least 3 different destinations of the tour. For example, if a tour has desert, sea and safari, please cover all 3.
        3. Would appeal to luxury travelers and honeymooners
        5. Focus on scenary, nature, and outdoor activities. 
        
        Please avoid these previously rejected terms: {', '.join(rejected_terms) if rejected_terms else 'None'}
        
        Format your response as a JSON array of strings, with each string being a search term.
        Example: ["Santorini sunset view", "Maldives overwater bungalow", "Venice gondola canal", "Kyoto cherry blossoms", "Amalfi Coast cliffside", "Paris Eiffel Tower night"]
        """
    else:
        # Fallback to using just the tour name if no summary is available
        prompt = f"""
        I am building a luxury honeymoon website and need your help in selecting 6 search terms which I can pass to Pexels API in order to find images for a tour titled "{tour_name}".
        
        Please provide search terms that:
        1. Are high level enough to return high-quality, relevant images (e.g. 'Napa Valley Rural' or 'Big Sur Coastal Highway')
        2. Showcase the most beautiful and iconic aspects of the destinations mentioned in the tour
        3. Would appeal to luxury travelers and honeymooners
        4. Highlight natural beauty, luxury accommodations, or romantic settings from the tour
        5. Focus on scenary, nature, and outdoor activities. 
        
        Please avoid these previously rejected terms: {', '.join(rejected_terms) if rejected_terms else 'None'}
        
        Format your response as a JSON array of strings, with each string being a search term.
        Example: ["Santorini sunset view", "Maldives overwater bungalow", "Venice gondola canal", "Kyoto cherry blossoms", "Amalfi Coast cliffside", "Paris Eiffel Tower night"]
        """
    
    # Call Gemini API
    response = call_gemini_api(prompt)
    
    if not response:
        print(f"Failed to generate search terms")
        return []
    
    # Extract search terms from response
    try:
        # Try to parse as JSON
        search_terms = json.loads(response)
        
        # Validate that we got a list of strings
        if not isinstance(search_terms, list):
            print(f"Invalid response format: not a list")
            return []
            
        # Filter out any previously rejected terms
        search_terms = [term for term in search_terms if term not in rejected_terms]
        
        return search_terms
        
    except json.JSONDecodeError:
        # If not valid JSON, try to extract terms using regex
        print(f"Failed to parse JSON, trying regex extraction")
        
        # Look for anything that might be a list of terms
        match = re.search(r'\[(.*?)\]', response, re.DOTALL)
        if match:
            terms_str = match.group(1)
            # Split by commas and clean up
            terms = [term.strip().strip('"\'') for term in terms_str.split(',')]
            # Filter out empty strings and previously rejected terms
            terms = [term for term in terms if term and term not in rejected_terms]
            return terms
            
        print(f"Failed to extract search terms from response")
        return []

def search_pexels(query, per_page=3, orientation="landscape"):
    """
    Search Pexels for images
    
    Args:
        query: Search query
        per_page: Number of images to return per page (default: 3)
        orientation: Image orientation ("landscape", "portrait", or "square")
    
    Returns:
        List of image objects
    """
    try:
        # Construct the URL
        url = "https://api.pexels.com/v1/search"
        
        # Map orientation to Pexels format
        pexels_orientation = orientation
        if orientation == "squarish":
            pexels_orientation = "square"
        
        # Set up parameters
        params = {
            "query": query,
            "per_page": per_page,
            "orientation": pexels_orientation,
            "size": "large"
        }
        
        # Set up headers
        headers = {
            "Authorization": PEXELS_API_KEY
        }
        
        # Make the request
        print(f"Searching Pexels for: {query}")
        print(f"Parameters: orientation={pexels_orientation}, per_page={per_page}")
        response = requests.get(url, params=params, headers=headers)
        
        if not response.ok:
            print(f"Pexels API error: {response.status_code} - {response.text[:200]}...")
            return []
            
        result = response.json()
        
        if 'photos' not in result:
            print(f"Unexpected response format from Pexels API")
            return []
            
        images = result['photos']
        print(f"Found {len(images)} images on Pexels for query: {query}")
        
        # Standardize the format to match our common structure
        standardized_images = []
        for img in images:
            standardized_images.append({
                "id": str(img.get("id")),
                "description": img.get("alt") or "",
                "urls": {
                    "original": img.get("src", {}).get("original"),
                    "large": img.get("src", {}).get("large2x"),
                    "medium": img.get("src", {}).get("large"),
                    "small": img.get("src", {}).get("medium"),
                    "thumbnail": img.get("src", {}).get("small")
                },
                "photographer": img.get("photographer"),
                "photographer_url": img.get("photographer_url"),
                "source": "pexels",
                "search_term": query
            })
        
        return standardized_images
        
    except Exception as e:
        print(f"Error searching Pexels: {e}")
        return []

def validate_image(image_url, tour_name, search_term, image_description=""):
    """
    Validate an image using Gemini
    
    Args:
        image_url: URL of the image to validate
        tour_name: Name of the tour
        search_term: Search term used to find the image
        image_description: Description of the image (if available)
    
    Returns:
        Dictionary with validation results
    """
    # Construct the prompt
    description_text = f"Image description: {image_description}" if image_description else ""
    
    prompt = f"""
    You are a luxury travel image curator for a high-end honeymoon travel agency.
    
    Please evaluate this image for a luxury honeymoon tour titled "{tour_name}".
    The image was found using the search term: "{search_term}".
    {description_text}
    
    Image URL: {image_url}
    
    Evaluate the image on a scale of 1-10 (10 being the best) based on:
    - How well it represents a luxury honeymoon experience
    - How well it matches the tour name and search term
    - Overall visual appeal and quality
    
    Provide:
    1. An overall score (1-10)
    2. A recommendation (Accept or Reject)
    3. A brief explanation of your rating
    
    Format your response as a JSON object with the following structure:
    {{
        "overall_score": [score],
        "recommendation": "[Accept/Reject]",
        "explanation": "[brief explanation]"
    }}
    """
    
    # Call Gemini API
    response = call_gemini_api(prompt)
    
    if not response:
        print(f"Failed to get validation response from Gemini")
        return None
    
    # Extract JSON from response
    try:
        # Find JSON in the response (it might be surrounded by other text)
        json_match = re.search(r'({.*})', response.replace('\n', ' '), re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
            validation_result = json.loads(json_str)
            
            # Ensure required fields are present
            if "overall_score" not in validation_result or "recommendation" not in validation_result:
                print(f"Missing required fields in validation result")
                return None
                
            return validation_result
        else:
            print(f"No JSON found in validation response")
            return None
    except Exception as e:
        print(f"Error parsing validation response: {e}")
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
        print(f"Downloading image from: {url}")
        response = requests.get(url, stream=True, timeout=10)
        
        if not response.ok:
            print(f"Failed to download image: {response.status_code} - {response.reason}")
            return None
            
        # Return the image data
        return response.content
        
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None

def apply_luxury_filter(image_data):
    """
    Apply a subtle warm luxury tint to the image
    
    Args:
        image_data: Image data as bytes
    
    Returns:
        Processed image as PIL Image object or None if failed
    """
    try:
        # Open the image with PIL
        image = Image.open(BytesIO(image_data))
        
        # Convert to RGB if needed (in case of RGBA)
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        # Step 1: Slightly increase contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.1)  # Subtle contrast increase
        
        # Step 2: Add warmth (increase red and yellow tones)
        r, g, b = image.split()
        r = ImageEnhance.Brightness(r).enhance(1.08)  # Increase red channel
        g = ImageEnhance.Brightness(g).enhance(1.05)  # Slightly increase green
        # Blue stays the same
        image = Image.merge("RGB", (r, g, b))
        
        # Step 3: Increase saturation slightly
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(1.15)  # Subtle saturation increase
        
        # Step 4: Add a very subtle vignette effect
        # Create a radial gradient mask
        width, height = image.size
        mask = Image.new('L', (width, height), 255)
        for y in range(height):
            for x in range(width):
                # Distance from center (0.0 to 1.0)
                distance = ((x - width/2.0) / (width/2.0))**2 + ((y - height/2.0) / (height/2.0))**2
                # Darken edges very slightly
                mask.putpixel((x, y), int(255 * (1.0 - 0.1 * min(1.0, distance))))
        
        # Apply the mask
        enhancer = ImageEnhance.Brightness(image)
        darkened = enhancer.enhance(0.9)  # Slightly darkened version
        image = Image.composite(image, darkened, mask)
        
        # Step 5: Subtle sharpening for clarity
        image = image.filter(ImageFilter.SHARPEN)
        
        print("Luxury filter applied successfully")
        return image
        
    except Exception as e:
        print(f"Error applying luxury filter: {e}")
        return None

def upload_to_supabase_storage(image_data, tour_id, filename):
    """
    Upload an image to Supabase Storage in a tour-specific subfolder
    
    Args:
        image_data: Binary image data
        tour_id: ID of the tour (for subfolder organization)
        filename: Filename to use in storage
    
    Returns:
        URL of the uploaded file
    """
    # Define the storage path with tour subfolder
    bucket_name = STORAGE_BUCKET
    storage_path = f"{tour_id}/{filename}"
    
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
            print(f"Successfully uploaded image to Supabase storage: {storage_path}")
            return public_url.rstrip('?')  # Remove any trailing question mark
        else:
            print(f"Failed to upload image to Supabase storage: {response.status_code} - {response.text[:200]}...")
            return None
    except Exception as e:
        print(f"Error uploading to Supabase storage: {e}")
        return None

def upload_to_supabase_database(tour_id, image_url, search_term, description="", score=0, is_primary=False, display_order=0):
    """
    Upload image metadata to Supabase database
    
    Args:
        tour_id: ID of the tour
        image_url: URL of the image in storage
        search_term: Search term used to find the image
        description: Description of the image
        score: Validation score
        is_primary: Whether this is the primary image for the tour
        display_order: Order in which to display the image
    
    Returns:
        ID of the created record or None if failed
    """
    try:
        # Generate alt text from description or search term
        alt_text = description if description else f"Image of {search_term}"
        
        # Current timestamp
        now = datetime.now().isoformat()
        
        # Prepare data according to the database schema
        data = {
            "tour_id": tour_id,
            "image_url": image_url,
            "alt_text": alt_text,
            "is_featured": False,  # Default to false
            "display_order": display_order,
            "created_at": now,
            "updated_at": now,
            "is_primary": is_primary,
            "search_term": search_term,
            "overall_score": score  # Use overall_score instead of score
        }
        
        # Insert into database
        response = supabase.table(DB_TABLE_NAME).insert(data).execute()
        
        if response.data:
            print(f"Successfully uploaded image metadata to Supabase database")
            return response.data[0].get('id')
        else:
            print(f"Failed to upload image metadata to Supabase database")
            return None
    except Exception as e:
        print(f"Error uploading to Supabase database: {e}")
        return None

def process_tour(tour_id, tour_name, tour_summary=None, min_score=7.0, min_images=6, source="pexels"):
    """
    Process a tour to find and upload images
    
    Args:
        tour_id: ID of the tour
        tour_name: Name of the tour
        tour_summary: Summary description of the tour (optional)
        min_score: Minimum validation score required
        min_images: Minimum number of images to collect
        source: Image source API to use ("pexels" or "unsplash")
    
    Returns:
        Dictionary with tour processing results
    """
    print(f"\n{'='*80}")
    print(f"Processing tour: {tour_name} (ID: {tour_id})")
    print(f"Using image source: {source}")
    if tour_summary:
        print(f"Summary: {tour_summary[:100]}...")
    print(f"{'='*80}")
    
    # Generate search terms
    search_terms = generate_search_terms_for_tour(tour_name, tour_summary)
    if not search_terms:
        print(f"Failed to generate search terms for tour: {tour_name}")
        return {
            'tour_id': tour_id,
            'tour_name': tour_name,
            'accepted_images': [],
            'rejected_terms': [],
            'validation_results': []
        }
    
    print(f"Generated {len(search_terms)} search terms: {search_terms}")
    
    # Track rejected search terms to avoid reusing them
    rejected_terms = []
    # Track accepted images
    accepted_images = []
    # Track all validation results for reference
    all_validation_results = []
    
    # Track image hashes to detect duplicates
    processed_hashes = set()
    # Track binary data of accepted images for visual similarity check
    accepted_images_data = []
    
    # Keep trying until we have enough images
    while len(accepted_images) < min_images:
        # If we've tried all search terms and still don't have enough images,
        # generate new search terms avoiding the rejected ones
        if not search_terms:
            print(f"Generating new search terms (avoiding {len(rejected_terms)} rejected terms)")
            search_terms = generate_search_terms_for_tour(tour_name, tour_summary, rejected_terms)
            if not search_terms:
                print(f"Failed to generate new search terms, stopping")
                break
            print(f"Generated {len(search_terms)} new search terms: {search_terms}")
        
        # Process each search term
        for search_term in list(search_terms):  # Create a copy to safely remove items
            print(f"\nProcessing search term: '{search_term}'")
            
            # Search for multiple images per search term
            images = search_images(search_term, source=source, per_page=3, orientation="landscape")
            
            if not images:
                print(f"No images found for search term: '{search_term}'")
                search_terms.remove(search_term)
                rejected_terms.append(search_term)
                continue
            
            # Track if any images were accepted for this search term
            images_accepted_for_term = False
            
            # Process each image for this search term
            for image_index, image in enumerate(images):
                image_url = image["urls"]["large"]
                image_description = image.get("description", "")
                
                # Validate the image
                print(f"Validating image {image_index+1}/{len(images)}: {image_url}")
                if image_description:
                    print(f"Image description: {image_description}")
                
                validation_result = validate_image(image_url, tour_name, search_term, image_description)
                
                if not validation_result:
                    print(f"Failed to validate image {image_index+1} for search term: '{search_term}'")
                    continue
                
                # Save validation result for reference
                all_validation_results.append({
                    "search_term": search_term,
                    "image_url": image_url,
                    "image_description": image_description,
                    "validation": validation_result
                })
                
                # Check if the image meets the quality threshold
                overall_score = validation_result.get("overall_score", 0)
                recommendation = validation_result.get("recommendation", "Reject")
                explanation = validation_result.get("explanation", "")
                
                print(f"Image validation - Score: {overall_score}, Recommendation: {recommendation}")
                print(f"Explanation: {explanation}")
                
                if overall_score >= min_score and recommendation.lower() == "accept":
                    print(f"Image accepted with score {overall_score}")
                    
                    # Download the image
                    image_data = download_image(image_url)
                    
                    if not image_data:
                        print(f"Failed to download image {image_index+1} for search term: '{search_term}'")
                        continue
                    
                    # Check for duplicates
                    if is_duplicate_image(image_data, processed_hashes):
                        print(f"Duplicate image detected, skipping")
                        continue
                    
                    # Check for visual similarity with already accepted images
                    if check_visual_similarity(image_data, accepted_images_data):
                        print(f"Visually similar image detected, skipping")
                        continue
                    
                    # Add to accepted images data for future similarity checks
                    accepted_images_data.append(image_data)
                    
                    # Apply luxury filter
                    processed_image = apply_luxury_filter(image_data)
                    
                    if not processed_image:
                        print(f"Failed to apply luxury filter to image {image_index+1} for search term: '{search_term}'")
                        continue
                    
                    # Generate a unique filename
                    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                    random_id = str(uuid.uuid4())[:8]
                    safe_tour_name = re.sub(r'[^a-zA-Z0-9]', '_', tour_name.lower())
                    filename = f"{safe_tour_name}_{timestamp}_{random_id}.jpg"
                    
                    # Save locally first
                    local_path = os.path.join(TEMP_DIR, filename)
                    processed_image.save(local_path, "JPEG", quality=95)
                    
                    # Read the processed image for upload
                    with open(local_path, "rb") as f:
                        processed_image_data = f.read()
                    
                    # Upload to Supabase storage
                    uploaded_url = upload_to_supabase_storage(processed_image_data, tour_id, filename)
                    
                    if not uploaded_url:
                        print(f"Failed to upload image {image_index+1} to storage for search term: '{search_term}'")
                        continue
                    
                    # Determine if this should be the primary image
                    # First image is primary, or if the score is higher than any previous image
                    is_primary = len(accepted_images) == 0 or overall_score > max(img["score"] for img in accepted_images)
                    
                    # If this is the new primary, update all previous images to not be primary
                    if is_primary and accepted_images:
                        for img in accepted_images:
                            if img["is_primary"]:
                                img["is_primary"] = False
                                # Update in database
                                try:
                                    supabase.table(DB_TABLE_NAME).update({"is_primary": False}).eq("image_url", img["url"]).execute()
                                except Exception as e:
                                    print(f"Warning: Failed to update primary status in database: {e}")
                    
                    # Generate a better description if needed
                    if not image_description:
                        # Use the search term and tour name to create a description
                        image_description = f"A beautiful view of {search_term} for the {tour_name} tour"
                    
                    # Set display order (1-based index)
                    display_order = len(accepted_images) + 1
                    
                    # Upload metadata to Supabase database
                    db_id = upload_to_supabase_database(
                        tour_id=tour_id,
                        image_url=uploaded_url,
                        search_term=search_term,
                        description=image_description,
                        score=overall_score,
                        is_primary=is_primary,
                        display_order=display_order
                    )
                    
                    if not db_id:
                        print(f"Failed to upload image {image_index+1} metadata to database for search term: '{search_term}'")
                        continue
                    
                    # Add to accepted images
                    accepted_images.append({
                        "id": db_id,
                        "url": uploaded_url,
                        "search_term": search_term,
                        "description": image_description,
                        "score": overall_score,
                        "is_primary": is_primary,
                        "display_order": display_order
                    })
                    
                    print(f"Successfully processed image {len(accepted_images)}/{min_images} for tour")
                    
                    # Mark that we've accepted at least one image for this term
                    images_accepted_for_term = True
                    
                    # If we have enough images, break out of the inner loop
                    if len(accepted_images) >= min_images:
                        break
                else:
                    print(f"Image {image_index+1} rejected for search term: '{search_term}'")
            
            # After processing all images for this search term
            if images_accepted_for_term:
                print(f"Successfully processed at least one image for search term: '{search_term}'")
            else:
                print(f"No images accepted for search term: '{search_term}'")
                rejected_terms.append(search_term)
            
            # Remove this search term as we've processed all its images
            search_terms.remove(search_term)
            
            # If we have enough images, break out of the outer loop
            if len(accepted_images) >= min_images:
                break
    
    # Save all validation results to a file for reference
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_filename = f"image_results/tour_{tour_id}_validation_results_{timestamp}.json"
    with open(results_filename, 'w') as f:
        json.dump({
            "tour_id": tour_id,
            "tour_name": tour_name,
            "accepted_images": len(accepted_images),
            "rejected_terms": rejected_terms,
            "validation_results": all_validation_results
        }, f, indent=2)
    
    print(f"\nTour processing complete: {tour_name}")
    print(f"Accepted images: {len(accepted_images)}/{min_images}")
    print(f"Rejected search terms: {len(rejected_terms)}")
    print(f"Validation results saved to: {results_filename}")
    
    # Return results for CSV generation
    return {
        'tour_id': tour_id,
        'tour_name': tour_name,
        'accepted_images': accepted_images,
        'rejected_terms': rejected_terms,
        'validation_results': all_validation_results
    }

def search_unsplash(query, per_page=3, orientation="landscape"):
    """
    Search Unsplash for images
    
    Args:
        query: Search query
        per_page: Number of images to return per page
        orientation: Image orientation ("landscape", "portrait", or "squarish")
    
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
            "orientation": orientation
        }
        
        # Set up headers
        headers = {
            "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"
        }
        
        # Make the request
        print(f"Searching Unsplash for: {query}")
        print(f"Parameters: orientation={orientation}, per_page={per_page}")
        response = requests.get(url, params=params, headers=headers)
        
        if not response.ok:
            print(f"Unsplash API error: {response.status_code} - {response.text[:200]}...")
            return []
            
        result = response.json()
        
        if 'results' not in result:
            print(f"Unexpected response format from Unsplash API")
            return []
            
        images = result['results']
        print(f"Found {len(images)} images on Unsplash for query: {query}")
        
        # Standardize the format to match our common structure
        standardized_images = []
        for img in images:
            standardized_images.append({
                "id": img.get("id", ""),
                "description": img.get("description") or img.get("alt_description") or "",
                "urls": {
                    "original": img.get("urls", {}).get("raw"),
                    "large": img.get("urls", {}).get("full"),
                    "medium": img.get("urls", {}).get("regular"),
                    "small": img.get("urls", {}).get("small"),
                    "thumbnail": img.get("urls", {}).get("thumb")
                },
                "photographer": img.get("user", {}).get("name"),
                "photographer_url": img.get("user", {}).get("links", {}).get("html"),
                "source": "unsplash",
                "search_term": query
            })
        
        return standardized_images
        
    except Exception as e:
        print(f"Error searching Unsplash: {e}")
        return []

def search_images(query, source="pexels", per_page=3, orientation="landscape"):
    """
    Search for images using the specified source
    
    Args:
        query: Search query
        source: Source API to use ("pexels" or "unsplash")
        per_page: Number of images to return per page
        orientation: Image orientation
    
    Returns:
        List of image objects
    """
    if source.lower() == "unsplash":
        return search_unsplash(query, per_page, orientation)
    else:  # default to pexels
        return search_pexels(query, per_page, orientation)

def find_and_remove_duplicates():
    """
    Find and remove duplicate images in the database
    
    Returns:
        Number of duplicates removed
    """
    try:
        print("Checking for duplicate images in the database...")
        
        # Get all images
        response = supabase.table(DB_TABLE_NAME).select('*').execute()
        all_images = response.data
        
        if not all_images:
            print("No images found in the database.")
            return 0
            
        print(f"Found {len(all_images)} total images.")
        
        # Group by tour_id
        tours = {}
        for image in all_images:
            tour_id = image['tour_id']
            if tour_id not in tours:
                tours[tour_id] = []
            tours[tour_id].append(image)
        
        # Track duplicates
        duplicates = []
        processed_urls = set()
        
        # Check each tour
        for tour_id, images in tours.items():
            print(f"Checking tour {tour_id} with {len(images)} images...")
            
            # Check for exact URL duplicates
            tour_duplicates = []
            for image in images:
                url = image['image_url']
                if url in processed_urls:
                    tour_duplicates.append(image)
                else:
                    processed_urls.add(url)
            
            if tour_duplicates:
                print(f"Found {len(tour_duplicates)} duplicates in tour {tour_id}")
                duplicates.extend(tour_duplicates)
        
        # Remove duplicates
        if duplicates:
            print(f"Removing {len(duplicates)} duplicate images...")
            for duplicate in duplicates:
                # Delete from database
                supabase.table(DB_TABLE_NAME).delete().eq('id', duplicate['id']).execute()
                
                # Try to delete from storage
                try:
                    image_url = duplicate.get('image_url', '')
                    if image_url:
                        # Extract path from URL (including tour_id subfolder)
                        path_parts = image_url.split(f"{STORAGE_BUCKET}/")[1].split('?')[0].split('#')[0]
                        if path_parts:
                            # Delete from storage
                            supabase.storage.from_(STORAGE_BUCKET).remove([path_parts])
                except Exception as e:
                    print(f"Warning: Could not delete file from storage: {e}")
            
            print(f"Successfully removed {len(duplicates)} duplicate images.")
            return len(duplicates)
        else:
            print("No duplicates found.")
            return 0
            
    except Exception as e:
        print(f"Error finding and removing duplicates: {e}")
        return 0

def main():
    """
    Main function
    """
    parser = argparse.ArgumentParser(description='Enhanced image search and processing')
    parser.add_argument('--tour-id', type=str, help='Specific tour ID to process')
    parser.add_argument('--min-score', type=float, default=7.0, help='Minimum validation score (default: 7.0)')
    parser.add_argument('--min-images', type=int, default=6, help='Minimum number of images per tour (default: 6)')
    parser.add_argument('--source', type=str, default='pexels', choices=['pexels', 'unsplash'], 
                        help='Image source API to use (default: pexels)')
    parser.add_argument('--override', action='store_true', 
                        help='Override existing images for tours')
    parser.add_argument('--clean-duplicates', action='store_true',
                        help='Find and remove duplicate images in the database')
    args = parser.parse_args()
    
    # If clean-duplicates is specified, just do that and exit
    if args.clean_duplicates:
        num_removed = find_and_remove_duplicates()
        print(f"Removed {num_removed} duplicate images.")
        return
    
    print("=" * 80)
    print(f"Enhanced Image Search and Processing")
    print(f"Image source: {args.source}")
    print(f"Minimum score: {args.min_score}")
    print(f"Minimum images per tour: {args.min_images}")
    print(f"Override existing images: {args.override}")
    if args.tour_id:
        print(f"Processing specific tour ID: {args.tour_id}")
    print("=" * 80)
    
    # Get tours from Supabase
    tours = get_tours_from_supabase(args.tour_id)
    
    if not tours:
        print("No tours found to process")
        return
    
    # Track all results for CSV generation
    all_results = []
    
    # Process each tour
    for tour in tours:
        try:
            # Check if the tour already has images
            existing_images = check_existing_images(tour['id'])
            
            if existing_images and not args.override:
                print(f"Tour {tour['name']} (ID: {tour['id']}) already has {len(existing_images)} images. Skipping.")
                print(f"Use --override to process this tour anyway.")
                continue
            
            # If override is set and there are existing images, delete them
            if existing_images and args.override:
                print(f"Deleting {len(existing_images)} existing images for tour {tour['name']} (ID: {tour['id']})")
                delete_existing_images(tour['id'])
            
            result = process_tour(
                tour_id=tour['id'],
                tour_name=tour['name'],
                tour_summary=tour.get('summary'),
                min_score=args.min_score,
                min_images=args.min_images,
                source=args.source
            )
            all_results.append(result)
        except Exception as e:
            print(f"Error processing tour {tour['name']}: {e}")
            continue
    
    # Save results to CSV
    if all_results:
        csv_file = save_results_to_csv(all_results, args.source)
        print(f"\nAll tours processed. Results saved to {csv_file}")
    else:
        print("\nNo tours were processed. No results to save.")

def check_existing_images(tour_id):
    """
    Check if a tour already has images
    
    Args:
        tour_id: ID of the tour
    
    Returns:
        List of existing images or empty list if none
    """
    try:
        response = supabase.table(DB_TABLE_NAME).select('*').eq('tour_id', tour_id).execute()
        return response.data
    except Exception as e:
        print(f"Error checking existing images: {e}")
        return []

def delete_existing_images(tour_id):
    """
    Delete existing images for a tour
    
    Args:
        tour_id: ID of the tour
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # First get the existing images to get their URLs
        existing_images = check_existing_images(tour_id)
        
        if not existing_images:
            return True
        
        # Delete from the database
        response = supabase.table(DB_TABLE_NAME).delete().eq('tour_id', tour_id).execute()
        
        # Try to delete from storage as well
        # Extract filenames from URLs
        for image in existing_images:
            try:
                image_url = image.get('image_url', '')
                if image_url:
                    # Extract path from URL (including tour_id subfolder)
                    path_parts = image_url.split(f"{STORAGE_BUCKET}/")[1].split('?')[0].split('#')[0]
                    if path_parts:
                        # Delete from storage
                        supabase.storage.from_(STORAGE_BUCKET).remove([path_parts])
            except Exception as e:
                print(f"Warning: Could not delete file from storage: {e}")
        
        print(f"Successfully deleted {len(existing_images)} images for tour {tour_id}")
        return True
    except Exception as e:
        print(f"Error deleting existing images: {e}")
        return False

if __name__ == "__main__":
    main()