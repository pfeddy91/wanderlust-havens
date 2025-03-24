import csv
import uuid
from datetime import datetime
from supabase import create_client, Client
import re
import unicodedata
import argparse
import requests
import time
import json

# Supabase credentials
SUPABASE_URL = "https://jeiuruhneitvfyjkmbvj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaXVydWhuZWl0dmZ5amttYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjU5NzQsImV4cCI6MjA1ODI0MTk3NH0.iYBsdI4p7o7rKbrMHstzis4KZYV_ks2p09pmtj5-bTo"

# Initialize Perplexity API config
PERPLEXITY_API_KEY = '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'
PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

# Initialize Gemini API config
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def call_perplexity_api(system_prompt: str, user_prompt: str) -> str:
    """Call the Perplexity API and return the response content"""
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {PERPLEXITY_API_KEY}'
    }
    
    payload = {
        "model": "sonar-pro",
        "messages": [
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()}
        ]
    }
    
    try:
        # Add a delay to avoid rate limiting
        time.sleep(1)
        
        response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 401:
            print("Authentication failed: Your Perplexity API key may have expired or is invalid.")
            return ""
        elif not response.ok:
            print(f"Perplexity API error: {response.status_code} - {response.text[:200]}...")
            raise Exception(f"Perplexity API returned status code {response.status_code}")
            
        result = response.json()
        if 'choices' not in result or not result['choices']:
            raise Exception("No choices in Perplexity API response")
            
        content = result['choices'][0]['message']['content']
        return content
        
    except Exception as e:
        print(f"Perplexity API Request Error: {str(e)}")
        raise

def call_gemini_api(system_prompt: str, user_prompt: str) -> str:
    """Call the Gemini API and return the response content"""
    # Combine system and user prompts for Gemini
    combined_prompt = f"{system_prompt}\n\n{user_prompt}"
    
    # Construct the API URL with the API key
    url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    payload = {
        "contents": [{
            "parts": [{"text": combined_prompt}]
        }]
    }
    
    try:
        # Add a delay to avoid rate limiting
        time.sleep(1)
        
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if not response.ok:
            print(f"Gemini API error: {response.status_code} - {response.text[:200]}...")
            raise Exception(f"Gemini API returned status code {response.status_code}")
            
        result = response.json()
        
        # Extract the content from Gemini's response format
        if 'candidates' in result and result['candidates'] and 'content' in result['candidates'][0]:
            content_parts = result['candidates'][0]['content']['parts']
            content = ''.join([part.get('text', '') for part in content_parts if 'text' in part])
            return content
        else:
            raise Exception("Unexpected response format from Gemini API")
        
    except Exception as e:
        print(f"Gemini API Request Error: {str(e)}")
        raise

def call_ai_api(system_prompt: str, user_prompt: str, model: str = "perplexity") -> str:
    """Call the selected AI API and return the response content"""
    if model.lower() == "gemini":
        return call_gemini_api(system_prompt, user_prompt)
    else:  # Default to Perplexity
        return call_perplexity_api(system_prompt, user_prompt)

def generate_country_description(country_name, model="perplexity"):
    """Generate a description for a country using the selected AI API"""
    system_prompt = "You are a sophisticated travel expert specializing in luxury honeymoon destinations. Your writing is elegant, informative, and appeals to discerning travelers seeking exceptional experiences."
    
    user_prompt = f"""
Write an elegant description answering the question: "Why should you travel on your honeymoon to {country_name}?"

Your response should:
- Be approximately 150 words maximum
- Convey the essence of {country_name} as a honeymoon destination
- Highlight what makes it exciting and unique for couples
- Mention any potential drawbacks or considerations, if relevant
- Use sophisticated language appropriate for luxury travelers
- Focus on exclusive experiences, romantic settings, and memorable moments
- Avoid clichés and generic travel writing

The description will be used on a luxury honeymoon travel website.
"""
    
    try:
        description = call_ai_api(system_prompt, user_prompt, model)
        print(f"Generated description for {country_name} using {model.capitalize()} API")
        return description
    except Exception as e:
        print(f"Failed to generate description for {country_name} using {model.capitalize()} API: {str(e)}")
        return ""

def seo_slugify(text, prefix=None, suffix=None):
    """
    Create an SEO-friendly slug from text with optional prefix and suffix
    """
    # Convert to lowercase
    text = text.lower()
    
    # Convert to ASCII
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    
    # Replace non-alphanumeric characters with hyphens
    text = re.sub(r'[^a-z0-9]+', '-', text)
    
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    # Add prefix if provided
    if prefix:
        prefix = seo_slugify(prefix)
        text = f"{prefix}-{text}"
    
    # Add suffix if provided
    if suffix:
        suffix = seo_slugify(suffix)
        text = f"{text}-{suffix}"
    
    return text

def load_tours_data(filename):
    """Load tour data from CSV file"""
    tours = []
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            tours.append(row)
    return tours

def extract_regions_and_countries(tours_data):
    """Extract unique regions and countries from tour data"""
    regions = set()
    countries = {}  # {country_name: region_name}
    
    for tour in tours_data:
        region = tour['region']
        country = tour['main_country']
        
        regions.add(region)
        countries[country] = region
    
    return list(regions), countries

def update_region_slugs(regions):
    """Update region slugs for SEO and return a mapping of region names to IDs"""
    region_mapping = {}
    
    for region_name in regions:
        # Generate SEO-friendly slug
        seo_slug = seo_slugify(f"honeymoon-{region_name}")
        
        # Check if region already exists
        existing_region = supabase.table('regions').select('id').eq('name', region_name).execute()
        
        if existing_region.data:
            # Region exists, update its slug
            region_id = existing_region.data[0]['id']
            print(f"Updating slug for region '{region_name}'")
            
            update_data = {
                "slug": seo_slug,
                "updated_at": datetime.now().isoformat()
            }
            
            supabase.table('regions').update(update_data).eq('id', region_id).execute()
            print(f"Updated region '{region_name}' with SEO slug: {seo_slug}")
        else:
            # Create new region with SEO slug
            now = datetime.now().isoformat()
            region_data = {
                "name": region_name,
                "description": "",
                "featured_image": "",
                "slug": seo_slug,
                "created_at": now,
                "updated_at": now
            }
            
            response = supabase.table('regions').insert(region_data).execute()
            region_id = response.data[0]['id']
            print(f"Created new region '{region_name}' with SEO slug: {seo_slug}")
        
        # Get the region ID (either from existing or newly created)
        if not existing_region.data:
            region_id = supabase.table('regions').select('id').eq('name', region_name).execute().data[0]['id']
        
        region_mapping[region_name] = region_id
    
    return region_mapping

def update_country_slugs(countries, region_mapping, generate_descriptions=False, override=False, model="perplexity"):
    """Update country slugs for SEO and return a mapping of country names to IDs"""
    country_mapping = {}
    
    for country_name, region_name in countries.items():
        region_id = region_mapping[region_name]
        
        # Get region name for the slug
        region_data = supabase.table('regions').select('name').eq('id', region_id).execute()
        region_name = region_data.data[0]['name'] if region_data.data else region_name
        
        # Generate SEO-friendly slug
        seo_slug = seo_slugify(f"honeymoon-{region_name}-{country_name}")
        
        # Check if country already exists
        existing_country = supabase.table('countries').select('id, description').eq('name', country_name).execute()
        
        if existing_country.data:
            # Country exists, update its slug
            country_id = existing_country.data[0]['id']
            print(f"Updating slug for country '{country_name}'")
            
            update_data = {
                "slug": seo_slug,
                "updated_at": datetime.now().isoformat()
            }
            
            # Generate description if requested and (not already present or override is True)
            if generate_descriptions and (not existing_country.data[0]['description'] or existing_country.data[0]['description'] == "" or override):
                print(f"Generating description for country '{country_name}' using {model.capitalize()} API")
                description = generate_country_description(country_name, model)
                if description:
                    update_data["description"] = description
            
            supabase.table('countries').update(update_data).eq('id', country_id).execute()
            print(f"Updated country '{country_name}' with SEO slug: {seo_slug}")
        else:
            # Create new country with SEO slug
            now = datetime.now().isoformat()
            
            # Generate description if requested
            description = ""
            if generate_descriptions:
                print(f"Generating description for new country '{country_name}' using {model.capitalize()} API")
                description = generate_country_description(country_name, model)
            
            country_data = {
                "region_id": region_id,
                "name": country_name,
                "description": description,
                "featured_image": "",
                "map_image": "",
                "slug": seo_slug,
                "created_at": now,
                "updated_at": now
            }
            
            response = supabase.table('countries').insert(country_data).execute()
            country_id = response.data[0]['id']
            print(f"Created new country '{country_name}' with SEO slug: {seo_slug}")
        
        # Get the country ID (either from existing or newly created)
        if not existing_country.data:
            country_id = supabase.table('countries').select('id').eq('name', country_name).execute().data[0]['id']
        
        country_mapping[country_name] = country_id
    
    return country_mapping

def get_tour_id_by_name(tour_name):
    """Get tour ID from the tours table by name"""
    response = supabase.table('tours').select('id').eq('name', tour_name).execute()
    if response.data:
        return response.data[0]['id']
    return None

def link_tours_to_countries(tours_data, country_mapping):
    """Create links between tours and their main countries"""
    successful_links = 0
    failed_links = 0
    
    for tour in tours_data:
        tour_name = tour['tour_name']
        country_name = tour['main_country']
        
        # Get tour ID
        tour_id = get_tour_id_by_name(tour_name)
        if not tour_id:
            print(f"Could not find tour with name: {tour_name}")
            failed_links += 1
            continue
        
        # Get country ID from mapping
        if country_name not in country_mapping:
            print(f"Could not find country with name: {country_name} in mapping")
            failed_links += 1
            continue
        
        country_id = country_mapping[country_name]
        
        # Check if the link already exists
        existing_link = supabase.table('tour_countries').select('id') \
                               .eq('tour_id', tour_id) \
                               .eq('country_id', country_id) \
                               .execute()
        
        if existing_link.data:
            print(f"Link between tour '{tour_name}' and country '{country_name}' already exists, skipping")
            continue
        
        # Create new link
        now = datetime.now().isoformat()
        link_data = {
            "tour_id": tour_id,
            "country_id": country_id,
            "order": 1,  # Default order is 1 since we're only linking the main country
            "created_at": now,
            "updated_at": now
        }
        
        try:
            response = supabase.table('tour_countries').insert(link_data).execute()
            print(f"Created link between tour '{tour_name}' and country '{country_name}'")
            successful_links += 1
        except Exception as e:
            print(f"Error creating link between tour '{tour_name}' and country '{country_name}': {str(e)}")
            failed_links += 1
    
    print(f"Completed linking tours to countries: {successful_links} successful, {failed_links} failed")

def update_country_description(country_name, override=False, model="perplexity"):
    """Update the description for a specific country"""
    # Check if country exists
    existing_country = supabase.table('countries').select('id, description').eq('name', country_name).execute()
    
    if not existing_country.data:
        print(f"Country '{country_name}' not found in database")
        return False
    
    country_id = existing_country.data[0]['id']
    
    # Check if description already exists and override flag is not set
    if existing_country.data[0]['description'] and not override:
        print(f"Description already exists for country '{country_name}', skipping (use -override to replace)")
        return False
    
    # Generate description
    print(f"Generating description for country '{country_name}' using {model.capitalize()} API")
    description = generate_country_description(country_name, model)
    
    if not description:
        print(f"Failed to generate description for country '{country_name}'")
        return False
    
    # Update country description
    update_data = {
        "description": description,
        "updated_at": datetime.now().isoformat()
    }
    
    supabase.table('countries').update(update_data).eq('id', country_id).execute()
    print(f"Updated description for country '{country_name}'")
    return True

def main():
    # Add argument parsing
    parser = argparse.ArgumentParser(description='Populate regions, countries, and tour_countries tables')
    parser.add_argument('-tour', type=str, help='Process specific tour by tour code (e.g., OCE002)')
    parser.add_argument('-country', type=str, help='Update description for specific country')
    parser.add_argument('-descriptions', action='store_true', help='Generate descriptions for countries')
    parser.add_argument('-override', action='store_true', help='Override existing descriptions')
    parser.add_argument('-model', type=str, choices=['perplexity', 'gemini'], default='perplexity', 
                        help='Select AI model to use (perplexity or gemini)')
    args = parser.parse_args()
    
    # If updating a specific country description
    if args.country:
        update_country_description(args.country, args.override, args.model)
        return
    
    # Load tour data
    all_tours_data = load_tours_data('tours_incipit.txt')
    print(f"Loaded {len(all_tours_data)} tours from tours_incipit.txt")
    
    # Filter tours based on tour code if provided
    if args.tour:
        tours_data = [tour for tour in all_tours_data if tour['tour_code'] == args.tour]
        if not tours_data:
            print(f"No tour found with code {args.tour}")
            return
        print(f"Processing single tour: {args.tour}")
    else:
        tours_data = all_tours_data
    
    # Extract unique regions and countries from the filtered tours
    regions, countries = extract_regions_and_countries(tours_data)
    print(f"Found {len(regions)} unique regions and {len(countries)} unique countries")
    
    # Update region slugs and get mapping
    region_mapping = update_region_slugs(regions)
    
    # Update country slugs and get mapping (pass override flag and model)
    country_mapping = update_country_slugs(countries, region_mapping, args.descriptions, args.override, args.model)
    
    # Link tours to their main countries
    link_tours_to_countries(tours_data, country_mapping)
    
    print("Completed populating regions, countries, and tour_countries tables")

if __name__ == "__main__":
    main()
