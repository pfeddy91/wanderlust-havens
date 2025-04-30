import os
import time
import requests
import base64
import json
from typing import List, Dict, Optional
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter
import google.generativeai as genai
from supabase import create_client

# Supabase credentials (ensure these are correct)
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent'
PEXELS_API_KEY = "2nTDyWqcjwBRUWzyi2mpWlbqKHAy4xxAHuRbSHtA38kCOfoNQbDeOoye"
FORCE_UPDATE = True  # Set to True to update images that already exist

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Pexels API
PEXELS_HEADERS = {"Authorization": PEXELS_API_KEY}

# Storage bucket for country images
BUCKET_NAME = "country-image"  # Using your existing bucket name

def call_gemini_api(prompt, image_data=None):
    """
    Call the Gemini API with a prompt and optional image
    
    Args:
        prompt: The prompt to send to Gemini
        image_data: Optional image data in bytes
    
    Returns:
        The response content from Gemini
    """
    url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    if image_data:
        # Convert image to base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64
                        }
                    }
                ]
            }]
        }
    else:
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        if "candidates" in result and len(result["candidates"]) > 0:
            if "content" in result["candidates"][0] and "parts" in result["candidates"][0]["content"]:
                parts = result["candidates"][0]["content"]["parts"]
                if parts and "text" in parts[0]:
                    return parts[0]["text"].strip()
        
        print(f"Unexpected Gemini API response format: {result}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error calling Gemini API: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding Gemini API response: {e}")
        print(f"Raw response: {response.text}")
        return response.text.strip() if response.text else None


def get_all_countries() -> List[Dict]:
    """Fetch all countries from the database"""
    response = supabase.table("countries").select("id, name, featured_image").execute()
    return response.data


def generate_search_term(country_name: str, previous_terms: List[str] = None) -> str:
    """Generate an optimal search term for a country using Gemini"""
    previous_terms = previous_terms or []
    
    # Build a prompt that excludes previous terms
    exclusion_text = ""
    if previous_terms:
        exclusion_text = f"\nIMPORTANT: Do NOT suggest any of these previously tried terms that didn't work well: {', '.join(previous_terms)}."
    
    prompt = f"""
    I need a search term to find a stunning, high-quality cover photo for {country_name} 
    for a luxury travel website. The image should showcase the {country_name}'s natural beauty, 
    iconic landmarks, or unique cultural elements that would appeal to affluent travelers.
    
    Please provide just a single search term (max 3 words) without any explanation.
    Please use either generic searches like 'Jamaica Beautiful' or 'Jamaica Beach' or 
    specific landmarks for famous places like 'Eiffel Tower' for France or 'Colosseum' for Italy or 'Taj Mahal' for India.
    Don't be too specific but keep it high level. Eg Colombia Coffee Region is too specific.
    Please give the most likely item folks are going to {country_name} on vacation for. 
    For example, for Jamaica, it would be 'Beach'. For India, it would be 'Taj Mahal'. For Namibia, it would be 'Safari' or 'Skeleton Coast'.{exclusion_text}
    """
    
    search_term = call_gemini_api(prompt)
    if not search_term:
        # Fallback to a basic search term
        search_term = f"{country_name} landscape luxury travel"
    
    print(f"Generated search term for {country_name}: '{search_term}'")
    return search_term


def search_pexels_images(search_term: str, per_page: int = 3) -> List[Dict]:
    """Search for images on Pexels API"""
    url = f"https://api.pexels.com/v1/search?query={search_term}&per_page={per_page}&orientation=landscape"
    
    print(f"Sending request to Pexels API with query: '{search_term}'")
    
    try:
        response = requests.get(url, headers=PEXELS_HEADERS)
        response.raise_for_status()
        data = response.json()
        photos = data.get("photos", [])
        
        print(f"Pexels returned {len(photos)} images:")
        for i, photo in enumerate(photos):  # Show all images
            print(f"  Image {i+1}: {photo['src']['original']}")
        
        return photos
    except Exception as e:
        print(f"Error searching Pexels: {e}")
        return []


def evaluate_image_quality(image_url: str, country_name: str) -> float:
    """Evaluate image quality using Gemini Vision"""
    try:
        # Download the image
        response = requests.get(image_url)
        response.raise_for_status()
        image_data = response.content
        
        prompt = f"""
        Rate this image as a cover photo for {country_name} on a luxury travel website.
        
        Evaluate on these criteria:
        1. Representation of {country_name}'s beauty or iconic elements. 
        For example, a picture of Taj Mahal is good for India. Or a picture of a giraffe is good for Namibia. Or a picture of the Tour Eiffel is good for France.
        For destinations famous for beaches, you can use beach or sealife or nature. and so on.
        2. Suitability for a beautiful luxury travel website
        3. It is ok to have people in the picture, but they should be incidental and not the main subject.
        
        Provide a single numerical rating from 1-10 (with one decimal place precision).
        Only respond with the numerical rating, nothing else.
        """
        
        result = call_gemini_api(prompt, image_data)
        
        if not result:
            print(f"No valid response from Gemini for image evaluation")
            return 0.0
        
        try:
            # Try to extract just the number from the response
            rating = float(''.join(c for c in result if c.isdigit() or c == '.'))
            print(f"Image for {country_name} rated: {rating}/10")
            return rating
        except ValueError:
            print(f"Could not parse rating from response: '{result}'")
            return 0.0
            
    except Exception as e:
        print(f"Error evaluating image: {e}")
        return 0.0

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
        return output.getvalue()


def upload_image_to_storage(image_data: bytes, country_name: str) -> Optional[str]:
    """Upload processed image to Supabase storage and return the public URL"""
    # Create a safe filename
    safe_name = country_name.lower().replace(" ", "_").replace("'", "").replace(",", "")
    timestamp = int(time.time())
    filename = f"{safe_name}_{timestamp}.jpg"
    
    # Upload to Supabase storage
    try:
        upload_response = supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=image_data,
            file_options={"content-type": "image/jpeg"}
        )
        
        # Get the public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        print(f"Uploaded image for {country_name} to {public_url}")
        
        return public_url
    except Exception as upload_error:
        print(f"Error uploading to storage: {upload_error}")
        return None


def update_country_image(country_id: str, image_url: str) -> bool:
    """Update the country record with the new image URL"""
    try:
        response = supabase.table("countries").update({
            "featured_image": image_url
        }).eq("id", country_id).execute()
        
        print(f"Updated country {country_id} with new image URL")
        return True
    except Exception as e:
        print(f"Error updating country: {e}")
        return False


def process_country(country: Dict, attempt: int = 1, previous_terms: List[str] = None) -> bool:
    """Process a single country to find and update its image"""
    country_id = country["id"]
    country_name = country["name"]
    previous_terms = previous_terms or []
    
    # Skip processing for "Multi-Country"
    if country_name == "Multi-Country":
        print(f"Skipping processing for {country_name}")
        return False

    print(f"\n{'='*50}")
    print(f"Processing {country_name} (Attempt {attempt})")
    print(f"{'='*50}")
    
    # Skip if already has an image and force_update is False
    if country.get("featured_image") and not FORCE_UPDATE:
        print(f"{country_name} already has an image. Skipping.")
        return False

    # Step 1: Generate search term (excluding previous terms)
    search_term = generate_search_term(country_name, previous_terms)
    
    # Add this term to the list of tried terms
    previous_terms.append(search_term)
    
    # Step 2: Search for images
    photos = search_pexels_images(search_term)
    if not photos:
        print(f"No photos found for {country_name} with search term '{search_term}'")
        if attempt < 5:  # Limit to 5 attempts to prevent infinite loops
            print(f"Retrying with a new search term (attempt {attempt+1})...")
            return process_country(country, attempt + 1, previous_terms)
        else:
            print(f"Reached maximum attempts for {country_name}. Giving up.")
        return False

    # Step 3: Evaluate top images
    evaluated_photos = []
    for i, photo in enumerate(photos):  # Evaluate all 3 photos
        print(f"Evaluating image {i+1}/3 for {country_name}...")
        rating = evaluate_image_quality(photo["src"]["original"], country_name)
        
        evaluated_photos.append({
            "photo": photo,
            "rating": rating
        })
        
        print(f"Image {i+1} score: {rating}/10")
    
    # Filter for high-quality images (7+)
    high_quality_photos = [p for p in evaluated_photos if p["rating"] >= 7]
    
    # Sort by rating
    high_quality_photos.sort(key=lambda x: x["rating"], reverse=True)
    
    if not high_quality_photos:
        print(f"No images met the quality criteria (score >= 7) for search term '{search_term}'")
        if attempt < 5:  # Limit to 5 attempts
            print(f"Retrying with a new search term (attempt {attempt+1})...")
            return process_country(country, attempt + 1, previous_terms)
        else:
            print(f"Reached maximum attempts for {country_name}. Giving up.")
        return False

    # Get the best photo
    best_photo = high_quality_photos[0]["photo"]
    best_rating = high_quality_photos[0]["rating"]
    print(f"Selected best image for {country_name} with rating {best_rating}/10")
    
    # Step 4: Download and post-process the image
    response = requests.get(best_photo["src"]["original"])
    response.raise_for_status()
    processed_image_data = post_process_image(response.content)
    
    # Step 5: Upload to storage
    image_url = upload_image_to_storage(processed_image_data, country_name)
    if not image_url:
        return False

    # Step 6: Update country record
    success = update_country_image(country_id, image_url)
    
    if success:
        print(f"Successfully updated {country_name} with new image URL")
    else:
        print(f"Failed to update {country_name}")
    
    return success


def main():
    """Main function to process all countries"""
    # Get all countries
    countries = get_all_countries()
    print(f"Found {len(countries)} countries in database")
    
    # Process each country
    success_count = 0
    for country in countries:
        if process_country(country):
            success_count += 1
            print(f"Successfully processed {country['name']}")
        else:
            print(f"Failed to process {country['name']}")
        
        # Add a small delay to avoid rate limits
        time.sleep(1)
    
    print(f"\nProcessed {len(countries)} countries, updated {success_count} images successfully")


if __name__ == "__main__":
    main()