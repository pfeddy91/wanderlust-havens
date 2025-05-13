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
import time
import copy

# Supabase credentials (ensure these are correct)
# Supabase credentials
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"
# IMPORTANT: Use the SERVICE ROLE KEY for backend operations like this script.
# Even if other columns update, it's best practice for write operations.
# Please ensure this is your Service Role Key if issues persist beyond vector data.
# SUPABASE_SERVICE_KEY = "YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE" 

GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_TEXT_MODEL = "gemini-2.5-pro-exp-03-25" # For JSON generation
GEMINI_EMBEDDING_MODEL = "gemini-embedding-exp-03-07"   # For generating embeddings

# --- Supabase Client Initialization ---
if not SUPABASE_SERVICE_KEY:
    print("Error: SUPABASE_SERVICE_KEY not set.")
    exit(1)
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not set.")
    exit(1)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("Supabase client initialized successfully.")
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    exit(1)

# --- Gemini API Call Function (for JSON responses) ---
def call_gemini_api_for_json(prompt: str, model: str) -> Optional[Dict[str, Any]]:
    """
    Call the Gemini API with a prompt expecting a JSON response.
    Implements exponential backoff for retries.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{"parts": [{"text": prompt.strip()}]}],
        "generationConfig": {
            "responseMimeType": "application/json", # Critical for getting JSON
            "temperature": 0.3 # Lower temperature for more predictable structured output
        },
    }
    max_retries = 4
    base_retry_delay = 5

    for attempt in range(max_retries):
        try:
            print(f"\nAttempt {attempt + 1}/{max_retries}: Sending prompt to Gemini ({model}) for JSON data...")
            api_response = requests.post(url, headers=headers, json=payload, timeout=180) # Increased timeout

            if api_response.status_code != 200:
                print(f"Gemini API ({model}) returned status {api_response.status_code}: {api_response.text[:200]}...")
                if api_response.status_code == 429 or api_response.status_code >= 500:
                    if attempt + 1 < max_retries:
                        retry_delay = base_retry_delay * (2 ** attempt) + random.uniform(0, 1)
                        print(f"Retrying in {retry_delay:.2f} seconds...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        print(f"Max retries reached for model {model}.")
                        return None
                else:
                    api_response.raise_for_status() # Raise other HTTP errors

            result = api_response.json()
            if not result.get('candidates') or not result['candidates'][0].get('content') or not result['candidates'][0]['content'].get('parts'):
                print(f"Warning: Invalid response structure from Gemini API ({model}). Full response: {result}")
                # (Retry logic for invalid structure can be added here if needed, similar to above)
                      return None

            json_content_str = result['candidates'][0]['content']['parts'][0].get('text', '')
            if not json_content_str:
                print(f"Warning: Empty text content received from Gemini ({model}).")
                      return None

            print(f"Received JSON content from Gemini ({model}).")
            parsed_data = json.loads(json_content_str)
            return parsed_data

        except requests.exceptions.RequestException as e:
            print(f"Network/Request Error with {model} (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt + 1 == max_retries: return None
            time.sleep(base_retry_delay * (2 ** attempt) + random.uniform(0, 1))
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error with {model}: {e}. Invalid JSON: {json_content_str[:500]}...")
            return None
        except Exception as e:
            print(f"Unexpected Error with {model} (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt + 1 == max_retries: return None
            time.sleep(base_retry_delay * (2 ** attempt) + random.uniform(0, 1))
    return None

# --- Gemini API Call Function (for Embeddings) ---
def get_embedding_from_gemini(text_to_embed: str, model: str) -> Optional[List[float]]:
    """
    Call the Gemini API to get an embedding for the given text.
    Implements exponential backoff for retries.
    """
    if not text_to_embed:
        print(f"    WARNING (get_embedding_from_gemini): Empty text provided for embedding (summary was likely empty or None). Skipping.")
        return None

    print(f"    DEBUG (get_embedding_from_gemini): Attempting to embed text (first 100 chars): '{text_to_embed[:100]}...'")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent?key={GEMINI_API_KEY}"
    headers = {'Content-Type': 'application/json'}
    payload = {"model": f"models/{model}", "content": {"parts": [{"text": text_to_embed.strip()}]}}
    max_retries = 4
    base_retry_delay = 5

    for attempt in range(max_retries):
        try:
            print(f"    Attempt {attempt + 1}/{max_retries}: Getting embedding from Gemini ({model})...")
            api_response = requests.post(url, headers=headers, json=payload, timeout=120)

            response_text_preview = "N/A"
            try:
                response_text_preview = api_response.text[:500]
                 except Exception:
                pass

            print(f"    DEBUG (get_embedding_from_gemini): Gemini API response status: {api_response.status_code}")
            if api_response.status_code != 200:
                print(f"    DEBUG (get_embedding_from_gemini): Gemini API response text (preview on non-200): {response_text_preview}...")
                print(f"    WARNING (get_embedding_from_gemini): Gemini Embedding API ({model}) returned status {api_response.status_code}.")
                if api_response.status_code == 429 or api_response.status_code >= 500:
                    if attempt + 1 < max_retries:
                        retry_delay = base_retry_delay * (2 ** attempt) + random.uniform(0, 1)
                        print(f"    Retrying embedding in {retry_delay:.2f} seconds...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        print(f"    ERROR (get_embedding_from_gemini): Max retries reached for embedding model {model} after status {api_response.status_code}.")
                        return None
                else:
                    print(f"    ERROR (get_embedding_from_gemini): Non-retryable API error {api_response.status_code}. Check response text above for details.")
                    return None

            result = api_response.json()
            # Truncate embedding within the raw result for logging if it exists
            log_result = copy.deepcopy(result)
            if "embedding" in log_result and isinstance(log_result["embedding"], dict):
                embedding_details = log_result["embedding"]
                if "values" in embedding_details and isinstance(embedding_details["values"], list) and len(embedding_details["values"]) > 10:
                    original_values = embedding_details["values"]
                    embedding_details["values"] = original_values[:5] + ["..."] + original_values[-5:]
                elif "value" in embedding_details and isinstance(embedding_details["value"], list) and len(embedding_details["value"]) > 10:
                    original_value = embedding_details["value"]
                    embedding_details["value"] = original_value[:5] + ["..."] + original_value[-5:]
            elif "embedding" in log_result and isinstance(log_result["embedding"], list) and len(log_result["embedding"]) > 10:
                original_embedding_list = log_result["embedding"]
                log_result["embedding"] = original_embedding_list[:5] + ["..."] + original_embedding_list[-5:]

            print(f"    DEBUG (get_embedding_from_gemini): Full JSON response from Gemini (200 OK, embedding truncated): {json.dumps(log_result, indent=2)}")


            if "embedding" in result:
                embedding_data_dict = result["embedding"]
                # Scenario 1: Structure is {'embedding': {'values': [numbers...]}}
                if isinstance(embedding_data_dict, dict) and "values" in embedding_data_dict and isinstance(embedding_data_dict["values"], list): # Key change: "values" (plural)
                    print(f"    Successfully received embedding from {model} (using 'values' key).")
                    return embedding_data_dict["values"] # Key change: "values" (plural)
                # Scenario 2: Could it be {'embedding': {'value': [numbers...]}} (singular 'value') - keep for robustness
                elif isinstance(embedding_data_dict, dict) and "value" in embedding_data_dict and isinstance(embedding_data_dict["value"], list):
                    print(f"    Successfully received embedding from {model} (using singular 'value' key).")
                    return embedding_data_dict["value"]
                # Scenario 3: Could it be {'embedding': [numbers...]} (direct list)
                elif isinstance(embedding_data_dict, list): # This was result["embedding"] being a list directly
                    print(f"    Successfully received embedding from {model} (direct list structure under 'embedding' key).")
                    return embedding_data_dict
                else:
                    print(f"    WARNING (get_embedding_from_gemini): 'embedding' key found, but its content ('embedding_data_dict') is not a dict with 'values'/'value' or a direct list. Content: {embedding_data_dict}")
                    return None
            else:
                print(f"    WARNING (get_embedding_from_gemini): 'embedding' key NOT FOUND in 200 OK response. Full JSON response logged above.")
                return None

        except requests.exceptions.RequestException as e:
            print(f"    ERROR (get_embedding_from_gemini): Network/Request Error for embedding with {model} (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt + 1 == max_retries:
                print(f"    ERROR (get_embedding_from_gemini): Max retries reached after network errors.")
                return None
            time.sleep(base_retry_delay * (2 ** attempt) + random.uniform(0, 1))
        except json.JSONDecodeError as e_json:
            print(f"    ERROR (get_embedding_from_gemini): JSON Decode Error. Status: {api_response.status_code if 'api_response' in locals() else 'N/A'}. Response text (preview): {response_text_preview}... Error: {e_json}")
            return None
        except Exception as e_other:
            print(f"    ERROR (get_embedding_from_gemini): Unexpected Error during embedding with {model} (Attempt {attempt + 1}/{max_retries}): {type(e_other).__name__} - {e_other}")
            if attempt + 1 == max_retries:
                print(f"    ERROR (get_embedding_from_gemini): Max retries reached after unexpected errors.")
                return None
            time.sleep(base_retry_delay * (2 ** attempt) + random.uniform(0, 1))

    print(f"    ERROR (get_embedding_from_gemini): Exited retry loop without successfully getting embedding.")
    return None

# --- Prompt Generation Functions ---
def generate_structured_data_prompt(duration: int, collection: Optional[str], description: str, summary: Optional[str]) -> str:
    description_preview = (description[:700] + "...") if description and len(description) > 700 else (description or "")
    summary_preview = (summary[:400] + "...") if summary and len(summary) > 400 else (summary or "")

    return f"""
Analyze the following honeymoon tour information to generate structured data.
Focus on the primary characteristics evident from the text.

Tour Information:
- Duration: {duration} days
- Collection: {collection or 'Not specified'}
- Summary: {summary_preview or 'Not provided'}
- Description: {description_preview or 'Not provided'}

Based on the provided information and general geographical knowledge as well as your assumptions about things someone might want to do on a honeymoon in said location, generate a JSON object with the following keys.
For "activity", "callouts", "best_season", and "theme_tags", assign 1 if the characteristic is present/likely, 0 otherwise.

{{
  "activity": {{
    "wildlife_encounters": integer, // e.g., safaris, whale watching, bird sanctuaries, jungle treks, distinctive local fauna
    "historical_sites": integer, // e.g., if the tour includes ancient ruins, castles, historical districts, significant museums, monuments
    "beach_water_activities": integer, // e.g., if the tour includes beaches, seaside, island swimming/hopping, snorkeling, diving, surfing, etc.
    "food_wine_experiences": integer, // e.g., if the locations in the tour are known for food, wine, renowned restaurants, local market food exploration
    "hiking_active_pursuits": integer, // e.g., if the tour can include outdoor activites (like walks in the mountains, kayaking, white-water rafting (more than just casual walks))
    "urban_landscapes": integer, // e.g., exploring vibrant cities, modern architecture, iconic city landmarks, shopping districts, nightlife
    "relaxation_spas": integer, // e.g., if the tour has a slow pace, predilects relaxation, we can infer that hotels in the locations of the tour would offer spa/wellness facilities, luxury resorts known for relaxation, yoga retreats
    "cultural_experiences": integer // e.g., if the locations of the tour are known for local markets, artisan crafts, traditional performances, village visits, temples/religious sites, local festivals
  }},
  "callouts": {{
    "very_hot_climate": integer, // e.g., mentions desert, tropical heat, consistently high temperatures likely (e.g., >35°C or 86°F regularly)
    "very_cold_climate": integer, // e.g., mentions snow, arctic conditions, high-altitude mountains in winter, consistently low temperatures likely (e.g., near or below 0°C or 32°F regularly)
    "intense_hiking": integer, // e.g., mentions strenuous treks, multi-day hikes, significant elevation gain, challenging terrain
    "very_remote": integer, // e.g., mentions isolated locations, limited infrastructure, far from major cities/airports, off-grid experiences
    "long_flights": integer // Assign 1 if the destination is typically considered a long-haul flight (e.g., >7-8 hours) from major hubs in Europe/North America (e.g., Australia, SE Asia, South America, deep Africa), 0 otherwise (e.g., within Europe, Caribbean from US, North Africa from Europe)
  }},
  "best_season": {{ // Assign 1 for seasons generally considered ideal for this destination/activities, 0 otherwise. Infer based on common knowledge if description/summary lacks specifics.
    "spring": integer, 
    "summer": integer, 
    "autumn": integer, 
    "winter": integer 
  }},
  "pace": string, // Choose ONE: "relaxed" (minimal travel between locations, ample free time, focus on unwinding), "balanced" (a good mix of scheduled activities, travel between locations, and free time), or "active" (frequent location changes, packed itinerary, many activities per day)
  "geo_region": string, // Choose ONE: "Europe", "Asia", "Africa", "North America & Hawaii", "South America", "Caribbean & Central America", "Oceania & Pacific" based on the primary location(s) of the tour.
  "theme_tags": {{ // For each theme, assign 1 if it strongly represents the tour's focus, 0 otherwise. Multiple themes can be 1.
    "Pure Relaxation & Island Bliss": integer,
    "Cultural Discovery & Historic Charm": integer,
    "Wildlife & Epic Landscapes": integer,
    "Active Adventures": integer
  }}
}}
Ensure the output is ONLY the valid JSON object.
"""

def generate_preference_score_prompt(description: str, title: Optional[str]) -> str:
    description_preview = (description[:1000] + "...") if description and len(description) > 1000 else (description or "")
    title_str = f"'{title}'" if title else "this tour"

    return f"""
**Your Persona:** You are a Senior Travel Curation Specialist at "Élan Honeymoons," a premier luxury travel agency. You have an impeccable eye for detail, a deep understanding of global iconic destinations, and a commitment to curating only the most exceptional and memorable honeymoon experiences.

**Your Task:**
Carefully evaluate the provided tour package details. Based on its alignment with our agency's specific priorities for "iconic" honeymoon categories, assign a 'Curation Score' from 1 to 5.

**"Élan Honeymoons" - Priority Iconic Trip Categories:**
Your scoring should heavily prioritize tours that excel in one or more of the following categories, representing the pinnacle of luxury honeymoon travel:

1.  **World-Class Cultural Immersion:** Tours in destinations renowned for profound, authentic, and luxurious cultural experiences (e.g., Italy, Japan, Thailand).
2.  **Legendary Beach Escapes:** Tours to iconic, premium beach destinations offering unparalleled luxury, beauty, and exclusivity (e.g., Maldives, Hawaii, Seychelles).
3.  **Signature Safari Adventures:** Tours providing classic, breathtaking, and high-end wildlife safari experiences in premier locations (e.g., South Africa, Namibia).
4.  **Epic Adventure Journeys:** Tours featuring unique, thrilling, and well-crafted adventure activities in destinations known for extraordinary landscapes and experiences (e.g., Argentina, Indonesia, China).

**Tour Package Details to Evaluate:**
Title: {title_str}
Description: {description_preview}
**Scoring Rubric (1-5):**
* **1: Low Priority:** Minimal alignment with our iconic trip categories or lacks the distinct luxury/uniqueness we seek.
* **2: Moderate Priority:** Some appeal and may touch upon a priority category, but not a standout example or could be more refined for a luxury honeymoon.
* **3: Solid Priority:** A good quality tour that clearly fits into one of our iconic categories and meets luxury standards. A strong contender.
* **4: High Priority:** An excellent, highly desirable tour that is a strong example of an iconic experience in one of our priority categories. Demonstrates significant luxury, uniqueness, and strong appeal.
* **5: Top Priority / Flagship Potential:** An exceptional tour that perfectly embodies the pinnacle of one or more of our iconic trip categories. Truly outstanding, unique, and the epitome of a luxury honeymoon we want to champion.

**Output Format:**
Provide ONLY a JSON object with the single key "recommendation_metric".Example: {{"recommendation_metric": 4}}
"""

# --- Supabase Interaction Functions ---
def fetch_tours_from_supabase(tour_id: Optional[str] = None, fetch_existing_data_for_skip_check: bool = False) -> List[Dict[str, Any]]:
    try:
        select_columns_list = ['id', 'title', 'duration', 'collection', 'description', 'summary'] # Base fields for prompts
        
        if fetch_existing_data_for_skip_check:
            # Fields to check if they are already populated, to potentially skip the tour
            structured_data_fields_to_check = [
                'activity', 
                'callouts', 
                'best_season', 
                'pace', 
                'geo_region', 
                'theme_tags', 
                'recommendation_metric', 
                'embedding'
            ]
            select_columns_list.extend(structured_data_fields_to_check)

        select_columns = ', '.join(list(set(select_columns_list))) # Use set to avoid duplicates if any overlap

        query = supabase.table('tours').select(select_columns)
        if tour_id:
            print(f"Fetching specific tour with ID: {tour_id}")
            query = query.eq('id', tour_id)
        else:
            if fetch_existing_data_for_skip_check:
                print("Fetching all tours with their existing structured data for skip checking...")
            else:
                print("Fetching all tours (base data only for processing)...")

        response = query.execute()
        if response.data:
            print(f"Fetched {len(response.data)} tour(s).")
            return response.data
        else:
            print("No tours found matching criteria." if not tour_id else f"No tour found with ID: {tour_id}")
         return []
    except Exception as e:
        print(f"Error fetching tours: {e}")
        return []

def update_tour_details(tour_id: str, update_data: Dict[str, Any]) -> bool:
    """Updates a tour in Supabase with generated data. Only touches specified fields."""
    try:
        allowed_update_keys = [
            "activity", "callouts", "best_season", "pace",
            "geo_region", "theme_tags", "recommendation_metric", "embedding"
        ]
        payload = {key: value for key, value in update_data.items() if key in allowed_update_keys and value is not None}

        if not payload: # No valid new data to update
            print(f"Warning: No new valid data generated for tour {tour_id} to update. Skipping database call.")
            return False

        payload["updated_at"] = datetime.now(timezone.utc).isoformat()

        print(f"\n--- Attempting to update tour {tour_id} with (only these fields will be affected): ---")
        # Detailed logging for the embedding before sending to Supabase
        if "embedding" in payload and payload["embedding"] is not None:
            emb = payload["embedding"]
            print(f"    Embedding for Supabase: type={type(emb)}, length={len(emb) if isinstance(emb, list) else 'N/A'}")
            if isinstance(emb, list) and emb:
                print(f"    Embedding first 3 elements: {emb[:3]}")
                print(f"    Type of first embedding element: {type(emb[0])}")
            elif not isinstance(emb, list):
                 print(f"    WARNING: Embedding is not a list, which might be an issue for pgvector. Type: {type(emb)}")
        elif "embedding" in update_data and update_data["embedding"] is None:
            print(f"    Embedding was generated as None, will not be included in this update for tour {tour_id}.")
        else:
            print(f"    No 'embedding' key in payload for tour {tour_id} or it was None initially.")

        # The rest of the payload for context
        # Create a copy of payload for printing, excluding embedding if it's too long
        print_payload = {k: (v[:5] + ["..."] + v[-5:] if isinstance(v, list) and k == "embedding" and len(v) > 10 else v) for k,v in payload.items()}
        print(json.dumps(print_payload, indent=2))


        response = supabase.table('tours').update(payload).eq('id', tour_id).execute()

        # .data for an update operation without `returning='representation'` is typically an empty list on success.
        # The absence of an APIError is the primary success indicator.
        print(f"Successfully initiated update for tour {tour_id}.")
            return True
        except APIError as e:
        print(f"!!! Supabase API Error updating tour {tour_id} !!!")
        print(f"    Message: {e.message}") # This is often the most useful part.
        if hasattr(e, 'details') and e.details: print(f"    Details: {e.details}")
        if hasattr(e, 'hint') and e.hint: print(f"    Hint: {e.hint}")
        if hasattr(e, 'code') and e.code: print(f"    Code: {e.code}")
        # You can uncomment the following for more raw error info if the above isn't enough
        # print(f"    Raw Error __str__: {e}")
        # print(f"    Raw Error __dict__: {e.__dict__}")
        # print(f"    Underlying Error (if any): {e.args}")

        # Specifically check if the error message pertains to the 'embedding' column
        if 'embedding' in str(e.message).lower() or ('details' in e.__dict__ and e.details and 'embedding' in str(e.details).lower()):
            print(f"    This APIError seems related to the 'embedding' field.")
            return False
        except Exception as e:
        print(f"!!! Unexpected non-APIError updating tour {tour_id}: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc() # Print full traceback for unexpected errors
        return False

# --- Main Processing Logic ---
def process_tour(tour_data: Dict[str, Any]) -> bool:
    tour_id = tour_data.get('id')
    title = tour_data.get('title', 'N/A')
    duration = tour_data.get('duration')
    collection = tour_data.get('collection')
    description = tour_data.get('description')
    summary = tour_data.get('summary')

    if not all([tour_id, duration, description]): # Summary is for embedding, can be optional for other parts
        print(f"Skipping tour '{title}' (ID: {tour_id}) due to missing essential base data (id, duration, or description).")
        return False

    print(f"\n--- Processing Tour: '{title}' (ID: {tour_id}) ---")
    final_update_data: Dict[str, Any] = {}

    # 1. Structured Data Enrichment
    print("\nStep 1: Structured Data Enrichment...")
    structured_prompt = generate_structured_data_prompt(duration, collection, description, summary)
    structured_info = call_gemini_api_for_json(structured_prompt, GEMINI_TEXT_MODEL)
    if structured_info:
        print("Received structured data:", json.dumps(structured_info, indent=2))
        final_update_data.update(structured_info)
        # Basic Validation (can be expanded)
        if not isinstance(structured_info.get("activity"), dict) or \
           not isinstance(structured_info.get("theme_tags"), dict):
            print("Warning: Key structured data (activity or theme_tags) missing or malformed. Partial update might occur.")
    else:
        print(f"Failed to get structured data for tour '{title}'.")


    # 2. Preference Score (Recommendation Metric)
    print("\nStep 2: Generating Preference Score...")
    score_prompt = generate_preference_score_prompt(description, title)
    score_info = call_gemini_api_for_json(score_prompt, GEMINI_TEXT_MODEL)
    if score_info and "recommendation_metric" in score_info:
        metric = score_info["recommendation_metric"]
        if isinstance(metric, int) and 1 <= metric <= 5:
            print(f"Received recommendation_metric: {metric}")
            final_update_data["recommendation_metric"] = metric
        else:
            print(f"Warning: Invalid recommendation_metric '{metric}' (type: {type(metric)}) received. Skipping score update. Full score_info: {score_info}")
    else:
        print(f"Failed to get preference score for tour '{title}'.")
        if score_info is None:
            print(f"    Reason: call_gemini_api_for_json returned None for tour '{title}'.")
        else:
            print(f"    Reason: 'recommendation_metric' key not found in the response. Actual score_info received: {json.dumps(score_info, indent=2)}")


    # 3. Embedding Generation (based on summary)
    print("\nStep 3: Generating Embedding...")
    if summary:
        embedding_vector = get_embedding_from_gemini(summary, GEMINI_EMBEDDING_MODEL)
        if embedding_vector:
            print(f"    Successfully received embedding vector from Gemini for tour '{title}' (length: {len(embedding_vector)}).")
            # Explicitly check type and content of embedding_vector
            if isinstance(embedding_vector, list):
                if all(isinstance(item, (float, int)) for item in embedding_vector):
                    # Log only a snippet of the successfully parsed embedding vector
                    print(f"    Embedding vector for '{title}' is a list of numbers (length: {len(embedding_vector)}). First 3: {embedding_vector[:3]}, Last 3: {embedding_vector[-3:]}")
                    final_update_data["embedding"] = embedding_vector
                else:
                    print(f"    !!! ERROR: Embedding vector for tour '{title}' contains non-numeric items. Skipping embedding update for this tour.")
                    if embedding_vector: # if list is not empty
                        print(f"    First non-numeric item type: {type(next(item for item in embedding_vector if not isinstance(item, (float, int))))}")
            else:
                print(f"    !!! ERROR: Embedding vector for tour '{title}' is NOT a list as expected. Type: {type(embedding_vector)}. Skipping embedding update.")
        else:
            # This log means get_embedding_from_gemini returned None
            print(f"    Failed to generate/retrieve embedding from Gemini for tour '{title}' summary.")
    else:
        print(f"No summary provided for tour '{title}'. Skipping embedding generation.")


    # Update Supabase with all collected data
    if final_update_data:
        return update_tour_details(tour_id, final_update_data)
    else:
        print(f"No data generated for tour '{title}'. Nothing to update.")
        return False


# --- Main Execution ---
def main():
    parser = argparse.ArgumentParser(description='Enrich tour data using Gemini API and update Supabase.')
    parser.add_argument('-id', '--tour_id', type=str, help='Process a specific tour by its UUID. If not provided, all tours are processed.')
    parser.add_argument('--override', action='store_true', help='Override existing structured data and embedding for tours. If not set, tours with existing data will be skipped.')
    args = parser.parse_args()

    # Determine if we need to fetch existing data for skip checks
    fetch_for_skip_check = not args.override

    tours_to_process = fetch_tours_from_supabase(args.tour_id, fetch_existing_data_for_skip_check=fetch_for_skip_check)

    if not tours_to_process:
        print("No tours to process. Exiting.")
        return

    total_tours_found = len(tours_to_process)
    processed_count = 0
    successful_updates = 0
    failed_processing = 0
    skipped_due_to_existing_data = 0

    if args.tour_id:
        print(f"\nStarting processing for single tour ID: {args.tour_id}")
    else:
        print(f"\nStarting processing for {total_tours_found} tour(s).")

         if args.override:
        print("Override mode: ACTIVE. Existing structured data and embeddings will be re-generated and overwritten.")
         else:
        print("Override mode: INACTIVE. Tours with complete existing structured data and embedding will be skipped.")


    for i, tour in enumerate(tours_to_process):
        tour_id_current = tour.get('id', 'N/A')
        title_current = tour.get('title', 'N/A')
        
        print(f"\n[{i+1}/{total_tours_found}] Checking Tour: '{title_current}' (ID: {tour_id_current})")

        if not args.override:
            # Check if all relevant fields are already populated
            activity_data = tour.get('activity')
            callouts_data = tour.get('callouts')
            best_season_data = tour.get('best_season')
            pace_data = tour.get('pace')
            geo_region_data = tour.get('geo_region')
            theme_tags_data = tour.get('theme_tags')
            recommendation_metric_data = tour.get('recommendation_metric')
            embedding_data = tour.get('embedding')

            # Define what "populated" means for each type
            is_populated = (
                activity_data is not None and isinstance(activity_data, dict) and activity_data and
                callouts_data is not None and isinstance(callouts_data, dict) and callouts_data and
                best_season_data is not None and isinstance(best_season_data, dict) and best_season_data and
                pace_data is not None and isinstance(pace_data, str) and pace_data.strip() != "" and
                geo_region_data is not None and isinstance(geo_region_data, str) and geo_region_data.strip() != "" and
                theme_tags_data is not None and isinstance(theme_tags_data, dict) and theme_tags_data and # Check it's a non-empty dict
                recommendation_metric_data is not None and isinstance(recommendation_metric_data, int) and
                embedding_data is not None and isinstance(embedding_data, list) and len(embedding_data) > 0
            )

            if is_populated:
                print(f"Skipping tour '{title_current}' (ID: {tour_id_current}) - All target fields already populated and override is OFF.")
                skipped_due_to_existing_data += 1
                continue

        processed_count +=1
            if process_tour(tour):
                successful_updates += 1
            else:
            failed_processing += 1

    print("\n--------------------------------------------------")
    print("Processing Complete.")
    print(f"Total Tours Found:              {total_tours_found}")
    print(f"Tours Attempted for Processing: {processed_count}")
    if not args.override:
        print(f"Skipped (Already Populated):    {skipped_due_to_existing_data}")
    print(f"Successfully Processed/Updated: {successful_updates}")
    print(f"Failed Processing/No Update:    {failed_processing}")
    print("--------------------------------------------------")

if __name__ == "__main__":
    main() 