import json
import requests
from supabase import create_client, Client
from postgrest.exceptions import APIError
import re
import unicodedata
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
import os
import random

# Supabase credentials (ensure these are correct)
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_MODEL = "gemini-2.5-pro-preview-03-25" # Using the specified Gemini model

# --- Supabase Client Initialization ---
if not SUPABASE_SERVICE_KEY:
    print("Error: SUPABASE_SERVICE_KEY environment variable not set.")
    exit(1)
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.")
    exit(1)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("Supabase client initialized successfully.")
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    exit(1)

# --- Gemini API Call Function (Adapted from populate_tours.py) ---
def call_gemini_api(prompt: str) -> Optional[Dict[str, Any]]:
    """
    Call the Gemini API with a prompt and return the parsed JSON response.
    Implements exponential backoff for retries.
    Returns None if the API call fails or JSON parsing fails after retries.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_API_MODEL}:generateContent?key={GEMINI_API_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{"parts": [{"text": prompt.strip()}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.5
        },
    }

    max_retries = 4
    base_retry_delay = 5

    for attempt in range(max_retries):
        try:
            print(f"\nAttempt {attempt + 1}/{max_retries}: Sending prompt to Gemini API ({GEMINI_API_MODEL})...")

            response = requests.post(url, headers=headers, json=payload, timeout=120)

            if response.status_code != 200:
                if response.status_code == 429 or response.status_code >= 500:
                    print(f"Gemini API returned status {response.status_code}: {response.text[:200]}...")
                    if attempt + 1 < max_retries:
                        retry_delay = base_retry_delay * (2 ** attempt) + random.uniform(0, 1)
                        print(f"Rate limit or server error encountered. Retrying in {retry_delay:.2f} seconds...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        print("Max retries reached after encountering rate limits or server errors.")
                        return None
                else:
                    response.raise_for_status()

            result = response.json()

            if not result.get('candidates') or not result['candidates'][0].get('content') or not result['candidates'][0]['content'].get('parts'):
                 print("Warning: Invalid response structure from Gemini API (Code 200). No candidates or content parts.")
                 print(f"Full response: {result}")
                 if attempt + 1 < max_retries:
                      retry_delay = base_retry_delay * (2 ** attempt) + random.uniform(0, 1)
                      print(f"Invalid response structure. Retrying in {retry_delay:.2f} seconds...")
                      time.sleep(retry_delay)
                      continue
                 else:
                      print("Max retries reached after invalid response structure.")
                      return None

            json_content = result['candidates'][0]['content']['parts'][0].get('text', '')

            if not json_content:
                 print("Warning: Empty text content received from Gemini (Code 200).")
                 if attempt + 1 < max_retries:
                      retry_delay = base_retry_delay * (2 ** attempt) + random.uniform(0, 1)
                      print(f"Empty content received. Retrying in {retry_delay:.2f} seconds...")
                      time.sleep(retry_delay)
                      continue
                 else:
                      print("Max retries reached after empty content.")
                      return None

            print("Received JSON content from Gemini.")
            parsed_data = json.loads(json_content)
            return parsed_data

        except requests.exceptions.RequestException as e:
            print(f"Network/Request Error (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt + 1 == max_retries:
                print("Max retries reached after network errors.")
                return None
            retry_delay = base_retry_delay * (2 ** attempt) + random.uniform(0, 1)
            print(f"Retrying in {retry_delay:.2f} seconds...")
            time.sleep(retry_delay)
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print(f"Invalid JSON received: {json_content[:500]}...")
            print("Cannot parse API response. Skipping this tour.")
            return None
        except Exception as e:
            print(f"Unexpected Error during API call (Attempt {attempt + 1}/{max_retries}): {e}")
            if 'response' in locals() and response:
                 print(f"Response status: {response.status_code}")
                 try:
                     print(f"Response text: {response.text[:500]}...")
                 except Exception:
                     print("Could not decode response text.")

            if attempt + 1 == max_retries:
                print("Max retries reached after unexpected errors.")
                return None
            retry_delay = base_retry_delay * (2 ** attempt) + random.uniform(0, 1)
            print(f"Retrying in {retry_delay:.2f} seconds...")
            time.sleep(retry_delay)

    print("Exited retry loop without success.")
    return None

# --- Prompt Generation ---
def generate_vector_enhancement_prompt(duration: int, collection: Optional[str], description: str, summary: Optional[str]) -> str:
    """Generates the prompt for Gemini API to extract vectorizable features including the geographical region."""

    # Clean up description and summary slightly
    description = description.replace('\n', ' ').replace('\r', '').strip() if description else ''
    summary = summary.replace('\n', ' ').replace('\r', '').strip() if summary else ''
    description_preview = description[:500] + "..." if len(description) > 500 else description
    summary_preview = summary[:300] + "..." if len(summary) > 300 else summary # Shorter preview for summary

    prompt = f"""
Analyze the following honeymoon tour information to generate structured data suitable for vector search matching based on user preferences.

Tour Information:
- Duration: {duration} days
- Collection: {collection or 'Not specified'}
- Summary: {summary_preview or 'Not provided'}
- Description: {description_preview or 'Not provided'}

Based *only* on the provided description, summary, duration, collection, and general geographical knowledge of locations likely mentioned, generate a JSON object with the following structure and keys. Assign 1 if the characteristic is likely present or possible based on the info, and 0 otherwise. For 'geo_region', select the single most appropriate region from the specified list. Do not add any commentary outside the JSON structure.

{{
  "activity": {{
    "wildlife_encounters": integer, // e.g., safaris, whale watching, bird sanctuaries, jungle treks
    "historical_sites": integer, // e.g., ancient ruins, castles, historical districts, museums
    "beach_water_activities": integer, // e.g., relaxing on beaches, island swimming/hopping, snorkeling, diving, sailing
    "food_wine_experiences": integer, // if the tour mentions food / wine activites OR if the places in the tour are known for food / wine / restaurants
    "hiking_active_pursuits": integer, // e.g., trekking, mountain climbing, cycling, kayaking (more than just casual walks)
    "urban_landscapes": integer, // e.g., exploring cities, modern architecture, nightlife, shopping districts
    "relaxation_spas": integer, // if the places mention spa / wellness / relaxation OR if the tour is in a luxury area with good hotels where spas can be expected
    "cultural_experiences": integer // e.g., local markets, artisan crafts, traditional performances, village visits, temples/religious sites
  }},
  "callouts": {{
    "very_hot_climate": integer, // e.g., mentions desert, tropical heat, consistently high temperatures likely
    "very_cold_climate": integer, // e.g., mentions snow, arctic conditions, mountains in winter, consistently low temperatures likely
    "intense_hiking": integer, // e.g., explicitly mentions strenuous treks, multi-day hikes, significant elevation gain
    "very_remote": integer, // e.g., explicitly mentions isolated locations, limited infrastructure, far from major cities/airports
    "long_flights": integer // Assign 1 if the destination is typically considered a long-haul flight from Europe/North America (e.g., Australia, SE Asia, South America, deep Africa), 0 otherwise (e.g., Europe, Caribbean, North Africa)
  }},
  "best_season": {{ // Assign 1 for seasons generally considered ideal for this destination/activities, 0 otherwise. Infer based on common knowledge if description/summary lacks specifics.
    "spring": integer, // March-May in Northern Hemisphere, Sep-Nov in Southern
    "summer": integer, // June-August in Northern Hemisphere, Dec-Feb in Southern
    "autumn": integer, // September-November in Northern Hemisphere, March-May in Southern
    "winter": integer // December-February in Northern Hemisphere, June-August in Southern
  }},
  "pace": string, // Choose ONE: "relaxed" (minimal travel between locations, focus on unwinding), "balanced" (mix of travel/activities and free time), or "active" (frequent location changes, packed itinerary)
  "geo_region": string // Choose ONE: "Europe", "Asia", "Africa", "North America & Hawaii", "South America", "Oceania & Pacific" based on the primary location(s) of the tour.
}}

Ensure the output is ONLY the valid JSON object requested.
"""
    return prompt.strip()

# --- Fetch Tours from Supabase ---
def fetch_tours_from_supabase(tour_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetches tours from Supabase, optionally filtering by ID."""
    try:
        # MODIFIED: Added 'summary', 'geo_region' and override-check columns to select list
        select_columns = 'id, title, duration, collection, description, summary, activity, callouts, best_season, pace, geo_region'
        query = supabase.table('tours').select(select_columns)
        if tour_id:
            print(f"Fetching specific tour with ID: {tour_id}")
            query = query.eq('id', tour_id)
        else:
            print("Fetching all tours...")

        # Execute the query
        response = query.execute()

        # Check if data was returned successfully
        if response.data:
            print(f"Fetched {len(response.data)} tour(s).")
            # Keep basic validation for essential prompt fields (duration, description)
            # Summary is optional for the prompt but needed if present
            valid_tours = [
                tour for tour in response.data
                if tour.get('duration') is not None and tour.get('description') is not None
            ]
            if len(valid_tours) < len(response.data):
                print(f"Warning: {len(response.data) - len(valid_tours)} tours have missing duration or description (required for prompt).")
            return valid_tours # Return tours with potentially null override fields, summary, and geo_region
        else:
            # Handles cases where the query ran fine but returned no matching rows
            if tour_id:
                 print(f"No tour found with ID: {tour_id}")
            else:
                 print("No tours found matching the criteria.")
            return []
    except APIError as e: # Catch specific API errors during fetch execution
         print(f"Supabase API Error fetching tours: {e}") # APIError usually has good details
         return []
    except Exception as e:
        # Catch any other unexpected errors during the fetch process
        print(f"Unexpected Error fetching tours from Supabase: {e}")
        return []

# --- Update Tour in Supabase ---
def update_tour_vector_data(tour_id: str, vector_data: Dict[str, Any]) -> bool:
    """Updates a tour in Supabase with the generated vector data."""
    try:
        update_payload = {
            "activity": vector_data.get("activity"),
            "callouts": vector_data.get("callouts"),
            "best_season": vector_data.get("best_season"),
            "pace": vector_data.get("pace"),
            "geo_region": vector_data.get("geo_region"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        # Remove keys with None values before sending
        update_payload = {k: v for k, v in update_payload.items() if v is not None}

        # Check if we have the core fields (now 5 + updated_at)
        # Exclude updated_at from the count
        if len([k for k in update_payload if k != 'updated_at']) < 5 :
            print(f"Warning: Incomplete vector data generated for tour {tour_id}. Skipping update.")
            print(f"Generated data: {vector_data}")
            print(f"Payload after None removal: {update_payload}")
            return False

        print(f"\n--- Data to be sent to Supabase for tour {tour_id} ---")
        print(json.dumps(update_payload, indent=2))
        print("--- End Supabase Data ---")

        try:
            print(f"Updating tour {tour_id} in Supabase...")
            # Execute the update
            response = supabase.table('tours').update(update_payload).eq('id', tour_id).execute()

            # If execute() completes without raising APIError, the DB operation was likely successful.
            # Postgrest typically returns the updated data or an empty list on success.
            # We can add a check here if needed, but lack of exception is a good sign.
            print(f"Successfully updated tour {tour_id}.")
            return True

        except APIError as e:
            # Handle specific database errors reported by Supabase/PostgREST
            print(f"Supabase API Error updating tour {tour_id}: {e.message}")
            if hasattr(e, 'details'): print(f"Details: {e.details}")
            if hasattr(e, 'hint'): print(f"Hint: {e.hint}")
            return False
        except Exception as e:
            # Catch other potential exceptions during the update itself
            print(f"Unexpected error during Supabase update for tour {tour_id}: {e}")
            return False

    except Exception as e: # Catch errors during payload preparation
        print(f"Error preparing update payload for tour {tour_id} in Supabase: {e}")
        return False

# --- Main Processing Logic ---
def process_tour(tour_data: Dict[str, Any]) -> bool:
    """Processes a single tour: generates prompt, calls API, updates DB."""
    tour_id = tour_data.get('id')
    title = tour_data.get('title', 'N/A')
    duration = tour_data.get('duration')
    collection = tour_data.get('collection')
    description = tour_data.get('description')
    summary = tour_data.get('summary')

    if duration is None or description is None:
        print(f"Skipping tour {tour_id} ('{title}') due to missing duration or description.")
        return False

    print(f"\n--- Processing Tour: '{title}' (ID: {tour_id}) ---")

    prompt = generate_vector_enhancement_prompt(duration, collection, description, summary)
    generated_data = call_gemini_api(prompt)

    if not generated_data:
        print(f"Failed to get valid data from Gemini for tour '{title}'. Skipping update.")
        return False

    print(f"\n--- JSON received from Gemini for tour {tour_id} ---")
    print(json.dumps(generated_data, indent=2))
    print("--- End Gemini JSON ---")

    # Validation
    required_keys = ["activity", "callouts", "best_season", "pace", "geo_region"]
    if not all(key in generated_data for key in required_keys):
        print(f"Error: Gemini response for tour '{title}' is missing required keys ({required_keys}). Response: {generated_data}")
        return False

    # Type validation
    valid_types = isinstance(generated_data.get("activity"), dict) and \
                  isinstance(generated_data.get("callouts"), dict) and \
                  isinstance(generated_data.get("best_season"), dict) and \
                  isinstance(generated_data.get("pace"), str) and \
                  isinstance(generated_data.get("geo_region"), str) # Added geo_region type check

    if not valid_types:
        print(f"Error: Gemini response for tour '{title}' has incorrect data types.")
        # You could print which field has the wrong type for more detail
        return False

    # Pace validation
    allowed_paces = ["relaxed", "balanced", "active"]
    if generated_data["pace"] not in allowed_paces:
        print(f"Warning: Invalid 'pace' value '{generated_data['pace']}' for tour '{title}'. Setting to 'balanced'.")
        generated_data["pace"] = "balanced"

    # Geo Region validation
    allowed_regions = ["Europe", "Asia", "Africa", "North America & Hawaii", "South America", "Oceania & Pacific"]
    if generated_data["geo_region"] not in allowed_regions:
        print(f"Warning: Invalid 'geo_region' value '{generated_data['geo_region']}' for tour '{title}'. Setting to None.")
        generated_data["geo_region"] = None # Set to None if invalid, will be excluded from update

    # Update Supabase
    success = update_tour_vector_data(tour_id, generated_data)
    return success

# --- Main Execution ---
def main():
    parser = argparse.ArgumentParser(description='Generate vectorizable tour features using Gemini API and update Supabase.')
    parser.add_argument('-id', '--tour_id', type=str, help='Process a specific tour by its UUID.')
    parser.add_argument('-o', '--override', action='store_true', help='Override existing data in activity, callouts, best_season, pace, and geo_region columns.')

    args = parser.parse_args()

    if not SUPABASE_SERVICE_KEY:
        print("ERROR: SUPABASE_SERVICE_KEY is not set. Check environment variables or .env file.")
        return
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY is not set. Check environment variables or .env file.")
        return

    tours_to_process = fetch_tours_from_supabase(args.tour_id)

    if not tours_to_process:
        print("No tours to process. Exiting.")
        return

    total_tours = len(tours_to_process)
    processed_count = 0
    successful_updates = 0
    failed_updates = 0
    skipped_count = 0

    if args.tour_id:
         print(f"\nStarting processing for single tour ID: {args.tour_id}...")
    else:
         print(f"\nStarting processing for {total_tours} tour(s)...")
         if args.override:
             print("Override mode: Existing data will be overwritten.")
         else:
             print("Standard mode: Tours with existing data in target columns (activity, callouts, best_season, pace, geo_region) will be skipped.")

    for i, tour in enumerate(tours_to_process):
        tour_id = tour.get('id', 'N/A')
        title = tour.get('title', 'N/A')

        if not args.override:
            # Check if ALL target fields are already populated
            activity_data = tour.get('activity')
            callouts_data = tour.get('callouts')
            season_data = tour.get('best_season')
            pace_data = tour.get('pace')
            geo_region_data = tour.get('geo_region') # Fetch geo_region data

            # Check if all are non-None AND pace/geo_region are not empty strings
            if activity_data is not None and \
               callouts_data is not None and \
               season_data is not None and \
               pace_data is not None and pace_data != "" and \
               geo_region_data is not None and geo_region_data != "": # Add geo_region check
                print(f"\nSkipping tour '{title}' (ID: {tour_id}) - Target columns already populated.")
                skipped_count += 1
                continue

        processed_count += 1
        try:
            if process_tour(tour):
                successful_updates += 1
            else:
                # process_tour logs its own errors, just count failure
                failed_updates += 1
        except KeyboardInterrupt:
             print("\n\nProcess interrupted by user.")
             break
        except Exception as e:
            print(f"\n!!! Critical error during main loop for tour {tour_id} ('{title}') !!!")
            print(f"Error: {e}")
            failed_updates += 1
            # Optional: Add more detailed error logging here if needed
            # import traceback
            # traceback.print_exc()

    print("\n--------------------------------------------------")
    print("Processing Complete.")
    print(f"Total Tours Found:      {total_tours}")
    print(f"Attempted Processing:   {processed_count}")
    print(f"Successfully Updated:   {successful_updates}")
    print(f"Failed/Skipped Update:  {failed_updates}") # Combines actual failures and validation skips within process_tour
    if not args.override:
        print(f"Skipped (Already Populated): {skipped_count}")
    print("--------------------------------------------------")

if __name__ == "__main__":
    main() 