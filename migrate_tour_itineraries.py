import argparse
import requests
import json
import os
import time
import re
from datetime import datetime
from supabase import create_client, Client

# API credentials
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'

# Supabase credentials
SUPABASE_URL = "https://jeiuruhneitvfyjkmbvj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaXVydWhuZWl0dmZ5amttYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjU5NzQsImV4cCI6MjA1ODI0MTk3NH0.iYBsdI4p7o7rKbrMHstzis4KZYV_ks2p09pmtj5-bTo"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Database table names
TOURS_TABLE = "tours"
TOUR_ITINERARIES_TABLE = "tour_itineraries"

# Create a directory for results if it doesn't exist
os.makedirs("itinerary_results", exist_ok=True)

def call_gemini_api(prompt, model="gemini-2.0-flash"):
    """
    Call the Gemini API with a prompt
    
    Args:
        prompt: The prompt to send to Gemini
        model: The Gemini model to use
    
    Returns:
        The response content from Gemini
    """
    # Construct the API URL with the API key and model
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
    
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
        
        print(f"Sending prompt to Gemini API ({model}): {prompt[:100]}...")
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

def extract_itinerary_sections_from_gemini_response(response):
    """
    Extract itinerary sections from Gemini API response
    
    Args:
        response: The response text from Gemini API
    
    Returns:
        List of section dictionaries with day_range, title, content, and order_index
    """
    try:
        # Try to find and parse JSON in the response
        json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # If no JSON code block, try to find JSON object directly
            json_match = re.search(r'(\[.*\])', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                print("No JSON found in Gemini response")
                return None
        
        # Parse the JSON
        data = json.loads(json_str)
        
        # Validate sections
        valid_sections = []
        for i, section in enumerate(data):
            if 'day_range' not in section or 'title' not in section or 'content' not in section:
                print(f"Section {i+1} is missing required fields")
                continue
                
            # Create a valid section object
            valid_section = {
                'day_range': section['day_range'],
                'title': section['title'],
                'content': section['content'],
                'order_index': section.get('order_index', i + 1)
            }
            
            valid_sections.append(valid_section)
        
        return valid_sections
            
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON from Gemini response: {e}")
        
        # Try alternative parsing if JSON parsing fails
        sections = []
        
        # Try to match "Days X-Y: Title" pattern
        pattern = re.compile(r'Days? ([\d-]+):\s*([^\n]+)\s*(.*?)(?=Days? [\d-]+:|$)', re.DOTALL)
        matches = list(pattern.finditer(response))
        
        if matches:
            for i, match in enumerate(matches):
                day_range = match.group(1)
                title = match.group(2).strip()
                content = match.group(3).strip()
                
                sections.append({
                    'day_range': day_range,
                    'title': title,
                    'content': content,
                    'order_index': i + 1
                })
            
            print(f"Extracted {len(sections)} sections using regex pattern")
            return sections
        
        return None
    except Exception as e:
        print(f"Error extracting sections from Gemini response: {e}")
        return None

def get_tour_itinerary_sections(tour_id, tour_name, tour_description):
    """
    Get the itinerary sections for a tour using Gemini
    
    Args:
        tour_id: ID of the tour
        tour_name: Name of the tour
        tour_description: Description of the tour
    
    Returns:
        List of section dictionaries with day_range, title, content, and order_index
    """
    prompt = f"""
    You are a luxury travel itinerary expert. I need you to analyze this tour description and break it down into clear day-by-day sections.

    Tour Name: {tour_name}
    Tour Description: {tour_description}

    Please identify the main sections of this tour itinerary and structure them as follows:
    1. Identify day ranges (e.g., "Days 1-3", "Days 4-6", "Day 7")
    2. Create a title for each section
    3. Include the detailed content for each section

    Format your response as a JSON array with the following structure:
    ```json
    [
        {{
            "day_range": "1-3",
            "title": "Section Title",
            "content": "Detailed description of what happens during these days...",
            "order_index": 1
        }},
        {{
            "day_range": "4-6",
            "title": "Another Section Title",
            "content": "More detailed description...",
            "order_index": 2
        }}
    ]
    ```

    Important:
    - If the tour description already has clear day sections, maintain those divisions
    - If the description lacks clear day sections, create logical divisions based on the content
    - Make sure each section has a descriptive title and detailed content
    - Ensure the order_index reflects the sequence of the itinerary
    - Review the content of each section and ensure it's an exciting plan for a luxury traveller on a honeymoon. Make slight changes when needed.
    - Please avoid mentioning hotels unless we are talking about something like a resort or a special experience.
    - You can mention vague restaurants concepts like 'Michlein start restaurants' for places that stand out on cuisine like Japan, France, Italy, Spain, etc.
         """
    
    response = call_gemini_api(prompt)
    
    if not response:
        print(f"Failed to get itinerary sections from Gemini for tour: {tour_name}")
        return None
        
    sections = extract_itinerary_sections_from_gemini_response(response)
    
    if not sections:
        print(f"Failed to extract itinerary sections from Gemini response for tour: {tour_name}")
        return None
        
    print(f"Extracted {len(sections)} itinerary sections for tour: {tour_name}")
    for section in sections:
        print(f"  - {section['day_range']}: {section['title']}")
        
    return sections

def get_tours_from_supabase(tour_id=None):
    """
    Get tours from Supabase
    
    Args:
        tour_id: Specific tour ID to get (optional)
    
    Returns:
        List of tour dictionaries
    """
    try:
        query = supabase.table(TOURS_TABLE).select("id, name, description")
        
        if tour_id:
            query = query.eq("id", tour_id)
            
        response = query.execute()
        
        if response.data:
            print(f"Found {len(response.data)} tours")
            return response.data
        else:
            print("No tours found")
            return []
    except Exception as e:
        print(f"Error getting tours from Supabase: {e}")
        return []

def check_existing_itinerary(tour_id):
    """
    Check if a tour already has itinerary sections in the database
    
    Args:
        tour_id: ID of the tour
    
    Returns:
        List of existing itinerary sections or None if none exist
    """
    try:
        response = supabase.table(TOUR_ITINERARIES_TABLE).select("*").eq("tour_id", tour_id).execute()
        
        if response.data:
            print(f"Tour {tour_id} already has {len(response.data)} itinerary sections")
            return response.data
        else:
            print(f"Tour {tour_id} has no existing itinerary sections")
            return None
    except Exception as e:
        print(f"Error checking existing itinerary sections: {e}")
        return None

def delete_existing_itinerary(tour_id):
    """
    Delete existing itinerary sections for a tour
    
    Args:
        tour_id: ID of the tour
    
    Returns:
        True if successful, False otherwise
    """
    try:
        response = supabase.table(TOUR_ITINERARIES_TABLE).delete().eq("tour_id", tour_id).execute()
        print(f"Deleted existing itinerary sections for tour {tour_id}")
        return True
    except Exception as e:
        print(f"Error deleting existing itinerary sections: {e}")
        return False

def save_itinerary_to_supabase(tour_id, sections):
    """
    Save itinerary sections to Supabase
    
    Args:
        tour_id: ID of the tour
        sections: List of section dictionaries
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # Insert each section as a separate row
        for section in sections:
            # Prepare data for insertion
            data = {
                "tour_id": tour_id,
                "day_range": section["day_range"],
                "title": section["title"],
                "content": section["content"],
                "order_index": section["order_index"]
            }
            
            # Insert into database
            response = supabase.table(TOUR_ITINERARIES_TABLE).insert(data).execute()
            
            if not response.data:
                print(f"Failed to insert section {section['order_index']} for tour {tour_id}")
                return False
                
        print(f"Successfully saved {len(sections)} itinerary sections for tour {tour_id}")
        return True
    except Exception as e:
        print(f"Error saving itinerary sections to Supabase: {e}")
        return False

def process_tour(tour_id, tour_name, tour_description):
    """
    Process a tour to extract and save itinerary sections
    
    Args:
        tour_id: ID of the tour
        tour_name: Name of the tour
        tour_description: Description of the tour
    
    Returns:
        Dictionary with processing results
    """
    print(f"\n{'='*80}")
    print(f"Processing tour: {tour_name} (ID: {tour_id})")
    print(f"{'='*80}")
    
    # Get itinerary sections from Gemini
    sections = get_tour_itinerary_sections(tour_id, tour_name, tour_description)
    
    if not sections:
        print(f"Failed to get itinerary sections for tour: {tour_name}")
        return {
            "tour_id": tour_id,
            "tour_name": tour_name,
            "success": False,
            "message": "Failed to get itinerary sections"
        }
    
    # Save sections to Supabase
    success = save_itinerary_to_supabase(tour_id, sections)
    
    if not success:
        print(f"Failed to save itinerary sections for tour: {tour_name}")
        return {
            "tour_id": tour_id,
            "tour_name": tour_name,
            "success": False,
            "message": "Failed to save itinerary sections to database"
        }
    
    # Save results to a file for reference
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_filename = f"itinerary_results/tour_{tour_id}_itinerary_{timestamp}.json"
    with open(results_filename, 'w') as f:
        json.dump({
            "tour_id": tour_id,
            "tour_name": tour_name,
            "sections": sections
        }, f, indent=2)
    
    print(f"Tour processing complete: {tour_name}")
    print(f"Saved {len(sections)} itinerary sections")
    print(f"Results saved to: {results_filename}")
    
    return {
        "tour_id": tour_id,
        "tour_name": tour_name,
        "success": True,
        "sections_count": len(sections),
        "sections": sections
    }

def main():
    """
    Main function
    """
    parser = argparse.ArgumentParser(description='Generate tour itinerary sections')
    parser.add_argument('--tour-id', type=str, help='Specific tour ID to process')
    parser.add_argument('--override', action='store_true', 
                        help='Override existing itinerary sections for tours')
    args = parser.parse_args()
    
    print("=" * 80)
    print(f"Tour Itinerary Generator")
    print(f"Override existing itinerary sections: {args.override}")
    if args.tour_id:
        print(f"Processing specific tour ID: {args.tour_id}")
    print("=" * 80)
    
    # Get tours from Supabase
    tours = get_tours_from_supabase(args.tour_id)
    
    if not tours:
        print("No tours found to process")
        return
    
    # Track all results
    all_results = []
    
    # Process each tour
    for tour in tours:
        try:
            # Check if the tour already has itinerary sections
            existing_sections = check_existing_itinerary(tour['id'])
            
            if existing_sections and not args.override:
                print(f"Tour {tour['name']} (ID: {tour['id']}) already has itinerary sections. Skipping.")
                print(f"Use --override to process this tour anyway.")
                continue
            
            # If override is set and there are existing sections, delete them
            if existing_sections and args.override:
                print(f"Deleting existing itinerary sections for tour {tour['name']} (ID: {tour['id']})")
                delete_existing_itinerary(tour['id'])
            
            # Process the tour
            result = process_tour(
                tour_id=tour['id'],
                tour_name=tour['name'],
                tour_description=tour.get('description', '')
            )
            all_results.append(result)
        except Exception as e:
            print(f"Error processing tour {tour['name']}: {e}")
            continue
    
    # Save all results to a file
    if all_results:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_filename = f"itinerary_results/all_itinerary_results_{timestamp}.json"
        with open(results_filename, 'w') as f:
            json.dump(all_results, f, indent=2)
        
        print(f"\nAll tours processed. Results saved to {results_filename}")
        
        # Print summary
        success_count = sum(1 for result in all_results if result.get('success', False))
        print(f"Successfully processed {success_count}/{len(all_results)} tours")
    else:
        print("\nNo tours were processed. No results to save.")

if __name__ == "__main__":
    main()