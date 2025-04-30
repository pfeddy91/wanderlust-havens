import json
import requests
from supabase import create_client, Client
import random
import re
import unicodedata
import argparse
import csv
from datetime import datetime
from typing import List, Dict, Optional
import time # Added for potential delays

# Supabase credentials (ensure these are correct)
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

# API credentials
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_MODEL = "gemini-2.5-pro-exp-03-25" # Using the specified Gemini model

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Custom slugify function to avoid dependency issues
def custom_slugify(text):
    """
    Convert a string to a slug format (lowercase, no special chars, hyphens instead of spaces)
    """
    # Convert to lowercase
    text = text.lower()
    
    # Convert to ASCII
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    
    # Replace non-alphanumeric characters with hyphens
    text = re.sub(r'[^a-z0-9]+', '-', text)
    
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    return text

def call_gemini_api(prompt: str) -> dict:
    """
    Call the Gemini API with a prompt and return the parsed JSON response.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_API_MODEL}:generateContent?key={GEMINI_API_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {"contents": [{"parts": [{"text": prompt.strip()}]}]}

    try:
        # Optional: Add a small delay if needed for rate limiting
        # time.sleep(1)

        print(f"Sending prompt to Gemini API ({GEMINI_API_MODEL})...")
        response = requests.post(url, headers=headers, json=payload, timeout=60) # Increased timeout

        if not response.ok:
            raise Exception(f"Gemini API returned status code {response.status_code}: {response.text}")

        result = response.json()

        if 'candidates' not in result or not result['candidates'] or 'content' not in result['candidates'][0]:
            raise Exception("Invalid response format from Gemini API")

        content_parts = result['candidates'][0]['content']['parts']
        content = ''.join([part.get('text', '') for part in content_parts if 'text' in part])

        print("Raw Gemini API response content (first 200 chars):")
        print(content[:200] + "..." if len(content) > 200 else content)

        # Extract JSON content (assuming it's wrapped in ```json ... ``` or is the whole content)
        json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', content, re.DOTALL)
        if json_match:
            json_content = json_match.group(1).strip()
        else:
            # If no markdown code block, assume the whole response might be JSON
            json_content = content.strip()

        # Clean the JSON string
        json_content = re.sub(r'[\x00-\x1F\x7F]', '', json_content) # Remove control characters
        json_content = json_content.strip('"\'') # Remove potential wrapping quotes

        print("Cleaned JSON content (first 200 chars):")
        print(json_content[:200] + "..." if len(json_content) > 200 else json_content)

        try:
            return json.loads(json_content)
        except json.JSONDecodeError as e:
            print(f"JSON decode error at position {e.pos}: {e.msg}")
            # Attempt more aggressive cleaning if needed, or raise the error
            raise Exception(f"Failed to parse JSON from Gemini response: {e}") from e

    except Exception as e:
        print(f"Gemini API Request Error: {str(e)}")
        raise

def generate_tour_prompt(tour_data: Dict) -> str:
    """Generate the prompt for Gemini API based on the new CSV structure."""
    # Access data using the exact column names from the CSV header
    tour_name = tour_data.get('2) Name of the tour', 'N/A')
    locations = tour_data.get('3) Locations', 'N/A')
    short_description = tour_data.get('4) Short description', 'N/A')

    return f"""
    Context: You are a high-end (not cheap but also not super luxury) travel expert specializing in helping honeymooners plan their dream honeymoon. 
    Your job is to come up with exciting, interesting, and romantic descriptions of these tours. 
    Feel free to leverage boutique or high-end travel websites and sources to come up with these plans. 
    Remember that for now we are NOT a travel agency, we are a travel blog. So you can't say 'We'll arrange exclusive experiences'. We also can't mention hotels for now or things like 'Suggested accommodations'.
        
    Tour Name: {tour_name}
    Locations: {locations}
    Short Description: {short_description}

    Please provide:
    1. A simple SEO optimised slug equal to 'honeymoon-italy-venice-rome-florence' or 'honeymoon-italy-amalfi-coast' or 'honeymoon-italy-venice-rome-florence-amalfi-coast'
    2. The duration of the tour in days (e.g. 7 days); it should be fairly relaxed pace
    3. A guide price range in EUR for this honeymoon package (considering 'affordable luxury' accommodations, food and transporation). Provide only the numeric value (e.g., 8500).
    4. A compelling summary (150 words) summarizing the tour in a way that is engaging and interesting for the reader. Never write it in first person but you can say 'we like this because..'.
    5. A detailed description (300 words) that elaborates on the experience and highlights of the trip and why we recommend it so highly. Separate paragraphs with a new line.
    6. The collection you would include this tour in among: 'Culture & Elegance', 'Beach & Relaxation', 'Adventure & Discovery', 'Safari & Wildlife', 'Mini-moon' (for trips up to 7 days), 'Road Trips'

    Format the response as valid JSON with these keys:
    - slug (text)
    - duration (numeric)
    - guide_price (numeric)
    - summary (text)
    - description (text)
    - collection (text)
    """

def get_region_id_by_name(region_name: str) -> Optional[str]:
    """Get the region ID by name from Supabase"""
    try:
        # First try exact match
        response = supabase.table('regions').select('id').eq('name', region_name).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]['id']
        
        # If no exact match, try case-insensitive match using ILIKE
        response = supabase.table('regions').select('id').ilike('name', f'%{region_name}%').execute()
        if response.data and len(response.data) > 0:
            print(f"Found region by approximate match: '{region_name}' -> '{response.data[0]['id']}'")
            return response.data[0]['id']
        
        print(f"Warning: No region found for '{region_name}'. Available regions:")
        regions_response = supabase.table('regions').select('id,name').execute()
        if regions_response.data:
            for region in regions_response.data:
                print(f"- {region['name']} (ID: {region['id']})")
        
        return None
    except Exception as e:
        print(f"Error retrieving region ID for {region_name}: {str(e)}")
        return None

def extract_country_names(locations_str: str) -> List[str]:
    """
    Extract country names from the locations string
    Format examples:
    - "Italy: Venice, Rome, Florence"
    - "Bahamas: Nassau, Exuma"
    - "Japan: Tokyo, Kyoto, Osaka"
    """
    country_names = []
    
    # Split by commas first to handle multiple countries
    location_entries = locations_str.split(',')
    
    # Process each entry
    for entry in location_entries:
        # Check if this entry has a country prefix (contains a colon)
        if ':' in entry:
            # Country is before the colon
            country = entry.split(':', 1)[0].strip()
            if country and country not in country_names:
                country_names.append(country)
    
    # If we couldn't find any countries with the colon method,
    # try to extract the first word of each entry as a potential country
    if not country_names:
        for entry in location_entries:
            potential_country = entry.strip().split(' ', 1)[0]
            if potential_country and potential_country not in country_names:
                country_names.append(potential_country)
    
    return country_names

def get_countries_uuids(country_names: List[str]) -> List[str]:
    """Get UUIDs for a list of country names"""
    country_uuids = []
    
    # Get a list of all countries first for diagnostic purposes
    try:
        all_countries_response = supabase.table('countries').select('id,name').execute()
        all_countries = {country['name']: country['id'] for country in all_countries_response.data} if all_countries_response.data else {}
    except Exception as e:
        print(f"Error retrieving all countries list: {str(e)}")
        all_countries = {}
    
    for country_name in country_names:
        try:
            # Remove any leading/trailing spaces
            clean_name = country_name.strip()
            
            # First try exact match
            response = supabase.table('countries').select('id').eq('name', clean_name).execute()
            if response.data and len(response.data) > 0:
                country_uuids.append(response.data[0]['id'])
                continue
            
            # If no exact match, try case-insensitive match
            response = supabase.table('countries').select('id').ilike('name', f'%{clean_name}%').execute()
            if response.data and len(response.data) > 0:
                print(f"Found country by approximate match: '{clean_name}' -> '{response.data[0]['id']}'")
                country_uuids.append(response.data[0]['id'])
                continue
            
            print(f"Warning: Country '{clean_name}' not found in database")
            if all_countries:
                print("Available countries:")
                for country_name in all_countries.keys():
                    if country_name.lower().startswith(clean_name.lower()[0]):  # Show countries starting with same letter
                        print(f"- {country_name}")
                
        except Exception as e:
            print(f"Error retrieving country ID for {country_name}: {str(e)}")
    
    return country_uuids

def parse_tags(tags_str: str) -> List[str]:
    """Convert comma-separated tag string into a list of cleaned tags"""
    return [tag.strip().lower() for tag in tags_str.strip('"').split(',')]

def load_tours(filename: str) -> List[Dict]:
    tours = []
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            # Assuming standard comma delimiter for now
            reader = csv.DictReader(file)
            fieldnames = reader.fieldnames # Capture fieldnames to check access keys
            print(f"CSV Headers: {fieldnames}") # Print headers for debugging
            for row in reader:
                tours.append(row)
    except FileNotFoundError:
        print(f"Error: Input file '{filename}' not found.")
        return []
    except Exception as e:
        print(f"Error reading CSV file '{filename}': {e}")
        return []
    return tours

def generate_and_store_tour(tour_data: Dict, override: bool = False) -> Dict:
    """Generates content using Gemini and stores/updates the tour in Supabase."""
    tour_name = tour_data.get('2) Name of the tour')
    if not tour_name:
        print(f"Error: Tour data missing '2) Name of the tour'. Skipping.")
        return None

    # Get region name if available in CSV
    region_name = tour_data.get('1) Region', '').strip()
    if not region_name:
        # Try category as fallback for region
        region_name = tour_data.get('1) Category', '').strip()
        
    region_id = None
    if region_name:
        region_id = get_region_id_by_name(region_name)
        if not region_id:
            print(f"Warning: Region '{region_name}' not found in database")
    
    # Get countries from the primary, secondary, tertiary country columns
    country_names = []
    primary_country = tour_data.get('5) Primary country', '').strip()
    secondary_country = tour_data.get('6) Secondary country', '').strip()
    tertiary_country = tour_data.get('7) Third country', '').strip()
    
    if primary_country and primary_country != "NA":
        country_names.append(primary_country)
    if secondary_country and secondary_country != "NA":
        country_names.append(secondary_country)
    if tertiary_country and tertiary_country != "NA":
        country_names.append(tertiary_country)
    
    print(f"Using countries: {country_names}")
    country_uuids = get_countries_uuids(country_names)
    
    if not country_uuids:
        print(f"Warning: No valid countries found for tour '{tour_name}'")
        # As a fallback, try to extract country names from locations
        locations = tour_data.get('3) Locations', '')
        if locations:
            print(f"Attempting to extract countries from locations: {locations}")
            extracted_country_names = extract_country_names(locations)
            if extracted_country_names:
                print(f"Extracted country names from locations: {extracted_country_names}")
                country_uuids = get_countries_uuids(extracted_country_names)

    try:
        print(f"Processing tour: {tour_name}")

        # Generate content using Gemini API
        user_prompt = generate_tour_prompt(tour_data)
        content_json = call_gemini_api(user_prompt)
        
        # Check if description field exists, if not, use summary as description
        if not content_json.get('description') and content_json.get('summary'):
            print("Warning: No description field in API response. Using summary as description.")
            content_json['description'] = content_json.get('summary', '')
        
        # Generate a slug from the API response or create a default one
        if content_json.get('slug'):
            slug = content_json.get('slug')
            # Ensure slug has 'honeymoon' in it
            if 'honeymoon' not in slug:
                slug = f"honeymoon-{slug}"
        else:
            # Create a slug from the tour name if none provided
            default_slug = custom_slugify(tour_name)
            if 'honeymoon' not in default_slug:
                slug = f"honeymoon-{default_slug}"
            else:
                slug = default_slug
                
        print(f"Using slug: {slug}")

        existing_tour = None
        if override:
            # Check if the tour already exists by slug
            existing_tour_response = supabase.table('tours').select('id').eq('slug', slug).execute()
            if existing_tour_response.data:
                existing_tour = existing_tour_response.data[0]
                print(f"Found existing tour with slug: {slug}. Will update.")
            else:
                 print(f"Override specified, but no existing tour found with slug: {slug}. Will create new.")

        # Prepare data for DB - matching the schema structure
        tour_data_db = {
            "title": tour_name,  # Changed from 'name' to 'title' per schema
            "slug": slug,
            "duration": content_json.get('duration', 7),  # Default to 7 if not provided
            "guide_price": content_json.get('guide_price'), 
            "summary": content_json.get('summary'),
            "description": content_json.get('description'),
            "region_id": region_id,  # Add region_id
            "countries": country_uuids if country_uuids else None,  # Add countries array
            "collection": content_json.get('collection'),  # Add collection
            "is_featured": random.choice([True, False]), 
            "updated_at": datetime.now().isoformat()
        }

        # Update or Insert
        if existing_tour: # Update existing tour
            tour_id = existing_tour['id']
            response = supabase.table('tours').update(tour_data_db).eq('id', tour_id).execute()
            action = "updated"
        else: # Insert new tour
             # Check again before inserting to prevent duplicates if override wasn't True
            existing_tour_response = supabase.table('tours').select('id').eq('slug', slug).execute()
            if existing_tour_response.data:
                print(f"Warning: Tour with slug '{slug}' already exists but override was false or check failed. Skipping insert.")
                return None

            tour_data_db["created_at"] = datetime.now().isoformat()
            tour_data_db["featured_image"] = ""  # Keep featured_image empty for new tours

            response = supabase.table('tours').insert(tour_data_db).execute()
            action = "stored"

        if not response.data:
             # Attempt to access error information if available
            error_message = "No data returned from Supabase."
            if hasattr(response, 'error') and response.error:
                error_message = f"Supabase error: {response.error.message}"
            elif hasattr(response, 'status_code') and response.status_code >= 400:
                 error_message = f"Supabase returned status {response.status_code}"

            raise Exception(f"Failed to {action} tour '{tour_name}' in Supabase. {error_message}")


        print(f"Successfully {action} tour: {tour_name}")
        print(f"Tour details: Duration: {tour_data_db['duration']} days, Guide Price: €{tour_data_db['guide_price']}, Collection: {tour_data_db['collection']}")
        return response.data[0]

    except Exception as e:
        print(f"Error processing tour {tour_name}: {str(e)}")
        # Potentially log the full tour_data and exception details here
        return None

def main():
    parser = argparse.ArgumentParser(description='Generate tour content using Gemini API')
    parser.add_argument('-override', '--override', action='store_true', help='Override existing tours based on slug matching')
    parser.add_argument('-tour', '--tour', type=str, help='Process specific tour by its number (column "0) Number")')
    args = parser.parse_args()

    # Load tours from the CSV file with country information
    input_filename = 'tours_input.csv'
    all_tours = load_tours(input_filename)

    if not all_tours:
        print("No tours loaded. Exiting.")
        return

    # Filter tours based on tour number if provided
    if args.tour:
        # Assumes '0) Number' is the column for tour code/number
        tours_to_process = [tour for tour in all_tours if tour.get('0) Number') == args.tour]
        if not tours_to_process:
            print(f"No tour found with number {args.tour}")
            return
        print(f"Processing single tour: {args.tour}")
    else:
        tours_to_process = all_tours
        print(f"Loaded {len(tours_to_process)} tours from {input_filename}")

    successful = 0
    for tour in tours_to_process:
        try:
            result = generate_and_store_tour(tour, args.override)
            if result:
                successful += 1
        except Exception as e:
            # Catch exceptions during the processing loop as well
            print(f"Critical error processing tour {tour.get('2) Name of the tour', 'Unknown')}: {str(e)}")

    print(f"\n--------------------------------------------------")
    print(f"Processing complete.")
    print(f"Successfully processed {successful} of {len(tours_to_process)} tours.")
    print(f"--------------------------------------------------")

if __name__ == "__main__":
    main()