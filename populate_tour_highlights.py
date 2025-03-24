import json
import requests
import re
from datetime import datetime
import argparse
from supabase import create_client, Client
import time

# Supabase credentials
SUPABASE_URL = "https://jeiuruhneitvfyjkmbvj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaXVydWhuZWl0dmZ5amttYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjU5NzQsImV4cCI6MjA1ODI0MTk3NH0.iYBsdI4p7o7rKbrMHstzis4KZYV_ks2p09pmtj5-bTo"

# Initialize Perplexity API config
PERPLEXITY_API_KEY = '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'
PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def extract_highlights_from_text(content):
    """Extract highlights from text content using various methods"""
    # Print the first extraction attempt
    print("Attempting to extract highlights from API response...")
    
    # First, try to extract numbered items with title and description
    # This pattern looks for numbered items (1., 2., etc.) followed by a title and description
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
                # Look for similar text before the ellipses
                title_prefix = title.split('...')[0].strip()
                if len(title_prefix) > 5:  # Only if we have enough prefix to search
                    # Look for a more complete version in the original text
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
    
    # If the above didn't work, try other patterns
    # ... (rest of the existing extraction methods)
    
    # Try to find JSON array in the content
    json_pattern = re.search(r'\[\s*{.*}\s*\]', content, re.DOTALL)
    if json_pattern:
        try:
            return json.loads(json_pattern.group(0))
        except json.JSONDecodeError:
            print("Found JSON-like pattern but couldn't parse it")
    
    # Try to extract from markdown code block
    if "```json" in content and "```" in content.split("```json", 1)[1]:
        try:
            json_block = content.split("```json", 1)[1].split("```", 1)[0].strip()
            return json.loads(json_block)
        except json.JSONDecodeError:
            print("Found code block but couldn't parse it as JSON")
    
    # Pattern for numbered or bulleted highlights with titles and descriptions
    patterns = [
        # Look for numbered highlights with titles
        r'(?:\d+\.\s+)([^:]+):\s+([^\n]+)',
        # Look for "Title:" followed by description
        r'"title":\s*"([^"]+)"[^"]*"description":\s*"([^"]+)"',
        # Look for **Title** followed by description
        r'\*\*([^*]+)\*\*\s*[-–]\s*([^\n]+)',
    ]
    
    highlights = []
    for pattern in patterns:
        matches = re.findall(pattern, content)
        if matches:
            for title, description in matches:
                highlights.append({
                    "title": title.strip(),
                    "description": description.strip()
                })
            
            # If we found at least 4 highlights, consider it a success
            if len(highlights) >= 4:
                print(f"Successfully extracted {len(highlights)} highlights using pattern: {pattern}")
                # Limit to 6 highlights
                return highlights[:6]
    
    # If we still don't have highlights, create generic ones
    if not highlights:
        print("Could not extract highlights, creating generic ones")
        return [
            {"title": "Scenic Landscapes", "description": "Experience breathtaking natural beauty throughout your journey."},
            {"title": "Cultural Immersion", "description": "Engage with local traditions and historical sites."},
            {"title": "Culinary Delights", "description": "Savor authentic local cuisine and fine dining experiences."},
            {"title": "Luxury Accommodations", "description": "Relax in carefully selected premium hotels and resorts."},
            {"title": "Seamless Travel", "description": "Enjoy comfortable transportation and well-planned logistics."},
            {"title": "Personalized Experience", "description": "Benefit from customized activities suited to your preferences."}
        ]
    
    return highlights[:6]  # Limit to 6 highlights

def call_perplexity_api(system_prompt: str, user_prompt: str) -> list:
    """Call the Perplexity API and extract highlights from the response"""
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
        
        if not response.ok:
            print(f"API error: {response.status_code} - {response.text}")
            raise Exception(f"API returned status code {response.status_code}: {response.text}")
            
        result = response.json()
        if 'choices' not in result or not result['choices']:
            raise Exception("No choices in API response")
            
        content = result['choices'][0]['message']['content']
        
        # Print the FULL content for debugging
        print("========== FULL API RESPONSE ==========")
        print(content)
        print("=======================================")
        
        # Extract highlights using our robust extraction function
        highlights = extract_highlights_from_text(content)
        
        if not highlights or len(highlights) == 0:
            raise Exception("Could not extract any highlights from the API response")
            
        return highlights
        
    except Exception as e:
        print(f"API Request Error: {str(e)}")
        raise

def generate_highlights_prompt(tour_name, description):
    """Generate a prompt for the Perplexity API to extract highlights"""
    return f"""
Based on the following tour description for "{tour_name}", please create exactly 6 specific highlights that travelers can expect from this tour.

Tour Description:
{description}

For each highlight, provide:
1. A COMPLETE title (4-5 words maximum, NO ELLIPSES)
2. A brief 1-2 sentence description

Format your response as a numbered list like this:
1. Venetian Gondola Ride: Glide through Venice's picturesque canals on a private gondola ride accompanied by a professional singer.
2. Florence Art Galleries: Explore world-renowned art collections featuring Renaissance masterpieces by Michelangelo, Leonardo da Vinci, and Botticelli.

IMPORTANT RULES:
- DO NOT truncate titles with ellipses (...)
- DO NOT use "Highlight X:" prefix in titles
- Keep titles COMPLETE and CONCISE (4-5 words maximum)
- NO emojis anywhere
- Focus on luxury experiences, cultural encounters, and memorable activities
- Provide exactly 6 highlights
- YOu are a high end travel planner and our clients are honeymooners

Remember this is for a luxury travel website, so focus on sophisticated, exclusive experiences.
"""

def get_all_tours():
    """Get all tours from the database"""
    response = supabase.table('tours').select('id, name, description').execute()
    return response.data

def get_tour_by_id(tour_id):
    """Get a specific tour by ID"""
    response = supabase.table('tours').select('id, name, description').eq('id', tour_id).execute()
    if response.data:
        return response.data[0]
    return None

def get_tour_by_code(tour_code):
    """Get a tour by its code from tours_incipit.txt"""
    # First, load the tour code to name mapping
    tour_mapping = {}
    with open('tours_incipit.txt', 'r', encoding='utf-8') as file:
        import csv
        reader = csv.DictReader(file)
        for row in reader:
            tour_mapping[row['tour_code']] = row['tour_name']
    
    if tour_code not in tour_mapping:
        print(f"No tour found with code {tour_code}")
        return None
    
    tour_name = tour_mapping[tour_code]
    response = supabase.table('tours').select('id, name, description').eq('name', tour_name).execute()
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
    tour_name = tour['name']
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
    
    # Generate highlights using Perplexity API
    system_prompt = "You are a travel expert specializing in creating elegant, sophisticated content for luxury travel experiences."
    user_prompt = generate_highlights_prompt(tour_name, description)
    
    try:
        highlights = call_perplexity_api(system_prompt, user_prompt)
        
        # Store each highlight in the database
        now = datetime.now().isoformat()
        for i, highlight in enumerate(highlights):
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
    parser.add_argument('-tour', type=str, help='Process specific tour by tour code (e.g., OCE002)')
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
        # Process a single tour by code
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
                print(f"Failed to process tour {tour['name']}: {str(e)}")
        
        print(f"Completed processing {successful} of {len(tours)} tours successfully.")

if __name__ == "__main__":
    main()
