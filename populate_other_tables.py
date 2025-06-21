import argparse
import csv
import re
import requests
import unicodedata
import time
import json
from datetime import datetime
from supabase import create_client, Client
from typing import List, Dict, Optional, Any # Added typing

# Supabase credentials (ensure these are correct)
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

# Gemini API config
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc' # Replace with your actual key if different
GEMINI_API_MODEL = 'gemini-2.5-pro-exp-03-25' # Using the specified model

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Utility Functions ---

def custom_slugify(text: str) -> str:
    """
    Convert a string to a slug format (lowercase, no special chars, hyphens instead of spaces).
    Handles potential None input gracefully.
    """
    if not text:
            return ""
    text = str(text).lower() # Ensure input is string and lowercase
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    return text

def create_region_slug(region_name: str) -> str:
    """
    Create a simplified region slug in the format honeymoon-{region}.
    Maps complex region names to simple ones.
    """
    region_slug_map = {
        'African Adventures': 'africa',
        'Asia': 'asia', 
        'Asian Wonders': 'asia',
        'Europe': 'europe',
        'European Escapes': 'europe',
        'North America & Hawaii': 'north-america',
        'South America': 'south-america',
        'Caribbean & Central America': 'caribbean',
        'Oceania & Pacific': 'oceania'
    }
    
    # Get simplified slug or fallback to custom_slugify
    simple_name = region_slug_map.get(region_name, custom_slugify(region_name))
    return f"honeymoon-{simple_name}"

def create_country_slug(country_name: str) -> str:
    """
    Create a simplified country slug in the format honeymoon-{country}.
    """
    country_slug = custom_slugify(country_name)
    return f"honeymoon-{country_slug}"

def call_gemini_api(prompt: str) -> Optional[Dict[str, Any]]:
    """
    Call the Gemini API with a prompt and return the parsed JSON response.
    Uses the configured GEMINI_API_MODEL.
    """
    if not GEMINI_API_KEY or GEMINI_API_KEY == 'YOUR_GEMINI_API_KEY':
         print("Error: Gemini API key is not configured.")
         return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_API_MODEL}:generateContent?key={GEMINI_API_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {"contents": [{"parts": [{"text": prompt.strip()}]}]}

    try:
        print(f"Sending prompt to Gemini API ({GEMINI_API_MODEL})...")
        time.sleep(2)
        response = requests.post(url, headers=headers, json=payload, timeout=120)

        if not response.ok:
            print(f"Gemini API error: {response.status_code} - {response.text[:300]}...")
            return None

        result = response.json()

        if 'candidates' not in result or not result['candidates'] or 'content' not in result['candidates'][0]:
            print("Invalid response format from Gemini API (missing candidates/content)")
            print(f"Full response: {result}")
            return None

        content_parts = result['candidates'][0]['content']['parts']
        content = ''.join([part.get('text', '') for part in content_parts if 'text' in part])

        print("Raw Gemini API response content (first 300 chars):")
        print(content[:300] + "..." if len(content) > 300 else content)

        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL | re.IGNORECASE)
        if json_match:
            json_content = json_match.group(1).strip()
        else:
            start_index = content.find('{')
            end_index = content.rfind('}')
            if start_index != -1 and end_index != -1 and end_index > start_index:
                json_content = content[start_index : end_index + 1].strip()
            else:
                print("Could not reliably extract JSON object from Gemini response content.")
                print(f"Content was: {content}")
                return None

        print("Attempting to parse JSON content (first 300 chars):")
        print(json_content[:300] + "..." if len(json_content) > 300 else json_content)

        try:
            return json.loads(json_content)
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Problematic JSON string: {json_content}")
            return None

    except requests.exceptions.Timeout:
        print("Gemini API request timed out.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Gemini API Request Error (Network/Connection): {str(e)}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred during Gemini API call: {str(e)}")
        return None


def load_csv_data(filename: str) -> List[Dict[str, str]]:
    """Load data from CSV file"""
    data = []
    try:
        with open(filename, 'r', encoding='utf-8-sig') as file: # Use utf-8-sig to handle potential BOM
            reader = csv.DictReader(file)
            if not reader.fieldnames:
                 print(f"Error: CSV file '{filename}' might be empty or header is missing.")
                 return []
            print(f"CSV Headers: {reader.fieldnames}") # Debugging: show headers
            for row in reader:
                data.append(row)
    except FileNotFoundError:
        print(f"Error: Input file '{filename}' not found.")
        return []
    except Exception as e:
        print(f"Error reading CSV file '{filename}': {e}")
        return []
    return data

def extract_unique_regions_countries(tours_data: List[Dict[str, str]]) -> Dict[str, List[str]]:
    """Extract unique regions and their associated countries from tour data"""
    # Assumes '1) Category' is Region and '5) Primary country' is Country
    region_to_countries = {}
    for tour in tours_data:
        region_name = tour.get('1) Category')
        country_name = tour.get('5) Primary country')

        if region_name and country_name:
            region_name = region_name.strip()
            country_name = country_name.strip()
            if region_name not in region_to_countries:
                region_to_countries[region_name] = set() # Use set for uniqueness
            region_to_countries[region_name].add(country_name)

    # Convert sets to lists
    result = {region: sorted(list(countries)) for region, countries in region_to_countries.items()}
    return result

# --- Region Population ---

def generate_region_prompt(region_name: str) -> str:
    """Generate the prompt for Gemini API to get region details."""
    return f"""
    Analyze the region "{region_name}" as a luxury honeymoon travel destination.

    Provide the following details in a valid JSON object format:
    {{
      "description": "A compelling and evocative description (approx. 100-150 words) highlighting the unique appeal of '{region_name}' for honeymooners. Focus on atmosphere, key experiences, and romantic potential. Use sophisticated language suitable for a luxury travel audience.",
      "photo_keywords": ["list", "of", "3-5", "specific", "keywords", "or short phrases for searching high-quality, representative photos of this region suitable for a luxury travel website (e.g., 'overwater bungalow Bora Bora', 'Kyoto cherry blossom temple', 'Serengeti balloon safari sunrise')"],
      "featured_image_keyword": "A single, concise keyword or short phrase for searching a stunning featured image for the '{region_name}' region page."
    }}

    Ensure the output is ONLY the JSON object, without any introductory text, backticks, or explanations.
    """

def populate_regions(regions_to_populate: List[str]) -> Dict[str, str]:
    """Generate content and insert regions into the database."""
    region_name_to_id = {}
    print(f"\n--- Populating {len(regions_to_populate)} Regions ---")

    for region_name in regions_to_populate:
        print(f"\nProcessing Region: {region_name}")

        # 1. Generate Slug
        region_slug = create_region_slug(region_name)

        # 2. Generate Content via Gemini
        prompt = generate_region_prompt(region_name)
        ai_data = call_gemini_api(prompt)

        if not ai_data:
            print(f"Skipping region '{region_name}' due to content generation failure.")
            continue

        # 3. Prepare Data for DB Insertion
        now = datetime.now().isoformat()
        region_data = {
            "name": region_name,
            "slug": region_slug,
            "description": ai_data.get("description", f"Explore the beautiful region of {region_name}."), # Default description
            "photos": ai_data.get("photo_keywords"), # Store keywords as text array
            "featured_image": ai_data.get("featured_image_keyword"), # Store keyword, URL determined later
            "created_at": now,
            "updated_at": now
        }
            
        # 4. Insert into Supabase
        try:
            response = supabase.table('regions').insert(region_data).execute()
            if response.data:
                region_id = response.data[0]['id']
                region_name_to_id[region_name] = region_id
                print(f"Successfully inserted region '{region_name}' (ID: {region_id})")
            else:
                # Handle potential insert errors (e.g., duplicate slug if run twice without clearing)
                error_info = getattr(response, 'error', None)
                print(f"Failed to insert region '{region_name}'. Error: {error_info}")
        except Exception as e:
            print(f"Exception inserting region '{region_name}': {e}")
            # Consider logging the specific region_data that failed

    print(f"--- Finished Populating Regions ({len(region_name_to_id)} successful) ---")
    return region_name_to_id

# --- Country Population ---

def generate_country_prompt(country_name: str, region_name: str) -> str:
    """Generate the prompt for Gemini API to get country details."""
    return f"""
    Analyze "{country_name}" located in the region "{region_name}" as a luxury honeymoon travel destination.

    Provide the following details in a valid JSON object format:
    {{
      "description": "A 125-word general introduction about '{country_name}' as a travel destination, highlighting what makes it special for affluent young couples on their honeymoon. Mention unique natural wonders or experiences. Use an evocative, travel magazine style.",
      "rationale": "A 100-word explanation of *who* would enjoy '{country_name}' for a honeymoon and things to look out for (e.g., adventure level, cultural immersion, relaxation focus). Maintain a sophisticated tone.",
      "distance": "An estimated flight duration range (in hours) to travel to '{country_name}' from a major European hub (e.g., London, Paris, Frankfurt). Format as text (e.g., '12-14 hours').",
      "best_period": "The best periods (months or seasons) to visit '{country_name}' for ideal honeymoon weather and experiences. Keep it concise (e.g., 'March to May and October to December').",
      "comfort": "A rating from 1 (very basic infrastructure) to 5 (highly developed) reflecting overall travel ease (hotels, roads, transport). Provide a brief explanation. Format as text (e.g., '4 - Well-developed tourist infrastructure, especially in major areas').",
      "photo_keywords": ["list", "of", "5-7", "specific", "keywords", "or short phrases for searching high-quality, representative photos of '{country_name}' suitable for a luxury honeymoon site (e.g., 'Santorini caldera sunset', 'Maasai Mara safari jeep', 'Tokyo Shibuya crossing night')"],
      "featured_image_keyword": "A single, concise keyword or short phrase for searching a stunning featured image for the '{country_name}' country page.",
      "map_image_keyword": "A keyword or phrase for searching a stylish, simple map image highlighting '{country_name}' (e.g., 'minimalist map Italy', 'Japan prefectures map outlined').",
      "is_featured": "true or false (boolean) - Indicate if '{country_name}' is generally considered a top-tier, popular, or highly recommended honeymoon destination.",
      "favourite_destination": "true or false (boolean) - Indicate if '{country_name}' is an exceptionally sought-after or 'bucket list' type honeymoon destination."
    }}

    Ensure the output is ONLY the JSON object, without any introductory text, backticks, or explanations. Make sure boolean values are true/false, not strings.
    """

def populate_countries(region_countries_map: Dict[str, List[str]], region_name_to_id: Dict[str, str]):
    """Generate content and insert countries into the database."""
    print(f"\n--- Populating Countries ---")
    total_countries_processed = 0
    successful_inserts = 0

    for region_name, countries in region_countries_map.items():
        if region_name not in region_name_to_id:
            print(f"Skipping countries in region '{region_name}' as region ID was not found.")
            continue

        region_id = region_name_to_id[region_name]
        print(f"\nProcessing Countries in Region: {region_name} (ID: {region_id})")

        for country_name in countries:
            total_countries_processed += 1
            print(f"  Processing Country: {country_name}")

            # 1. Generate Slug
            country_slug = create_country_slug(country_name)

            # 2. Generate Content via Gemini
            prompt = generate_country_prompt(country_name, region_name)
            ai_data = call_gemini_api(prompt)

            if not ai_data:
                print(f"  Skipping country '{country_name}' due to content generation failure.")
                continue

            # 3. Prepare Data for DB Insertion
            now = datetime.now().isoformat()
            try:
                # Attempt to cast boolean fields correctly
                is_featured = str(ai_data.get("is_featured", False)).lower() == 'true'
                favourite_destination = str(ai_data.get("favourite_destination", False)).lower() == 'true'
            except Exception:
                 is_featured = False # Default to false on error
                 favourite_destination = False


            country_data = {
                "region_id": region_id,
                "name": country_name,
                "slug": country_slug,
                "description": ai_data.get("description"),
                "rationale": ai_data.get("rationale"),
                "distance": ai_data.get("distance"),
                "best_period": ai_data.get("best_period"),
                "comfort": ai_data.get("comfort"),
                "photos": ai_data.get("photo_keywords"), # Store keywords
                "featured_image": ai_data.get("featured_image_keyword"), # Store keyword
                "map_image": ai_data.get("map_image_keyword"), # Store keyword
                "is_featured": is_featured,
                "favourite_destination": favourite_destination,
                "created_at": now,
                "updated_at": now
            }
            
            # 4. Insert into Supabase
            try:
                response = supabase.table('countries').insert(country_data).execute()
                if response.data:
                    country_id = response.data[0]['id']
                    print(f"  Successfully inserted country '{country_name}' (ID: {country_id})")
                    successful_inserts += 1
                else:
                    error_info = getattr(response, 'error', None)
                    print(f"  Failed to insert country '{country_name}'. Error: {error_info}")
            except Exception as e:
                print(f"  Exception inserting country '{country_name}': {e}")
                # Consider logging the specific country_data that failed

    print(f"--- Finished Populating Countries ({successful_inserts}/{total_countries_processed} successful) ---")

# --- Main Execution ---

def main():
    """Main function to load data and populate tables."""
    parser = argparse.ArgumentParser(description='Populate Regions and Countries tables using Gemini API')
    # Removed unused arguments like -tour, -country, -override, -model
    args = parser.parse_args() # Keep parser for potential future args

    print("Starting script...")
    print(f"Using Gemini Model: {GEMINI_API_MODEL}")

    # 1. Load tour data from the correct CSV
    input_filename = 'tours_input.csv'
    tours_data = load_csv_data(input_filename)

    if not tours_data:
        print("No tour data loaded. Exiting.")
        return
    print(f"Loaded {len(tours_data)} rows from {input_filename}")

    # 2. Extract unique regions and the countries within them
    region_countries_map = extract_unique_regions_countries(tours_data)
    unique_regions = sorted(region_countries_map.keys())
    unique_countries_count = sum(len(countries) for countries in region_countries_map.values())
    print(f"Found {len(unique_regions)} unique regions and {unique_countries_count} unique country entries.")
    # print(f"Region Map: {region_countries_map}") # Optional: Print map for debugging

    # 3. Populate Regions table
    # Assumes the regions table is empty, so no checks for existing needed
    region_name_to_id_map = populate_regions(unique_regions)

    # 4. Populate Countries table
    # Assumes the countries table is empty
    if region_name_to_id_map:
         populate_countries(region_countries_map, region_name_to_id_map)
    else:
         print("\nSkipping country population because no regions were successfully populated.")

    print("\nScript finished.")

if __name__ == "__main__":
    main()