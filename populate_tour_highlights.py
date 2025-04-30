import json
import requests
import re
from datetime import datetime
import argparse
from supabase import create_client, Client
import time
import csv

# Supabase credentials
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

# Gemini API credentials
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_MODEL = "gemini-2.5-pro-exp-03-25"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def extract_highlights_from_text(content):
    """Extract highlights from text content using various methods"""
    print("Attempting to extract highlights from API response...")
    
    # First try to parse the content as JSON directly
    try:
        # Clean the content first
        content = content.strip()
        # Remove any markdown code block markers if present
        content = re.sub(r'```(?:json)?\s*', '', content)
        content = re.sub(r'\s*```', '', content)
        
        # Try to parse as JSON
        highlights = json.loads(content)
        
        # Validate the structure
        if isinstance(highlights, list):
            # Ensure each item has the required fields
            valid_highlights = []
            for item in highlights:
                if isinstance(item, dict) and 'title' in item and 'description' in item:
                    valid_highlights.append({
                        'title': item['title'].strip(),
                        'description': item['description'].strip()
                    })
            
            if valid_highlights:
                print(f"Successfully extracted {len(valid_highlights)} highlights from JSON")
                return valid_highlights[:6]  # Limit to 6 highlights
    
    except json.JSONDecodeError:
        print("Could not parse content as JSON, trying alternative methods...")
    
    # If JSON parsing failed, try other extraction methods
    # First, try to extract numbered items with title and description
    numbered_pattern = re.compile(r'(\d+)\.\s+(.*?):\s+(.*?)(?=\n\d+\.|\n\n|$)', re.DOTALL)
    matches = numbered_pattern.findall(content)
    
    if matches:
        print(f"Found {len(matches)} numbered highlights")
        highlights = []
        for _, title, description in matches:
            # Check if the title contains ellipses
            if '...' in title:
                print(f"WARNING: Title contains ellipses: '{title}'")
                # Try to find the complete title in the original content
                title_prefix = title.split('...')[0].strip()
                if len(title_prefix) > 5:  # Only if we have enough prefix to search
                    full_title_match = re.search(f"{re.escape(title_prefix)}[^:\n]+", content)
                    if full_title_match:
                        complete_title = full_title_match.group(0).strip()
                        print(f"Found more complete title: '{complete_title}'")
                        title = complete_title
            
            highlights.append({
                "title": title.strip(),
                "description": description.strip()
            })
        
        if highlights:
            return highlights[:6]  # Limit to 6 highlights
    
    # If we still don't have highlights, create generic ones
    print("Could not extract highlights, creating generic ones")
    return [
        {"title": "Scenic Landscapes", "description": "Experience breathtaking natural beauty throughout your journey."},
        {"title": "Cultural Immersion", "description": "Engage with local traditions and historical sites."},
        {"title": "Culinary Delights", "description": "Savor authentic local cuisine and fine dining experiences."},
        {"title": "Luxury Accommodations", "description": "Relax in carefully selected premium hotels and resorts."},
        {"title": "Seamless Travel", "description": "Enjoy comfortable transportation and well-planned logistics."},
        {"title": "Personalized Experience", "description": "Benefit from customized activities suited to your preferences."}
    ]

def call_gemini_api(prompt: str) -> dict:
    """Call the Gemini API with a prompt and return the parsed JSON response."""
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

def generate_highlights_prompt(tour_name, description):
    """Generate a prompt for the Gemini API to extract highlights"""
    return f"""
Based on the following tour description for "{tour_name}", please create exactly 6 specific highlights that travelers can expect from this tour.

Tour Description:
{description}

Please provide your response in the following JSON format:
[
  {{
    "title": "Venetian Gondola Ride",
    "description": "Glide through Venice's picturesque canals on a private gondola ride accompanied by a professional singer."
  }},
  {{
    "title": "Visit the Colosseum",
    "description": "Explore the ancient history of Rome and the Colosseum, one of the most iconic landmarks in the world."
  }}
]

IMPORTANT RULES:
- Each highlight MUST have exactly two fields: "title" and "description"
- Titles should be 4-5 words maximum, NO ELLIPSES
- DO NOT use "Highlight X:" prefix in titles
- Keep titles COMPLETE and CONCISE
- NO emojis anywhere
- Focus on luxury experiences, cultural encounters, and memorable activities
- Provide exactly 6 highlights
- You are a high end travel planner and our clients are honeymooners
- The response MUST be valid JSON that can be parsed directly
- Do not include any text before or after the JSON array
- Do not include any markdown formatting or code blocks

Remember this is for a honeymoon website, so focus on sophisticated, exclusive experiences.
"""

def get_all_tours():
    """Get all tours from the database"""
    response = supabase.table('tours').select('id, title, description').execute()
    return response.data

def get_tour_by_id(tour_id):
    """Get a specific tour by ID"""
    response = supabase.table('tours').select('id, title, description').eq('id', tour_id).execute()
    if response.data:
        return response.data[0]
    return None

def get_tour_by_code(tour_code):
    """Get a tour by its code from tours_input.csv"""
    # First, load the tour code to name mapping
    tour_mapping = {}
    try:
        with open('tours_input.csv', 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Use the tour number as the code
                tour_mapping[row['0) Number']] = row['2) Name of the tour']
    except FileNotFoundError:
        print("Error: tours_input.csv not found")
        return None
    except Exception as e:
        print(f"Error reading tours_input.csv: {e}")
        return None
    
    if tour_code not in tour_mapping:
        print(f"No tour found with code {tour_code}")
        return None
    
    tour_name = tour_mapping[tour_code]
    response = supabase.table('tours').select('id, title, description').eq('title', tour_name).execute()
    if response.data:
        return response.data[0]
    
    print(f"No tour found with name {tour_name}")
    return None

def clean_highlight_title(title):
    """Clean the highlight title for a luxury website"""
    # Remove patterns like "Highlight 1:", "Highlight 2: ", etc.
    cleaned_title = re.sub(r'^Highlight\s+\d+[\s:]*', '', title)
    
    # Remove numbered prefixes like "1. ", "2. ", etc.
    cleaned_title = re.sub(r'^\d+[\.\s]*', '', cleaned_title)
    
    # Remove bullet points
    cleaned_title = re.sub(r'^[•\*\-][\s]*', '', cleaned_title)
    
    # Remove markdown formatting (bold, italic)
    cleaned_title = re.sub(r'[*_]{1,2}(.*?)[*_]{1,2}', r'\1', cleaned_title)
    
    # Remove all emojis
    emoji_pattern = re.compile("["
                               u"\U0001F600-\U0001F64F"  # emoticons
                               u"\U0001F300-\U0001F5FF"  # symbols & pictographs
                               u"\U0001F680-\U0001F6FF"  # transport & map symbols
                               u"\U0001F700-\U0001F77F"  # alchemical symbols
                               u"\U0001F780-\U0001F7FF"  # Geometric Shapes
                               u"\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
                               u"\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
                               u"\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
                               u"\U00002702-\U000027B0"  # Dingbats
                               u"\U000024C2-\U0001F251" 
                               "]+", flags=re.UNICODE)
    
    cleaned_title = emoji_pattern.sub(r'', cleaned_title)
    
    # Remove ellipses anywhere in the title
    cleaned_title = re.sub(r'\.{3,}', '', cleaned_title)
    
    # Remove "in..." or "and..." patterns that might be truncated
    cleaned_title = re.sub(r'\s+in\.{0,3}$', '', cleaned_title, flags=re.IGNORECASE)
    cleaned_title = re.sub(r'\s+and\.{0,3}$', '', cleaned_title, flags=re.IGNORECASE)
    
    # Capitalize the first letter of each word for a refined look
    cleaned_title = ' '.join(word.capitalize() for word in cleaned_title.split())
    
    # Print the before and after for debugging
    print(f"Original title: '{title}'")
    print(f"Cleaned title: '{cleaned_title}'")
    
    return cleaned_title.strip()

def generate_and_store_highlights(tour, override=False):
    """Generate highlights for a tour and store them in the database"""
    tour_id = tour['id']
    tour_name = tour['title']  # Changed from 'name' to 'title' to match schema
    description = tour['description']
    
    # Check if highlights already exist for this tour
    existing_highlights = supabase.table('tour_highlights').select('id').eq('tour_id', tour_id).execute()
    
    if existing_highlights.data and not override:
        print(f"Highlights already exist for tour '{tour_name}', skipping (use -override to replace)")
        return
    elif existing_highlights.data and override:
        print(f"Deleting existing highlights for tour '{tour_name}'")
        for highlight in existing_highlights.data:
            supabase.table('tour_highlights').delete().eq('id', highlight['id']).execute()
    
    print(f"Generating highlights for tour: {tour_name}")
    
    # Generate highlights using Gemini API
    user_prompt = generate_highlights_prompt(tour_name, description)
    
    try:
        # Call Gemini API - it returns the parsed JSON (list of highlight dicts)
        highlights = call_gemini_api(user_prompt)
        
        # Validate the response is a list
        if not isinstance(highlights, list):
             print(f"Error: API did not return a list of highlights for {tour_name}. Response: {highlights}")
             return False
        
        # Limit to 6 highlights just in case API returns more
        highlights = highlights[:6]

        # Store each highlight in the database
        now = datetime.now().isoformat()
        for i, highlight in enumerate(highlights):
            # Validate highlight structure
            if not isinstance(highlight, dict) or 'title' not in highlight or 'description' not in highlight:
                print(f"Warning: Skipping invalid highlight format: {highlight}")
                continue

            # Clean the title to remove prefixes and emojis
            original_title = highlight.get('title', f"Highlight {i+1}")
            cleaned_title = clean_highlight_title(original_title)
            
            highlight_data = {
                "tour_id": tour_id,
                "title": cleaned_title,
                "description": highlight.get('description', ""),
                "image": "",  # Empty as requested
                "order": i + 1,  # 1-based ordering
                "created_at": now,
                "updated_at": now
            }
            
            response = supabase.table('tour_highlights').insert(highlight_data).execute()
            print(f"Stored highlight {i+1} for tour '{tour_name}': {cleaned_title}")
        
        print(f"Successfully stored {len(highlights)} highlights for tour: {tour_name}")
        return True
        
    except Exception as e:
        print(f"Error generating highlights for tour {tour_name}: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Generate tour highlights')
    parser.add_argument('-tour', type=str, help='Process specific tour by tour number (e.g., 1)')
    parser.add_argument('-id', type=str, help='Process specific tour by tour ID (UUID)')
    parser.add_argument('-override', action='store_true', help='Override existing highlights')
    args = parser.parse_args()
    
    if args.id:
        # Process a single tour by ID
        tour = get_tour_by_id(args.id)
        if tour:
            generate_and_store_highlights(tour, args.override)
        else:
            print(f"No tour found with ID {args.id}")
    elif args.tour:
        # Process a single tour by number
        tour = get_tour_by_code(args.tour)
        if tour:
            generate_and_store_highlights(tour, args.override)
    else:
        # Process all tours
        tours = get_all_tours()
        print(f"Processing {len(tours)} tours")
        
        successful = 0
        for tour in tours:
            try:
                if generate_and_store_highlights(tour, args.override):
                    successful += 1
            except Exception as e:
                print(f"Failed to process tour {tour['title']}: {str(e)}")
        
        print(f"Completed processing {successful} of {len(tours)} tours successfully.")

if __name__ == "__main__":
    main()
