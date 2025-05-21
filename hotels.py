import os
import requests
import time
import json
import logging
from supabase import create_client, Client
import re
import argparse
import csv # Added for CSV output
import uuid
from io import BytesIO # <<< Added import

# --- CONFIGURATION ---
# Using the keys and URLs you provided
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent'

# Google Places API Key
GOOGLE_PLACES_API_KEY = "AIzaSyDJM5cxN5GBULkR-cUA22NYYPYRSAT8qrM"

SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0" # Anon key, as per your file. For backend modifications, service_role would be needed.

# Google Places API (New) Base URLs
GOOGLE_PLACES_API_BASE_URL_V1 = "https://places.googleapis.com/v1"

# New: Supabase Storage bucket for hotel images
HOTEL_IMAGES_STORAGE_BUCKET = "hotel-images"

# --- LOGGING SETUP ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(module)s - %(funcName)s - %(message)s',
    handlers=[
        logging.FileHandler("hotel_enrichment.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- INITIALIZE CLIENTS ---
# Supabase client initialization is kept, though not used if --city is provided
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Supabase client initialized.")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    supabase = None # type: ignore

# --- GEMINI API FUNCTION (adapted from generate_tour_images.py) ---
def call_gemini_api(prompt, max_retries=3, initial_timeout=60):
    """
    Call the Gemini API with a prompt and retry logic.
    """
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_PLACEHOLDER": # Generic placeholder check
        logger.error("Gemini API key is not configured properly.")
        return None

    url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    
    last_error_status = None

    for attempt in range(max_retries):
        try:
            if attempt > 0:
                delay_seconds = (5 * (2 ** attempt)) # Exponential backoff
                logger.info(f"Previous Gemini attempt failed (status: {last_error_status}). Waiting {delay_seconds}s before retry {attempt + 1}/{max_retries}...")
                time.sleep(delay_seconds)
            
            current_timeout = initial_timeout * (2 ** attempt)
            logger.info(f"Calling Gemini API. Attempt {attempt + 1}/{max_retries}. Timeout: {current_timeout}s.")
            
            response = requests.post(url, headers=headers, json=payload, timeout=current_timeout)
            last_error_status = response.status_code
            
            if response.ok:
                result = response.json()
                if 'candidates' in result and result['candidates'] and 'content' in result['candidates'][0]:
                    content_parts = result['candidates'][0]['content']['parts']
                    content = ''.join([part.get('text', '') for part in content_parts if 'text' in part])
                    logger.info(f"Successfully received response from Gemini API on attempt {attempt + 1}")
                    return content
                else:
                    logger.error(f"Unexpected response format from Gemini API on attempt {attempt + 1}: {json.dumps(result, indent=2)}")
                    if attempt < max_retries - 1: continue
                    return None
            elif response.status_code == 429: # Rate limit
                logger.warning(f"Gemini API rate limit (429) on attempt {attempt + 1}/{max_retries}.")
            else:
                logger.error(f"Gemini API HTTP error {response.status_code} on attempt {attempt + 1}/{max_retries}: {response.text[:500]}")

            if attempt == max_retries - 1: # Last attempt failed
                logger.error(f"Gemini API failed after {max_retries} attempts with status {last_error_status}.")
                return None

        except requests.Timeout:
            logger.error(f"Request to Gemini timed out after {current_timeout}s on attempt {attempt + 1}/{max_retries}")
            last_error_status = "TIMEOUT"
        except requests.ConnectionError as e:
            logger.error(f"Gemini connection error on attempt {attempt + 1}/{max_retries}: {e}")
            last_error_status = "CONNECTION_ERROR"
        except Exception as e:
            logger.error(f"Unexpected error in call_gemini_api attempt {attempt + 1}/{max_retries}: {e}")
            last_error_status = "UNEXPECTED_ERROR"
            
    return None

# --- SUPABASE FUNCTIONS ---
def get_tour_locations_from_supabase(tour_id: str):
    """
    Fetches location names for a given tour_id from the 'tour_locations' table.
    (This function remains but might not be called if --city is used)
    """
    if not supabase:
        logger.error("Supabase client not available.")
        return []
    try:
        response = supabase.table('tour_locations').select('name').eq('tour_id', tour_id).execute()
        if response.data:
            location_names = [loc['name'] for loc in response.data if 'name' in loc]
            logger.info(f"Found {len(location_names)} locations for tour_id {tour_id}: {location_names}")
            return location_names
        else:
            logger.warning(f"No locations found for tour_id {tour_id}. Response: {response}")
            return []
    except Exception as e:
        logger.error(f"Error fetching tour locations from Supabase for tour_id {tour_id}: {e}")
        return []

# --- GEMINI HOTEL SUGGESTION FUNCTION ---
def get_luxury_hotels_from_gemini(location_name: str):
    """
    Calls Gemini API to get luxury hotel suggestions for a location.
    """
    prompt = f"""
You are a luxury hotel advisor specialised in honeymoon travel. You are sophisticated, young and fun. You travel the world and get inspiration from places like conde nast traveler, Travel + Leisure (T+L) or Monocle.

You have 2 consecutive tasks:
1. Categorise '{location_name}' into 2 buckets: 'tier 1 touristy' or 'tier 2 touristy'. This is based on how much tourism infrastructure and demand there is.
2. For the location '{location_name}', recommend your favourite 7 hotels in the city if it's tier 1 touristy, or 4 hotels if it's tier 2 touristy.

Keep in mind: 
- Examples of tier 1 touristy locations: Paris, Rome, London, Barcelona, Venice, Florence, Rome, New York, London, etc.
- Examples of tier 2 touristy locations: Maldives, Bora Bora, Siena, Épernay, Uluwatu, etc.
- Please provide a wide selection of hotels, including some traditional luxury hotels, some boutique hotels, some nice 'affordable luxury' options too (ie less than 500 EUR per night and 4 stars). 
- Considering it's a honeymoon, try to prioritise hotels with views, pools, SPA's, or other romantic features.

Please provide your response ONLY as a JSON list of objects. Each object must have the following keys:
- "name": string (the hotel name)
- "address": string (the full street address, be as specific as possible)
- "latitude": float (the geographical latitude)
- "longitude": float (the geographical longitude)

Example for one hotel:
{{
  "name": "The St. Regis Venice",
  "address": "San Marco 2159, Venice, 30124 Italy",
  "latitude": 45.43194,
  "longitude": 12.33698
}}

Provide just the JSON list, no other introductory text or explanations.
"""
    logger.info(f"Requesting luxury hotel suggestions from Gemini for: {location_name}")
    response_text = call_gemini_api(prompt)

    if not response_text:
        logger.error(f"No response or failed to get response from Gemini for {location_name}.")
        return []

    try:
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```|(\[[\s\S]*\])|(\{[\s\S]*\})', response_text, re.DOTALL)
        if json_match:
            json_str = next(s for s in json_match.groups() if s is not None)
            hotels = json.loads(json_str)
            if isinstance(hotels, list):
                logger.info(f"Gemini suggested {len(hotels)} hotels for {location_name}:")
                for i, hotel in enumerate(hotels):
                    logger.info(f"  {i+1}. Name: {hotel.get('name')}, Address: {hotel.get('address')}, Lat: {hotel.get('latitude')}, Lon: {hotel.get('longitude')}")
                valid_hotels = []
                for hotel in hotels:
                    if isinstance(hotel, dict) and \
                       all(k in hotel for k in ["name", "address", "latitude", "longitude"]) and \
                       isinstance(hotel["name"], str) and \
                       isinstance(hotel["address"], str) and \
                       isinstance(hotel["latitude"], (int, float)) and \
                       isinstance(hotel["longitude"], (int, float)):
                        valid_hotels.append(hotel)
                    else:
                        logger.warning(f"Gemini provided an invalid hotel structure for {location_name}: {hotel}")
                return valid_hotels
            else:
                logger.error(f"Gemini response for {location_name} was valid JSON but not a list: {type(hotels)}")
                return []
        else:
            logger.error(f"Could not find valid JSON in Gemini response for {location_name}. Response: {response_text[:500]}")
            return []
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON from Gemini response for {location_name}: {e}. Response text: {response_text[:500]}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error processing Gemini hotel suggestions for {location_name}: {e}")
        return []

# --- GOOGLE PLACES API FUNCTIONS (NEW) ---
def find_google_place(hotel_name: str, city: str, bias_lat=None, bias_lng=None, radius_meters=1000):
    """
    Finds a place on Google using Text Search (New) and returns its ID and photo metadata.
    Uses provided lat/lng for location biasing if available.
    """
    if not GOOGLE_PLACES_API_KEY:
        logger.error("Google Places API key is not configured.")
        return None, []

    url = f"{GOOGLE_PLACES_API_BASE_URL_V1}/places:searchText"
    text_query = f"{hotel_name}, {city}"
    
    payload = {
        "textQuery": text_query,
        "maxResultCount": 1 # We typically want the top match for a specific hotel
    }

    # Add location bias if lat/lng from Tripadvisor is available
    if bias_lat is not None and bias_lng is not None:
        payload["locationBias"] = {
            "circle": {
                "center": {"latitude": bias_lat, "longitude": bias_lng},
                "radius": float(radius_meters) 
            }
        }
        logger.info(f"Using location bias for Google Places search: lat={bias_lat}, lng={bias_lng}, radius={radius_meters}m")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        # Request specific fields to get place ID and photo metadata
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.photos"
    }

    try:
        logger.info(f"Searching Google Places for: '{text_query}'")
        response = requests.post(url, json=payload, headers=headers, timeout=20)
        response.raise_for_status()
        data = response.json()

        if data.get("places") and isinstance(data["places"], list) and len(data["places"]) > 0:
            place_result = data["places"][0] # Take the first (hopefully best) match
            place_id = place_result.get("id")
            google_place_name = place_result.get("displayName", {}).get("text", "Unknown Name")
            google_place_address = place_result.get("formattedAddress", "Unknown Address")
            photos_metadata = place_result.get("photos", []) # This will be a list of photo objects

            logger.info(f"Google Places found: '{google_place_name}' (ID: {place_id}, Address: {google_place_address}) for query '{text_query}'. Found {len(photos_metadata)} photo references.")
            return place_id, photos_metadata
        else:
            logger.warning(f"No results or unexpected format from Google Places for '{text_query}'. Response: {data}")
            return None, []

    except requests.exceptions.HTTPError as e:
        logger.error(f"Google Places API HTTP error for '{text_query}': {e.response.status_code} - {e.response.text}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Google Places API request error for '{text_query}': {e}")
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from Google Places for '{text_query}': {e}")
    except Exception as e:
        logger.error(f"Unexpected error during Google Places search for '{text_query}': {e}")
    return None, []

def get_google_photo_urls(photos_metadata_list, num_photos_to_fetch=10, max_height_px=1600, max_width_px=1600):
    """
    Constructs direct photo URLs from Google Places photo metadata.
    Each item in photos_metadata_list should be an object with a 'name' field (photo resource name).
    """
    if not GOOGLE_PLACES_API_KEY:
        logger.error("Google Places API key is not configured for fetching photo URLs.")
        return []

    photo_urls = []
    if not photos_metadata_list:
        return []

    logger.info(f"Attempting to fetch URLs for up to {min(num_photos_to_fetch, len(photos_metadata_list))} Google Photos.")

    for i, photo_meta in enumerate(photos_metadata_list):
        if len(photo_urls) >= num_photos_to_fetch:
            break # Reached the desired number of photos

        photo_resource_name = photo_meta.get("name")
        if not photo_resource_name:
            logger.warning(f"Missing 'name' (photo resource name) in photo metadata item: {photo_meta}")
            continue

        # Construct the URL to get the photo's direct URI
        # Example photo_resource_name: places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AUac...
        media_url = f"{GOOGLE_PLACES_API_BASE_URL_V1}/{photo_resource_name}/media"
        
        params = {
            "key": GOOGLE_PLACES_API_KEY,
            "maxHeightPx": max_height_px,
            "maxWidthPx": max_width_px,
            "skipHttpRedirect": "true" # Crucial to get the JSON response with photoUri
        }
        
        try:
            # logger.debug(f"Requesting Google Photo URI for resource: {photo_resource_name}")
            response = requests.get(media_url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            if data.get("photoUri"):
                photo_urls.append(data["photoUri"])
                # logger.debug(f"  Successfully fetched Google Photo URI: {data['photoUri']}")
            else:
                logger.warning(f"  Google Photo media response missing 'photoUri' for resource {photo_resource_name}. Response: {data}")
            
            time.sleep(0.2) # Small delay between photo URI requests

        except requests.exceptions.HTTPError as e:
            logger.error(f"  Google Photo media HTTP error for {photo_resource_name}: {e.response.status_code} - {e.response.text}")
        except requests.exceptions.RequestException as e:
            logger.error(f"  Google Photo media request error for {photo_resource_name}: {e}")
        except json.JSONDecodeError as e:
            logger.error(f"  Error decoding JSON from Google Photo media for {photo_resource_name}: {e}")
        except Exception as e:
            logger.error(f"  Unexpected error fetching Google Photo URI for {photo_resource_name}: {e}")
            
    logger.info(f"Successfully constructed {len(photo_urls)} Google Photo URLs.")
    return photo_urls

def get_google_place_details(place_id: str):
    """
    Fetches specific details for a Google Place using its place_id.
    """
    if not GOOGLE_PLACES_API_KEY:
        logger.error("Google Places API key is not configured for Place Details.")
        return None

    url = f"{GOOGLE_PLACES_API_BASE_URL_V1}/places/{place_id}"
    
    # Define the fields to request
    # displayName, formattedAddress, primaryTypeDisplayName are also fetched by find_google_place if needed
    # but getting them here ensures consistency from the Place Details endpoint.
    fields = "id,name,displayName,formattedAddress,shortFormattedAddress,location,googleMapsUri,priceLevel,rating,userRatingCount,websiteUri"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": fields
    }

    try:
        logger.info(f"Fetching Google Place Details for place_id: {place_id}")
        response = requests.get(url, headers=headers, timeout=20) # GET request for Place Details
        response.raise_for_status()
        details = response.json()
        logger.info(f"Successfully fetched Google Place Details for place_id: {place_id}")
        return details
    except requests.exceptions.HTTPError as e:
        logger.error(f"Google Place Details API HTTP error for {place_id}: {e.response.status_code} - {e.response.text}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Google Place Details API request error for {place_id}: {e}")
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from Google Place Details for {place_id}: {e}")
    except Exception as e:
        logger.error(f"Unexpected error fetching Google Place Details for {place_id}: {e}")
    return None


# --- GEMINI HOTEL NARRATIVES FUNCTION (NEW) ---
def get_gemini_hotel_narratives(hotel_name: str, location_name: str, google_place_data: dict = None):
    """
    Calls Gemini API to generate various narrative descriptions for a hotel.
    """
    if google_place_data is None:
        google_place_data = {}

    prompt = f"""
You are a luxury travel copywriter crafting compelling descriptions for a high-end honeymoon travel agency.
For the hotel "{hotel_name}" located in "{location_name}", and using the following available information:
- Google Display Name: {google_place_data.get("GooglePlaceDisplayName", "N/A")}
- Address: {google_place_data.get("GooglePlaceFormattedAddress", "N/A")}
- Rating: {google_place_data.get("GooglePlaceRating", "N/A")}
- Website: {google_place_data.get("GooglePlaceWebsiteURI", "N/A")}

Please generate the following content. Provide your response ONLY as a single JSON object with the exact keys "short_summary", "longer_summary", "location_description", "rationale", "price_range" and "top_tip".

1.  "short_summary": A catchy and evocative summary of the hotel (max 70 words).
    Example: "Set on a beautiful beach overlooking the Ionian Sea, The Romanos, a Luxury Collection Resort offers luxury accommodation with a great selection of room choices, fantastic watersports, activities and Spa."

2.  "longer_summary": A more detailed summary of the hotel (between 70 to 150 words), different in style and content from the short_summary.
    Example: "The first Six Senses hotel to open in Italy, Six Senses Rome is a wellness oasis amid the hustle and bustle of Italy's breath-taking capital; offering guests blissful relaxation and mesmerising city views. Blending historical Roman classicism with modern touches, the hotel boasts beautifully designed rooms and suites, a sensory-rich spa with its own set of Roman baths, an elegant piazza-style restaurant, and a rooftop terrace perfect for yoga at sunrise or an aperitivo beneath the stars."

3.  "location_description": A description of the hotel's location and surroundings (between 70 to 150 words).
    Example: "At the heart of the 'Eternal City', Six Senses Rome is a beautifully restored 18th-century UNESCO-listed palazzo, situated in the picturesque Piazza di San Marcello. Located just a few steps from renowned historic landmarks such as the Pantheon and Trevi Fountain, from here you'll be perfectly placed to explore the city's many artistic and architectural wonders. Here, everything is at your fingertips. Tucked-away trattorias, ancient treasures, and dazzling panoramas."

4.  "rationale": A brief explanation of why this hotel is an excellent choice for an epic honeymoon (not too cheesy). Format it as an answer to the question "Why we like it?"
    Example: "Hotel de Russie masterfully combines an unbeatable Roman location, nestled between the Spanish Steps and Piazza del Popolo, with the rare magic of its tranquil "Secret Garden" – an idyllic oasis perfect for romantic moments. This iconic hotel offers a sophisticated blend of classic elegance and vibrant modern luxury, from its beautifully appointed rooms to the chic Stravinskij Bar and refined dining at Le Jardin de Russie. With Rocco Forte's renowned attentive service ensuring a seamless experience, it's an effortlessly stylish and quintessentially Roman setting for an unforgettable honeymoon."

5.  "top_tip": A concise insider tip or hidden gem about the hotel (e.g., a specific dish, spa treatment, room type, unique feature).
    Example: "For a sensational seafood feast in a spectacular setting - head down to the beach for 'a bit of everything' lunch at Barbouni." OR "We highly recommend you book a room with ocean view." OR "The property has a stunning tennis court for the tennis lovers out there."

6.  "price_range": A description of the price range of the hotel. You have to choose among 3 options:
    - "Chic & Boutique": 3-4 stars, price range of around 100 to 500 EUR per night
    - "Classic Luxury": +4 stars, price range of around 500 to 1000 EUR per night
    - "Ultimate Indulgence": 5 stars, price range of around 1000 to 2000 EUR per night

Provide ONLY the JSON object.
"""
    logger.info(f"Requesting narrative descriptions from Gemini for hotel: {hotel_name} in {location_name}")
    response_text = call_gemini_api(prompt)

    narratives = {
        "short_summary": "",
        "longer_summary": "",
        "location_description": "",
        "rationale": "",
        "top_tip": "",
        "price_range": ""
    }

    if not response_text:
        logger.error(f"No response or failed to get response from Gemini for narratives of {hotel_name}.")
        return narratives

    try:
        # Try to find JSON within backticks or as a direct object
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})(?=\s*$)', response_text, re.DOTALL)
        if json_match:
            json_str = next(s for s in json_match.groups() if s is not None)
            parsed_json = json.loads(json_str)
            
            if isinstance(parsed_json, dict):
                narratives["short_summary"] = parsed_json.get("short_summary", "")
                narratives["longer_summary"] = parsed_json.get("longer_summary", "")
                narratives["location_description"] = parsed_json.get("location_description", "")
                narratives["rationale"] = parsed_json.get("rationale", "")
                narratives["top_tip"] = parsed_json.get("top_tip", "")
                narratives["price_range"] = parsed_json.get("price_range", "")
                logger.info(f"Successfully parsed narrative descriptions from Gemini for {hotel_name}.")
                if not all(k in parsed_json for k in narratives.keys()):
                     logger.warning(f"Gemini narratives for {hotel_name} might be missing some fields. Expected: {list(narratives.keys())}, Got: {list(parsed_json.keys())}")
                elif not all(parsed_json.get(k) for k in narratives.keys()): # Check if any field is empty
                    logger.warning(f"Gemini narratives for {hotel_name} has one or more empty fields: {parsed_json}")
            else:
                logger.error(f"Gemini response for {hotel_name} narratives was valid JSON but not a dictionary: {type(parsed_json)}")
        else:
            logger.error(f"Could not find valid JSON in Gemini narrative response for {hotel_name}. Response: {response_text[:500]}")
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON from Gemini narrative response for {hotel_name}: {e}. Response text: {response_text[:500]}")
    except Exception as e:
        logger.error(f"Unexpected error processing Gemini narratives for {hotel_name}: {e}")
    
    return narratives

# --- IMAGE PROCESSING AND UPLOAD FUNCTIONS ---
def slugify(text: str) -> str:
    """
    Converts text to a URL-friendly slug.
    Example: "Hotel Name!" -> "hotel_name"
    """
    text = re.sub(r'[^\w\s-]', '', text.lower()) # Remove special chars except hyphens and spaces
    text = re.sub(r'[-\s]+', '_', text).strip('_') # Replace spaces/hyphens with underscore
    return text

def post_process_hotel_image(image_data: bytes) -> bytes:
    # Placeholder for actual image processing (e.g., with PIL/Pillow)
    # For now, it just returns the data Veränderung.
    # You might want to add resizing, compression, or filters here.
    logger.info("      (Placeholder) Post-processing image data.")
    # Example with Pillow (ensure Pillow is installed: pip install Pillow)
    # from PIL import Image
    # try:
    #     img = Image.open(BytesIO(image_data))
    #     # img = img.resize((1200, 800)) # Example resize
    #     # img = img.convert("RGB") # Ensure JPG format
    #     buffer = BytesIO()
    #     img.save(buffer, format="JPEG", quality=85) # Example save with quality
    #     return buffer.getvalue()
    # except Exception as e:
    #     logger.error(f"      Error during image post-processing: {e}")
    return image_data

def upload_image_to_supabase_hotel_bucket(image_data: bytes, filename: str, supabase_client: Client):
    """
    Uploads image data to the specified Supabase Storage bucket and returns its public URL.
    """
    if not supabase_client:
        logger.error("      Supabase client not available for image upload.")
        return None
    if not image_data:
        logger.error("      Image data is empty, cannot upload.")
        return None

    try:
        logger.info(f"      Attempting to upload '{filename}' to bucket '{HOTEL_IMAGES_STORAGE_BUCKET}'. Size: {len(image_data)} bytes.")
        
        # Use raw image_data (bytes) directly
        response = supabase_client.storage.from_(HOTEL_IMAGES_STORAGE_BUCKET).upload(
            path=filename,
            file=image_data, # <<< CHANGED: Pass raw bytes directly
            file_options={"content-type": "image/jpeg"} # Assuming JPEG, adjust if needed
        )
        
        # The response from upload doesn't directly contain the full URL in case of success.
        # We need to construct or get it.
        # Check if 'response' indicates success (this might vary with client versions, consult docs)
        # For supabase-py v1.x and v2.x, a successful upload doesn't raise an error and returns an object.
        # If an error occurs, it usually raises an exception handled by the except block.
        
        logger.info(f"      Successfully uploaded '{filename}' to Supabase Storage. Response path: {response.path if hasattr(response, 'path') else 'N/A'}")

        # Get the public URL
        public_url_response = supabase_client.storage.from_(HOTEL_IMAGES_STORAGE_BUCKET).get_public_url(filename)
        
        if public_url_response: # For supabase-py v2.x, this is the URL string
            logger.info(f"      Public URL for '{filename}': {public_url_response}")
            return public_url_response
        else: # For older versions or if get_public_url returns an object with a 'publicURL' attribute
            if hasattr(public_url_response, 'publicURL'):
                logger.info(f"      Public URL for '{filename}': {public_url_response.publicURL}")
                return public_url_response.publicURL
            else:
                logger.error(f"      Failed to get public URL for '{filename}' after upload. Response: {public_url_response}")
                return None

    except Exception as e:
        # More specific error handling for Supabase storage errors can be added if needed
        # e.g., from postgrest.exceptions import APIError (if applicable to storage directly)
        logger.error(f"      Error uploading '{filename}' to Supabase Storage: {e}", exc_info=True)
        return None

# --- CSV WRITING FUNCTION ---
CSV_FIELDNAMES = [
    "location",
    "name",
    "gemini_address",
    "gemini_latitude",
    "gemini_longitude",
    "GooglePlaceID",
    "GooglePlaceName_Resource",
    "GooglePlaceDisplayName",
    "GooglePlaceFormattedAddress", 
    "GooglePlaceShortFormattedAddress",
    "GooglePlaceLocation_Lat",
    "GooglePlaceLocation_Lng",
    "GooglePlaceGoogleMapsURI",
    "GooglePlaceRating",
    "GooglePlaceUserRatingCount", 
    "GooglePlaceWebsiteURI",
    "SupabaseHotelPhoto1_URL", "SupabaseHotelPhoto2_URL", "SupabaseHotelPhoto3_URL", 
    "SupabaseHotelPhoto4_URL", "SupabaseHotelPhoto5_URL", "SupabaseHotelPhoto6_URL", 
    "SupabaseHotelPhoto7_URL", "SupabaseHotelPhoto8_URL", "SupabaseHotelPhoto9_URL", 
    "SupabaseHotelPhoto10_URL",
    "GeminiShortSummary", "GeminiLongerSummary", "GeminiLocationDescription", "GeminiRationale", "GeminiTopTip",
    "GeminiPriceRange"
]

def write_hotel_data_to_csv(writer, data_row):
    """Writes a single hotel's data to the CSV file."""
    try:
        writer.writerow(data_row)
    except Exception as e:
        logger.error(f"Error writing row to CSV: {e} - Data: {data_row}")

# --- SUPABASE DATABASE INSERT FUNCTIONS (NEW) ---
def insert_hotel_into_db(hotel_payload: dict, supabase_client: Client, is_override_mode: bool = False):
    """
    Inserts or upserts hotel data into the 'hotels' table.
    If is_override_mode is True, it will attempt to upsert based on 'google_place_id'.
    Otherwise, it performs a regular insert.
    """
    try:
        if is_override_mode and hotel_payload.get("google_place_id"):
            # Upsert will insert if google_place_id doesn't exist,
            # or update if it does.
            # 'on_conflict' specifies the constraint or column(s) that cause a conflict.
            # Your constraint is named 'hotels_google_place_id_key', 
            # or you can often just specify the column name 'google_place_id'.
            logger.info(f"Attempting to UPSERT hotel: {hotel_payload.get('name')} on conflict with google_place_id.")
            response = supabase_client.table('hotels').upsert(
                hotel_payload, 
                on_conflict='google_place_id' # Use the column name for conflict resolution
            ).execute()
        else:
            logger.info(f"Attempting to INSERT hotel: {hotel_payload.get('name')}.")
            response = supabase_client.table('hotels').insert(hotel_payload).execute()

        if response.data:
            inserted_hotel_id = response.data[0]['id']
            action = "Upserted" if is_override_mode and hotel_payload.get("google_place_id") else "Inserted"
            logger.info(f"Successfully {action} hotel '{hotel_payload.get('name')}' with ID: {inserted_hotel_id}")
            return inserted_hotel_id
        else:
            # This block might be less likely to be hit with upsert if it succeeds or if the error is different.
            # The APIError for constraint violation on simple insert is handled by the except block.
            if response.error:
                logger.error(f"Error during DB operation for hotel: {response.error.message} (Code: {response.error.code})")
            else:
                logger.error(f"Failed DB operation. No data returned and no explicit error. Response: {response}")
            return None
    except Exception as e: # Catches postgrest.exceptions.APIError and others
        logger.error(f"Exception during DB operation for hotel '{hotel_payload.get('name')}': {e}", exc_info=True)
        # Specifically check for unique constraint violation if not using upsert or if upsert also has issues
        if hasattr(e, 'code') and e.code == '23505' and 'google_place_id' in str(e): # type: ignore
            logger.warning(f"Hotel with Google Place ID '{hotel_payload.get('google_place_id')}' likely already exists (and upsert was not used or failed).")
        return None

def insert_hotel_image_into_db(image_payload: dict, supabase_client: Client):
    """Inserts hotel image data into the 'hotel_images' table."""
    try:
        response = supabase_client.table('hotel_images').insert(image_payload).execute()
        if response.data:
            inserted_image_id = response.data[0]['id']
            logger.info(f"Successfully inserted hotel image for hotel_id '{image_payload.get('hotel_id')}' with URL: {image_payload.get('image_url')}")
            return inserted_image_id
        else:
            if response.error:
                logger.error(f"Error inserting hotel image into DB: {response.error.message}")
            else:
                logger.error(f"Failed to insert hotel image. No data returned. Response: {response}")
            return None
    except Exception as e:
        logger.error(f"Exception inserting hotel image into DB: {e}", exc_info=True)
        return None

# --- MAIN SCRIPT LOGIC ---
def process_location(loc_name: str, csv_writer, min_google_photos_to_fetch: int, is_override_mode: bool = False):
    """
    Processes a single location: gets hotel suggestions from Gemini,
    fetches details from Google Places, generates narratives from Gemini,
    uploads images to Supabase Storage, and inserts data into Supabase DB.
    Skips processing if hotels for this location already exist and override is not enabled.
    """
    logger.info(f"\n--- Processing Location: {loc_name} ---")

    if not is_override_mode:
        # Check if hotels for this location already exist in the DB
        try:
            if supabase:
                existing_hotels_response = supabase.table('hotels').select('id', count='exact').eq('location', loc_name).limit(1).execute()
                # Check if count is available and greater than 0
                if hasattr(existing_hotels_response, 'count') and existing_hotels_response.count and existing_hotels_response.count > 0:
                    logger.info(f"Hotels for location '{loc_name}' already exist in the database and override mode is OFF. Skipping Gemini suggestions and processing for this location.")
                    return # Skip further processing for this location
                elif existing_hotels_response.data: # Fallback for older supabase-py or if count isn't returned as expected
                    logger.info(f"Hotels for location '{loc_name}' already exist (data found) and override mode is OFF. Skipping.")
                    return
                else:
                    logger.info(f"No existing hotels found for '{loc_name}' or count is zero. Proceeding with processing.")

            else:
                logger.warning("Supabase client not available, cannot check for existing hotels. Proceeding with processing.")
        except Exception as e:
            logger.error(f"Error checking for existing hotels for location '{loc_name}': {e}. Proceeding with processing as a fallback.")
    
    gemini_suggested_hotels = get_luxury_hotels_from_gemini(loc_name)
    if not gemini_suggested_hotels:
        logger.info(f"No hotel suggestions from Gemini for {loc_name}.")
        return

    for hotel_suggestion in gemini_suggested_hotels:
        gemini_hotel_name_original = hotel_suggestion.get("name")
        gemini_hotel_address = hotel_suggestion.get("address") 
        gemini_latitude = hotel_suggestion.get("latitude")
        gemini_longitude = hotel_suggestion.get("longitude")

        if not all([gemini_hotel_name_original, isinstance(gemini_latitude, (float, int)), isinstance(gemini_longitude, (float, int))]):
            logger.warning(f"Skipping incomplete hotel suggestion from Gemini for {loc_name}: Name='{gemini_hotel_name_original}', Lat='{gemini_latitude}', Lon='{gemini_longitude}'")
            continue
        
        logger.info(f"  Processing Gemini suggestion: '{gemini_hotel_name_original}' at ({gemini_latitude}, {gemini_longitude}), Address: {gemini_hotel_address}")

        # Prepare data for 'hotels' table according to new schema
        hotel_db_payload = {
            "name": gemini_hotel_name_original,
            "location": loc_name,
            "gemini_address": gemini_hotel_address,
            "gemini_latitude": gemini_latitude,
            "gemini_longitude": gemini_longitude,
        }

        # --- Google Places API Integration ---
        name_for_google_search = gemini_hotel_name_original
        
        google_place_id_from_search, google_photos_metadata = find_google_place(
            name_for_google_search, 
            loc_name, 
            bias_lat=gemini_latitude,
            bias_lng=gemini_longitude
        )

        g_place_details = None
        if google_place_id_from_search:
            hotel_db_payload["google_place_id"] = google_place_id_from_search
            g_place_details = get_google_place_details(google_place_id_from_search)
            if g_place_details:
                logger.info(f"    Successfully retrieved Google Place Details for ID: {google_place_id_from_search}")
                hotel_db_payload["google_place_name_resource"] = g_place_details.get("name") 
                hotel_db_payload["google_place_display_name"] = g_place_details.get("displayName", {}).get("text")
                hotel_db_payload["name"] = g_place_details.get("displayName", {}).get("text", gemini_hotel_name_original)
                hotel_db_payload["google_place_formatted_address"] = g_place_details.get("formattedAddress")
                hotel_db_payload["google_place_short_formatted_address"] = g_place_details.get("shortFormattedAddress")
                
                g_location = g_place_details.get("location", {})
                if isinstance(g_location, dict):
                    hotel_db_payload["google_place_latitude"] = g_location.get("latitude")
                    hotel_db_payload["google_place_longitude"] = g_location.get("longitude")

                hotel_db_payload["google_maps_uri"] = g_place_details.get("googleMapsUri")
                hotel_db_payload["google_place_website_uri"] = g_place_details.get("websiteUri")
                hotel_db_payload["google_place_rating"] = g_place_details.get("rating")
                hotel_db_payload["google_place_user_rating_count"] = g_place_details.get("userRatingCount")
            else:
                logger.warning(f"    Could not fetch Google Place Details for ID: {google_place_id_from_search}")
        else:
            logger.warning(f"  Could not find '{name_for_google_search}' on Google Places for location {loc_name}.")

        # --- Gemini Narratives Generation ---
        logger.info(f"  Fetching Gemini narratives for hotel: {hotel_db_payload.get('name')}")
        narrative_input_data = {
            "GooglePlaceDisplayName": hotel_db_payload.get("google_place_display_name"),
            "GooglePlaceFormattedAddress": hotel_db_payload.get("google_place_formatted_address"),
            "GooglePlaceRating": hotel_db_payload.get("google_place_rating"),
            "GooglePlaceWebsiteURI": hotel_db_payload.get("google_place_website_uri")
        }
        hotel_narratives = get_gemini_hotel_narratives(
            hotel_db_payload.get('name'), 
            loc_name, 
            google_place_data=narrative_input_data
        )
        hotel_db_payload["gemini_short_summary"] = hotel_narratives.get("short_summary")
        hotel_db_payload["gemini_longer_summary"] = hotel_narratives.get("longer_summary")
        hotel_db_payload["gemini_location_description"] = hotel_narratives.get("location_description")
        hotel_db_payload["gemini_rationale"] = hotel_narratives.get("rationale")
        hotel_db_payload["gemini_top_tip"] = hotel_narratives.get("top_tip")
        hotel_db_payload["gemini_price_range"] = hotel_narratives.get("price_range")

        # --- Insert Hotel into Database ---
        if not supabase:
            logger.error("Supabase client not initialized. Cannot insert hotel data.")
            continue # Skip to next hotel suggestion

        inserted_hotel_id = insert_hotel_into_db(hotel_db_payload, supabase, is_override_mode)

        if not inserted_hotel_id:
            logger.error(f"Failed to insert hotel '{hotel_db_payload.get('name')}' into database. Skipping image processing for this hotel.")
            time.sleep(1) # Small delay before next suggestion
            continue

        # --- Process and Upload Hotel Images ---
        if google_photos_metadata: # Only proceed if we have photo metadata from Google
            logger.info(f"  Processing Google Photos for hotel ID: {inserted_hotel_id}.")
            temp_google_photo_urls = get_google_photo_urls(google_photos_metadata, num_photos_to_fetch=min_google_photos_to_fetch)
            
            display_order_counter = 0
            featured_image_set_for_hotel = False

            if temp_google_photo_urls:
                for i, g_photo_url in enumerate(temp_google_photo_urls):
                    if i >= 10: break # Limit to 10 images
                    try:
                        logger.info(f"    Downloading image from Google URL: {g_photo_url}")
                        img_response = requests.get(g_photo_url, timeout=30)
                        img_response.raise_for_status()
                        downloaded_image_data = img_response.content

                        if not downloaded_image_data:
                            logger.warning(f"    Downloaded image data is empty for {g_photo_url}. Skipping.")
                            continue

                        logger.info(f"    Post-processing image for {hotel_db_payload.get('name')}...")
                        processed_image_data = post_process_hotel_image(downloaded_image_data)

                        safe_hotel_name_slug = slugify(hotel_db_payload.get('name', 'unknown_hotel'))
                        safe_location_name_slug = slugify(loc_name)
                        unique_id = uuid.uuid4().hex[:8]
                        supabase_filename = f"{safe_location_name_slug}_{safe_hotel_name_slug}_{display_order_counter + 1}_{unique_id}.jpg"
                        
                        logger.info(f"    Uploading processed image as {supabase_filename} to Supabase bucket '{HOTEL_IMAGES_STORAGE_BUCKET}'...")
                        supabase_image_url = upload_image_to_supabase_hotel_bucket(processed_image_data, supabase_filename, supabase)
                        
                        if supabase_image_url:
                            display_order_counter += 1
                            is_featured_flag = False
                            if not featured_image_set_for_hotel:
                                is_featured_flag = True
                                featured_image_set_for_hotel = True
                            
                            alt_text_for_image = f"{hotel_db_payload.get('name', 'Hotel')} - Photo {display_order_counter}"
                            if hotel_db_payload.get('gemini_short_summary') and display_order_counter == 1: # Use summary for first image
                                alt_text_for_image = hotel_db_payload.get('gemini_short_summary')


                            image_db_payload = {
                                "hotel_id": inserted_hotel_id,
                                "image_url": supabase_image_url,
                                "alt_text": alt_text_for_image,
                                "display_order": display_order_counter,
                                "is_featured": is_featured_flag,
                                "source_google_url": g_photo_url
                            }
                            insert_hotel_image_into_db(image_db_payload, supabase)
                            logger.info(f"    Successfully uploaded and recorded image. Supabase URL: {supabase_image_url}")
                        else:
                            logger.error(f"    Failed to upload image {supabase_filename} to Supabase.")
                        
                        time.sleep(0.5) 
                    except Exception as e:
                        logger.error(f"    Unexpected error processing photo {g_photo_url} for {hotel_db_payload.get('name')}: {e}", exc_info=True)
            else:
                logger.info(f"  No Google Photo URLs found to process for {hotel_db_payload.get('name')}.")
        else:
            logger.info(f"  No Google photo metadata available for {hotel_db_payload.get('name')}, skipping image uploads.")
        
        time.sleep(2) # Delay between processing each Gemini-suggested hotel
    time.sleep(3) # Delay after processing all hotels for a location

def get_all_tour_ids(supabase_client) -> list[str]:
    """Fetches all tour IDs from the Supabase database."""
    try:
        response = supabase_client.table("tours").select("id").execute()
        if response.data:
            tour_ids = [tour["id"] for tour in response.data]
            logger.info(f"Retrieved {len(tour_ids)} tour IDs from the database.")
            return tour_ids
        else:
            logger.warning("No tour IDs found in the 'tours' table.")
            return []
    except Exception as e:
        logger.error(f"Error fetching all tour IDs: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Fetch luxury hotel information using Gemini and Google Places APIs, and save to Supabase.")
    parser.add_argument("--city", type=str, help="The city name to search for hotels (e.g., 'Venice').")
    parser.add_argument("--tour_id", type=str, help="The tour_id from Supabase to fetch locations for (alternative to --city).")
    parser.add_argument("--min_google_photos", type=int, default=10, help="Maximum number of Google Photos to attempt to fetch and process per hotel (default: 10).")
    parser.add_argument('--override', action='store_true',
                        help='Process locations even if they already have hotels in the database, and attempt to upsert hotel data.')
    
    args = parser.parse_args()

    logger.info("Starting hotel enrichment script (Supabase DB version).")
    logger.info(f"Override mode: {args.override}")

    if not supabase:
        logger.critical("Supabase client is not initialized (is None). This script cannot proceed. Exiting.")
        return

    if args.city:
        logger.info(f"Processing city provided via command line: {args.city}")
        # CSV writer is initialized here as per your original script for city mode
        output_csv_filename = f"gemini_google_hotels_{slugify(args.city)}_{time.strftime('%Y%m%d_%H%M%S')}.csv"
        try:
            with open(output_csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
                csv_writer = csv.DictWriter(csvfile, fieldnames=CSV_FIELDNAMES)
                csv_writer.writeheader()
                logger.info(f"Outputting data to CSV: {output_csv_filename}")
                process_location(args.city, csv_writer, args.min_google_photos, args.override)
        except IOError as e:
            logger.error(f"Could not open or write to CSV file {output_csv_filename}: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred during CSV processing for city {args.city}: {e}", exc_info=True)

    elif args.tour_id:
        logger.info(f"Processing specific tour_id: {args.tour_id}")
        logger.warning("CSV output is currently only generated when using --city mode.") # Consistent with original script behavior
        tour_site_locations = get_tour_locations_from_supabase(args.tour_id) # Uses global supabase client
        if tour_site_locations:
            logger.info(f"Locations to process for tour_id {args.tour_id}: {tour_site_locations}")
            for i, loc_name in enumerate(tour_site_locations):
                logger.info(f"  Processing location {i+1}/{len(tour_site_locations)}: '{loc_name}' for tour ID {args.tour_id}")
                try:
                    process_location(loc_name, None, args.min_google_photos, args.override) # Pass None for csv_writer
                except Exception as e:
                    logger.error(f"    An error occurred while processing location '{loc_name}' for tour ID {args.tour_id}: {e}", exc_info=True)
                    logger.info(f"    Skipping location '{loc_name}' due to error, continuing with the next location for this tour.")
        else:
            logger.warning(f"No locations found for tour_id: {args.tour_id}. Nothing to process for this tour.")
    
    else:
        logger.info("No --city or --tour_id provided. Defaulting to process all tours sequentially.")
        logger.warning("CSV output is currently only generated when using --city mode.") # Consistent with original script behavior
        all_tour_ids = get_all_tour_ids(supabase) # Uses global supabase client

        if not all_tour_ids:
            logger.warning("No tours found in the database to process. Exiting.")
        else:
            total_tours = len(all_tour_ids)
            logger.info(f"Found {total_tours} tours. Starting sequential processing.")
            for i, tour_id_item in enumerate(all_tour_ids):
                logger.info(f"--- Processing Tour {i + 1}/{total_tours}: ID {tour_id_item} ---")
                try:
                    current_tour_locations = get_tour_locations_from_supabase(tour_id_item)
                    if current_tour_locations:
                        total_locations_for_tour = len(current_tour_locations)
                        logger.info(f"  Found {total_locations_for_tour} location(s) for tour {tour_id_item}: {current_tour_locations}")
                        for j, loc_name in enumerate(current_tour_locations):
                            logger.info(f"    Processing location {j+1}/{total_locations_for_tour}: '{loc_name}' for tour '{tour_id_item}'")
                            try:
                                process_location(loc_name, None, args.min_google_photos, args.override) # Pass None for csv_writer
                            except Exception as e_loc:
                                logger.error(f"      An error occurred while processing location '{loc_name}' for tour ID {tour_id_item}: {e_loc}", exc_info=True)
                                logger.info(f"      Skipping location '{loc_name}' due to error, continuing with the next location for this tour.")
                    else:
                        logger.warning(f"  No locations found for tour ID {tour_id_item}. Skipping hotel processing for this tour.")
                except Exception as e_tour:
                    logger.error(f"An critical error occurred while processing tour ID {tour_id_item}: {e_tour}", exc_info=True)
                    logger.info(f"Skipping tour ID {tour_id_item} due to critical error, continuing with the next tour.")
                
                if i < total_tours - 1: # Avoid sleep after the last tour
                    logger.info(f"--- Finished Tour {i + 1}/{total_tours}: ID {tour_id_item}. Waiting a moment before next tour... ---")
                    time.sleep(5) # Optional: A slightly longer delay between processing different tours
            logger.info("Finished processing all tours.")

    logger.info("Hotel enrichment script finished.")

if __name__ == "__main__":
    main()