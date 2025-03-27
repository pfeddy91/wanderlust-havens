import json
import requests
from supabase import create_client, Client
import random
import re
import unicodedata
import argparse
import csv
from datetime import datetime
from typing import List, Dict

# Updated Supabase credentials
SUPABASE_URL = "https://jeiuruhneitvfyjkmbvj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaXVydWhuZWl0dmZ5amttYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjU5NzQsImV4cCI6MjA1ODI0MTk3NH0.iYBsdI4p7o7rKbrMHstzis4KZYV_ks2p09pmtj5-bTo"

# Initialize Perplexity API config
PERPLEXITY_API_KEY = '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'
PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

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

def call_perplexity_api(system_prompt: str, user_prompt: str) -> dict:
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {PERPLEXITY_API_KEY}'
    }
    
    payload = {
        "model": "sonar",
        "messages": [
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()}
        ]
    }
    
    try:
        response = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload)
        
        if not response.ok:
            raise Exception(f"API returned status code {response.status_code}: {response.text}")
            
        result = response.json()
        if 'choices' not in result or not result['choices']:
            raise Exception("No choices in API response")
            
        content = result['choices'][0]['message']['content']
        
        # Debug: Print the raw content to see what might be causing the issue
        print("Raw API response content:")
        print(content[:200] + "..." if len(content) > 200 else content)
        
        if "```json" in content:
            json_content = content.split("```json")[1].split("```")[0].strip()
        else:
            json_content = content
            
        # Clean the JSON string more thoroughly
        # Remove control characters, quotes around the entire JSON, and fix common issues
        json_content = re.sub(r'[\x00-\x1F\x7F]', '', json_content)
        json_content = json_content.strip('"\'')
        
        # Debug: Print the cleaned JSON content
        print("Cleaned JSON content (first 200 chars):")
        print(json_content[:200] + "..." if len(json_content) > 200 else json_content)
        
        try:
        return json.loads(json_content)
        except json.JSONDecodeError as e:
            print(f"JSON decode error at position {e.pos}: {e.msg}")
            print(f"Character at position: '{json_content[e.pos-10:e.pos+10]}'")
            
            # Try a more aggressive cleaning approach
            # Remove any non-JSON characters that might be causing issues
            clean_json = re.sub(r'[^\x20-\x7E]', '', json_content)
            # Try to fix common JSON syntax errors
            clean_json = clean_json.replace('"{', '{').replace('}"', '}')
            clean_json = clean_json.replace("'", '"')
            
            return json.loads(clean_json)
        
    except Exception as e:
        print(f"API Request Error: {str(e)}")
        raise

def generate_tour_prompt(tour_data: Dict) -> str:
    return f"""
    Context: you are a high end (not cheap but also not super luxury) travel expert specializing in honeymoon packages. Your job is to come up with exciting, interesting and romantic descriptions of these tours. Feel free to leverage boutique or high end travel websites and sources to come up with these plans. Remember, honeymoons depend on you. Assume a mix of 5-star mostly but also 4-star hotels.

    Tour: {tour_data['tour_name']}
    Location: {tour_data['main_country']} ({tour_data['region']})
    Duration: {tour_data['duration']}
    Type: {tour_data['tags']}

    Please provide:
    1. A guide price range in EUR for this honeymoon package (considering accommodation, activities, and transfers)
    2. A compelling summary (150-200 words) summarise the tour in a way that is engaging and interesting for the reader
    3. A more detailed description of the tour and key activities organized in 3-4 day segments. Please do NOT provide the day by day but just a 3-day summary at a time. For example, this could look like the following:
    Days 1-2: Santiago Exploration
    Arrive in Chile's capital where you'll explore the historic center including Plaza de Armas, Santa Lucía Hill, and the Huérfanos and Ahumada pedestrian areas, experiencing the vibrant culture and panoramic city views.
    Days 3-5: Torres del Paine National Park Adventure
    Immerse yourself in one of the world's most spectacular national parks with activities like hiking to the famous towers viewpoint with its cyan lagoon, exploring Sarmiento Lake (the park's largest), and enjoying panoramic vistas of the Paine Massif from Sierra del Toro.
    Days 6-7: Patagonian Glacier Experience
    Cross into Argentina to El Calafate, gateway to the magnificent Perito Moreno Glacier. Take a boat ride along Lago Argentino to witness the glacier's towering ice face and potentially trek on the glacier itself (age restrictions apply).
    Days 8-10: Buenos Aires Cultural Immersion
    Conclude your journey in Argentina's passionate capital, touring highlights like Plaza de Mayo and the historic San Telmo district. Experience authentic Argentine culture with free time for independent exploration and an evening of dinner and traditional tango at the renowned Café de los Angelitos.

    Format the response as valid JSON with these keys: 
    - guide_price (numeric)
    - summary (text)
    - description (text with day segments)
    """

def parse_tags(tags_str: str) -> List[str]:
    """Convert comma-separated tag string into a list of cleaned tags"""
    return [tag.strip().lower() for tag in tags_str.strip('"').split(',')]

def load_tours(filename: str) -> List[Dict]:
    tours = []
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            tours.append(row)
    return tours

def generate_and_store_tour(tour_data: Dict, override: bool = False) -> Dict:
    try:
        print(f"Generating content for tour: {tour_data['tour_name']}")
        
        # Generate a slug from the tour name
        slug = custom_slugify(tour_data['tour_name'])
        
        # Check if tour with this slug already exists
        if override:
            # Check if the tour already exists
            existing_tour = supabase.table('tours').select('id').eq('slug', slug).execute()
            
            if existing_tour.data:
                # Update existing tour instead of inserting
                tour_id = existing_tour.data[0]['id']
                print(f"Updating existing tour with slug: {slug}")
                
                # Generate content using Perplexity API
                system_prompt = "You are a travel expert specializing in honeymoon packages. Provide descriptions and tours for high-end travel experiences."
                user_prompt = generate_tour_prompt(tour_data)
                
                content_json = call_perplexity_api(system_prompt, user_prompt)
                
                # Extract duration number from string (e.g., "10 days" -> 10)
                duration = int(tour_data['duration'].split()[0])
                
                # Parse tags
                tags = parse_tags(tour_data['tags'])
                
                # Prepare data for update
                tour_data_db = {
                    "name": tour_data['tour_name'],
                    "duration": duration,
                    "guide_price": content_json['guide_price'],
                    "summary": content_json['summary'],
                    "description": content_json['description'],
                    "is_featured": random.choice([True, False]),
                    "vibe_tag": tags,
                    "updated_at": datetime.now().isoformat()
                }
                
                # Update in Supabase
                response = supabase.table('tours').update(tour_data_db).eq('id', tour_id).execute()
                
                print(f"Successfully updated tour: {tour_data['tour_name']}")
                return response.data[0]
        
        # If not overriding or tour doesn't exist, create a new one
        # Generate content using Perplexity API
        system_prompt = "You are a travel expert specializing in honeymoon packages. Provide detailed, descriptions and realistic pricing for high-end travel experiences."
        user_prompt = generate_tour_prompt(tour_data)
        
        content_json = call_perplexity_api(system_prompt, user_prompt)
        
        # Extract duration number from string (e.g., "10 days" -> 10)
        duration = int(tour_data['duration'].split()[0])
        
        # Parse tags
        tags = parse_tags(tour_data['tags'])
        
        # Prepare data for insert
        tour_data_db = {
            "name": tour_data['tour_name'],
            "slug": slug,  # Use the generated slug instead of empty string
            "duration": duration,
            "guide_price": content_json['guide_price'],
            "summary": content_json['summary'],
            "description": content_json['description'],
            "featured_image": "",  # Empty as requested
            "is_featured": random.choice([True, False]),
            "vibe_tag": tags,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Insert into Supabase
        response = supabase.table('tours').insert(tour_data_db).execute()
        
        print(f"Successfully stored tour: {tour_data['tour_name']}")
        return response.data[0]
        
    except Exception as e:
        print(f"Error processing tour {tour_data['tour_name']}: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Generate tour content')
    parser.add_argument('-override', action='store_true', help='Override existing tours')
    parser.add_argument('-tour', type=str, help='Process specific tour by tour code (e.g., AFR001)')
    args = parser.parse_args()
    
    # Load tours from the new CSV format
    all_tours = load_tours('tours_incipit.txt')
    
    # Filter tours based on tour code if provided
    if args.tour:
        tours = [tour for tour in all_tours if tour['tour_code'] == args.tour]
        if not tours:
            print(f"No tour found with code {args.tour}")
            return
        print(f"Processing single tour: {args.tour}")
    else:
        tours = all_tours
        print(f"Loaded {len(tours)} tours from tours_incipit.txt")
    
    successful = 0
    for tour in tours:
        try:
            result = generate_and_store_tour(tour, args.override)
            if result:
                successful += 1
        except Exception as e:
            print(f"Failed to process tour {tour['tour_name']}: {str(e)}")
    
    print(f"Completed processing {successful} of {len(tours)} tours successfully.")

if __name__ == "__main__":
    main()