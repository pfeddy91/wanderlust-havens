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

# Supabase credentials (ensure these are correct)
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Database table names
TOURS_TABLE = "tours"
TOUR_LOCATIONS_TABLE = "tour_locations"

# Create a directory for results if it doesn't exist
os.makedirs("location_results", exist_ok=True)

def call_gemini_api(prompt, model="gemini-2.5-pro-exp-03-25"):
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

def extract_locations_from_gemini_response(response):
    """
    Extract location data from Gemini API response
    
    Args:
        response: The response text from Gemini API
    
    Returns:
        List of location dictionaries with name, latitude, longitude, and description
    """
    try:
        # Try to find and parse JSON in the response
        json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # If no JSON code block, try to find JSON object directly
            json_match = re.search(r'(\{.*\})', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                print("No JSON found in Gemini response")
                return None
        
        # Parse the JSON
        data = json.loads(json_str)
        
        # Extract locations
        if 'locations' in data:
            locations = data['locations']
            
            # Validate locations
            valid_locations = []
            for i, location in enumerate(locations):
                if 'name' not in location or 'latitude' not in location or 'longitude' not in location:
                    print(f"Location {i+1} is missing required fields")
                    continue
                    
                # Validate coordinates
                try:
                    lat = float(location['latitude'])
                    lng = float(location['longitude'])
                    
                    if lat < -90 or lat > 90 or lng < -180 or lng > 180:
                        print(f"Location {i+1} has invalid coordinates: {lat}, {lng}")
                        continue
                        
                    # Create a valid location object
                    valid_location = {
                        'name': location['name'],
                        'latitude': lat,
                        'longitude': lng,
                        'description': location.get('description', '')
                    }
                    
                    valid_locations.append(valid_location)
                except (ValueError, TypeError):
                    print(f"Location {i+1} has invalid coordinate format")
                    continue
            
            return valid_locations
        else:
            print("No 'locations' key found in JSON data")
            return None
            
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON from Gemini response: {e}")
        return None
    except Exception as e:
        print(f"Error extracting locations from Gemini response: {e}")
        return None

def get_tour_locations(tour_id, tour_name, tour_description):
    """
    Get the overnight locations for a tour using Gemini
    
    Args:
        tour_id: ID of the tour
        tour_name: Name of the tour
        tour_description: Description of the tour
    
    Returns:
        List of location dictionaries with name, latitude, longitude, and description
    """
    prompt = f"""
    You are a travel itinerary expert. I need you to analyze this tour description and identify the main overnight locations (cities, towns, or specific accommodations) where travelers will stay during this tour.

    Tour Name: {tour_name}
    Tour Description: {tour_description}

    Please identify the main overnight locations for this tour. For each location, provide:
    1. The name of the location (city, national park or similar but NOT a hotel or specific accommodation)
    2. The precise latitude and longitude coordinates
    3. A brief description of what makes this location special (optional)

    Format your response as a JSON object with the following structure:
    {{
        "locations": [
            {{
                "name": "Location Name",
                "latitude": latitude_value,
                "longitude": longitude_value,
                "description": "Brief description of the location" (optional)
            }},
            ...
        ]
    }}

    Important:
    - Only include locations where travelers will actually stay overnight
    - Provide accurate coordinates (latitude between -90 and 90, longitude between -180 and 180)
    - List the locations in the order they would be visited
    - If the exact overnight locations aren't clear from the description, make educated guesses based on the tour's focus and region
    """
    
    response = call_gemini_api(prompt, model="gemini-2.5-pro-exp-03-25")
    
    if not response:
        print(f"Failed to get locations from Gemini for tour: {tour_name}")
        return None
        
    locations = extract_locations_from_gemini_response(response)
    
    if not locations:
        print(f"Failed to extract locations from Gemini response for tour: {tour_name}")
        return None
        
    print(f"Extracted {len(locations)} locations for tour: {tour_name}")
    for location in locations:
        print(f"  - {location['name']}: {location['latitude']}, {location['longitude']}")
        
    return locations

def get_tours_from_supabase(tour_id=None):
    """
    Get tours from Supabase
    
    Args:
        tour_id: Specific tour ID to get (optional)
    
    Returns:
        List of tour dictionaries
    """
    try:
        query = supabase.table(TOURS_TABLE).select("id, title, description")
        
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

def check_existing_locations(tour_id):
    """
    Check if a tour already has locations in the database
    
    Args:
        tour_id: ID of the tour
    
    Returns:
        List of existing locations or None if none exist
    """
    try:
        response = supabase.table(TOUR_LOCATIONS_TABLE).select("*").eq("tour_id", tour_id).execute()
        
        if response.data:
            print(f"Tour {tour_id} already has {len(response.data)} locations")
            return response.data
        else:
            print(f"Tour {tour_id} has no existing locations")
            return None
    except Exception as e:
        print(f"Error checking existing locations: {e}")
        return None

def delete_existing_locations(tour_id):
    """
    Delete existing locations for a tour
    
    Args:
        tour_id: ID of the tour
    
    Returns:
        True if successful, False otherwise
    """
    try:
        response = supabase.table(TOUR_LOCATIONS_TABLE).delete().eq("tour_id", tour_id).execute()
        print(f"Deleted existing locations for tour {tour_id}")
        return True
    except Exception as e:
        print(f"Error deleting existing locations: {e}")
        return False

def save_locations_to_supabase(tour_id, locations):
    """
    Save locations to Supabase
    
    Args:
        tour_id: ID of the tour
        locations: List of location dictionaries
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # Insert each location as a separate row
        for i, location in enumerate(locations):
            # Prepare data for insertion
            data = {
                "tour_id": tour_id,
                "name": location["name"],
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "description": location.get("description", ""),
                "order_index": i + 1  # 1-based index for order
            }
            
            # Insert into database
            response = supabase.table(TOUR_LOCATIONS_TABLE).insert(data).execute()
            
            if not response.data:
                print(f"Failed to insert location {i+1} for tour {tour_id}")
                return False
                
        print(f"Successfully saved {len(locations)} locations for tour {tour_id}")
        return True
    except Exception as e:
        print(f"Error saving locations to Supabase: {e}")
        return False

def process_tour(tour_id, tour_name, tour_description):
    """
    Process a tour to extract and save locations
    
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
    
    # Get locations from Gemini
    locations = get_tour_locations(tour_id, tour_name, tour_description)
    
    if not locations:
        print(f"Failed to get locations for tour: {tour_name}")
        return {
            "tour_id": tour_id,
            "tour_name": tour_name,
            "success": False,
            "message": "Failed to get locations"
        }
    
    # Save locations to Supabase
    success = save_locations_to_supabase(tour_id, locations)
    
    if not success:
        print(f"Failed to save locations for tour: {tour_name}")
        return {
            "tour_id": tour_id,
            "tour_name": tour_name,
            "success": False,
            "message": "Failed to save locations to database"
        }
    
    # Save results to a file for reference
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_filename = f"location_results/tour_{tour_id}_locations_{timestamp}.json"
    with open(results_filename, 'w') as f:
        json.dump({
            "tour_id": tour_id,
            "tour_name": tour_name,
            "locations": locations
        }, f, indent=2)
    
    print(f"Tour processing complete: {tour_name}")
    print(f"Saved {len(locations)} locations")
    print(f"Results saved to: {results_filename}")
    
    return {
        "tour_id": tour_id,
        "tour_name": tour_name,
        "success": True,
        "locations_count": len(locations),
        "locations": locations
    }

def main():
    """
    Main function
    """
    parser = argparse.ArgumentParser(description='Generate tour locations')
    parser.add_argument('--tour-id', type=str, help='Specific tour ID to process')
    parser.add_argument('--override', action='store_true', 
                        help='Override existing locations for tours')
    args = parser.parse_args()
    
    print("=" * 80)
    print(f"Tour Location Generator")
    print(f"Override existing locations: {args.override}")
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
            # Check if the tour already has locations
            existing_locations = check_existing_locations(tour['id'])
            
            if existing_locations and not args.override:
                print(f"Tour {tour['title']} (ID: {tour['id']}) already has locations. Skipping.")
                print(f"Use --override to process this tour anyway.")
                continue
            
            # If override is set and there are existing locations, delete them
            if existing_locations and args.override:
                print(f"Deleting existing locations for tour {tour['title']} (ID: {tour['id']})")
                delete_existing_locations(tour['id'])
            
            # Process the tour
            result = process_tour(
                tour_id=tour['id'],
                tour_name=tour['title'],
                tour_description=tour.get('description', '')
            )
            all_results.append(result)
        except Exception as e:
            print(f"Error processing tour {tour['title']}: {e}")
            continue
    
    # Save all results to a file
    if all_results:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_filename = f"location_results/all_locations_results_{timestamp}.json"
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