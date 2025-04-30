# populate_embeddings.py
import os
import time
import json
from typing import List, Dict, Optional, Any, Tuple
from dotenv import load_dotenv
from supabase import create_client, Client
from postgrest import APIError
import google.generativeai as genai
import backoff # For potential manual retries if needed, though google library handles some
import logging

# Supabase credentials (ensure these are correct)
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

# API credentials
GEMINI_API_KEY = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'
GEMINI_API_MODEL = "gemini-2.5-pro-exp-03-25" # Using the specified Gemini model


# Gemini Model Configuration
EMBEDDING_MODEL = "text-embedding-004" # Or the specific model name you are using
EMBEDDING_TASK_TYPE = "RETRIEVAL_DOCUMENT" # Important for document embeddings
EMBEDDING_DIMENSIONS = 768 # Should match your DB column vector size

# Script Configuration
BATCH_SIZE = 50  # Number of tours to process in each batch
MAX_RETRIES = 5 # Max retries for Supabase operations (using backoff)
INITIAL_RETRY_DELAY = 1 # Initial delay in seconds for retries
MAX_RETRY_DELAY = 16 # Maximum delay for retries

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler() # Output logs to console
        # logging.FileHandler("embedding_population.log") # Optional: Log to a file
    ]
)
logger = logging.getLogger(__name__)


# --- Initialize Clients ---
supabase: Optional[Client] = None
gemini_model = None

def initialize_clients():
    """Initialize Supabase and Gemini clients."""
    global supabase, gemini_model
    logger.info("Initializing clients...")

    # Validate environment variables
    if not SUPABASE_URL:
        logger.error("Missing SUPABASE_URL environment variable.")
        return False
    if not SUPABASE_SERVICE_KEY:
        logger.error("Missing SUPABASE_SERVICE_KEY environment variable.")
        return False
    if not GEMINI_API_KEY:
        logger.error("Missing GEMINI_API_KEY environment variable.")
        return False

    # Initialize Supabase Client
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        # Test connection (optional but recommended)
        supabase.table('tours').select('id').limit(1).execute()
        logger.info("Supabase client initialized and connection tested successfully.")
    except Exception as e:
        logger.error(f"Error initializing Supabase client or testing connection: {e}", exc_info=True)
        supabase = None
        return False

    # Initialize Gemini Client
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        # Verify model exists (optional check)
        # models = [m for m in genai.list_models() if f'models/{EMBEDDING_MODEL}' in m.name]
        # if not models:
        #     logger.error(f"Gemini embedding model '{EMBEDDING_MODEL}' not found.")
        #     return False
        gemini_model = EMBEDDING_MODEL # Store the model name
        logger.info(f"Gemini client configured for model: {EMBEDDING_MODEL}.")
    except Exception as e:
        logger.error(f"Error configuring Gemini client: {e}", exc_info=True)
        gemini_model = None
        return False

    return True

# --- Database Operations ---

@backoff.on_exception(backoff.expo,
                      (APIError, Exception), # Retry on Supabase API errors and general exceptions
                      max_tries=MAX_RETRIES,
                      max_time=60, # Stop retrying after 60 seconds total
                      jitter=backoff.full_jitter,
                      logger=logger,
                      on_backoff=lambda details: logger.warning(f"Retrying DB fetch in {details['wait']:.1f}s after {details['tries']} tries. Error: {details['exception']}"),
                      on_giveup=lambda details: logger.error(f"DB fetch failed after {details['tries']} tries. Error: {details['exception']}"))
def fetch_tours_batch(offset: int, limit: int) -> List[Dict[str, Any]]:
    """Fetches a batch of tours where embedding is NULL."""
    if not supabase:
        logger.error("Supabase client not initialized. Cannot fetch tours.")
        return []

    try:
        logger.info(f"Fetching tours batch: offset={offset}, limit={limit}")
        # Select necessary fields for text construction + id
        select_fields = "id, title, collection, summary, description, activity, pace, best_season, geo_region"
        response = supabase.table('tours') \
            .select(select_fields) \
            .is_('embedding', 'null') \
            .range(offset, offset + limit - 1) \
            .execute()

        if response.data:
            logger.info(f"Fetched {len(response.data)} tours for processing.")
            return response.data
        else:
            logger.info("No more tours found with NULL embedding.")
            return []
    except APIError as e:
        logger.error(f"Supabase API Error fetching tours batch: {e.message} (Code: {e.code}, Details: {e.details})")
        raise # Reraise to trigger backoff
    except Exception as e:
        logger.error(f"Unexpected error fetching tours batch: {e}", exc_info=True)
        raise # Reraise to trigger backoff


@backoff.on_exception(backoff.expo,
                      (APIError, Exception),
                      max_tries=MAX_RETRIES,
                      max_time=60,
                      jitter=backoff.full_jitter,
                      logger=logger,
                      on_backoff=lambda details: logger.warning(f"Retrying DB update for tour {details['args'][0]} in {details['wait']:.1f}s after {details['tries']} tries. Error: {details['exception']}"),
                      on_giveup=lambda details: logger.error(f"DB update for tour {details['args'][0]} failed after {details['tries']} tries. Error: {details['exception']}"))
def update_tour_embedding(tour_id: str, embedding: List[float]) -> bool:
    """Updates the embedding for a single tour."""
    if not supabase:
        logger.error("Supabase client not initialized. Cannot update tour.")
        return False

    if not isinstance(embedding, list) or len(embedding) != EMBEDDING_DIMENSIONS:
         logger.error(f"Invalid embedding format or dimension for tour {tour_id}. Expected list of {EMBEDDING_DIMENSIONS} floats.")
         return False

    try:
        # logger.debug(f"Updating embedding for tour {tour_id}...") # Use debug level for frequent operations
        response = supabase.table('tours') \
            .update({"embedding": embedding, "updated_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}) \
            .eq('id', tour_id) \
            .execute()

        # Basic check: PostgREST update usually returns the updated data or empty list on success
        # A more robust check might involve inspecting response.data or count if needed
        # Lack of exception is often sufficient indication of success here.
        # logger.debug(f"Update response for tour {tour_id}: {response}")
        return True
    except APIError as e:
        logger.error(f"Supabase API Error updating embedding for tour {tour_id}: {e.message} (Code: {e.code}, Details: {e.details})")
        raise # Reraise to trigger backoff
    except Exception as e:
        logger.error(f"Unexpected error updating embedding for tour {tour_id}: {e}", exc_info=True)
        raise # Reraise to trigger backoff

# --- Text Construction ---

def safe_get(data: Optional[Dict], key: str, default: str = "N/A") -> str:
    """Safely get a value from a dict, returning default if None or missing."""
    if data is None:
        return default
    value = data.get(key)
    return str(value) if value is not None else default

def format_json_field(data: Optional[Dict], field_name: str) -> str:
    """Formats JSONB fields (like activity, best_season) into a readable string."""
    if not data or not isinstance(data, dict):
        return "N/A"
    
    # Get items where value is 1 (or True)
    positive_keys = [key for key, value in data.items() if value == 1 or value is True]
    
    if not positive_keys:
        return "None specified"
        
    # Capitalize and replace underscores for readability
    formatted_keys = [key.replace('_', ' ').capitalize() for key in positive_keys]
    return f"{field_name.capitalize()}: {', '.join(formatted_keys)}"


def construct_input_text(tour: Dict[str, Any]) -> str:
    """Constructs the descriptive text for a tour to be embedded."""
    title = safe_get(tour, 'title')
    collection = safe_get(tour, 'collection', 'General')
    summary = safe_get(tour, 'summary', 'No summary available.')
    # description = safe_get(tour, 'description', 'No description available.') # Optionally include description or parts of it
    pace = safe_get(tour, 'pace', 'Balanced') # Default pace if missing
    geo_region = safe_get(tour, 'geo_region', 'Unknown Region')
    
    activity_str = format_json_field(tour.get('activity'), 'activities')
    best_season_str = format_json_field(tour.get('best_season'), 'best season')

    # Combine fields into a single string
    # Focus on semantic meaning for embedding
    text = f"Tour Title: {title}. " \
           f"Honeymoon Style: {collection}. " \
           f"Summary: {summary}. " \
           f"Pace: {pace}. " \
           f"{activity_str}. " \
           f"{best_season_str}. " \
           f"Geographical Region: {geo_region}."
           # Consider adding keywords from description if needed:
           # f" Details: {description[:200]}..." # Example: Add first 200 chars of description

    # Simple cleaning
    text = ' '.join(text.split()) # Remove extra whitespace
    return text


# --- Embedding Generation ---

# Note: google-generativeai library handles retries internally based on configuration.
# We rely on that here. Add manual backoff if needed for specific non-retryable errors.
def get_embeddings(texts: List[str]) -> Optional[List[List[float]]]:
    """Generates embeddings for a batch of texts using the Gemini API."""
    if not gemini_model:
        logger.error("Gemini client not initialized. Cannot generate embeddings.")
        return None
    if not texts:
        logger.warning("No texts provided to generate embeddings.")
        return []

    try:
        logger.info(f"Requesting embeddings for {len(texts)} texts using model {gemini_model}...")
        # Use embed_content for batching
        result = genai.embed_content(
            model=f"models/{gemini_model}",
            content=texts,
            task_type=EMBEDDING_TASK_TYPE
            # output_dimensionality=EMBEDDING_DIMENSIONS # Only if supported and needed
        )

        embeddings = result.get('embedding') # Access the list of embeddings directly

        if not embeddings or len(embeddings) != len(texts):
            logger.error(f"Mismatch between requested texts ({len(texts)}) and received embeddings ({len(embeddings) if embeddings else 0}). API Response: {result}")
            return None

        # Validate embedding dimensions (optional but good practice)
        for i, emb in enumerate(embeddings):
            if len(emb) != EMBEDDING_DIMENSIONS:
                 logger.error(f"Received embedding with incorrect dimension ({len(emb)}, expected {EMBEDDING_DIMENSIONS}) for text index {i}.")
                 # Decide handling: return None, skip this embedding, etc. Here we fail the batch.
                 return None

        logger.info(f"Successfully generated {len(embeddings)} embeddings.")
        return embeddings

    except Exception as e:
        logger.error(f"Error calling Gemini Embedding API: {e}", exc_info=True)
        # The google library might raise specific exceptions, handle them if needed.
        # E.g., google.api_core.exceptions.ResourceExhausted for rate limits if auto-retry fails.
        return None


# --- Main Processing Logic ---

def main():
    """Main function to fetch, embed, and update tours."""
    if not initialize_clients():
        logger.critical("Client initialization failed. Exiting.")
        return

    total_processed = 0
    total_succeeded = 0
    total_failed_embedding = 0
    total_failed_update = 0
    offset = 0

    logger.info("Starting embedding population process...")

    while True:
        try:
            tours = fetch_tours_batch(offset, BATCH_SIZE)
            if not tours:
                logger.info("No more tours to process or fetch failed definitively.")
                break # Exit loop if no tours are returned (or fetch failed after retries)

            batch_texts = []
            batch_ids = []
            valid_tours_in_batch = 0

            # 1. Construct texts for the batch
            for tour in tours:
                tour_id = tour.get('id')
                if not tour_id:
                    logger.warning("Found tour data without an ID. Skipping.")
                    continue
                
                try:
                    text = construct_input_text(tour)
                    if text:
                        batch_texts.append(text)
                        batch_ids.append(tour_id)
                        valid_tours_in_batch += 1
                    else:
                        logger.warning(f"Could not construct input text for tour {tour_id}. Skipping.")
                except Exception as e:
                    logger.error(f"Error constructing text for tour {tour_id}: {e}", exc_info=True)


            if not batch_texts:
                 logger.warning(f"No valid texts constructed for batch starting at offset {offset}. Moving to next batch.")
                 # Important: Increment offset even if the batch was problematic to avoid infinite loops
                 offset += len(tours) # Advance by the number fetched, not just valid ones
                 continue

            # 2. Generate embeddings for the batch
            embeddings = get_embeddings(batch_texts)

            if embeddings is None:
                logger.error(f"Failed to generate embeddings for batch starting at offset {offset}. Skipping batch.")
                total_failed_embedding += len(batch_texts)
                offset += len(tours) # Move past this problematic batch
                continue # Skip update attempts for this batch

            if len(embeddings) != len(batch_texts):
                 logger.error(f"Embedding count mismatch for batch at offset {offset}. Expected {len(batch_texts)}, got {len(embeddings)}. Skipping batch updates.")
                 total_failed_embedding += len(batch_texts) # Count all as failed for this batch
                 offset += len(tours)
                 continue

            # 3. Update tours with embeddings
            batch_success_count = 0
            batch_fail_count = 0
            for i, tour_id in enumerate(batch_ids):
                if i < len(embeddings):
                    embedding = embeddings[i]
                    if update_tour_embedding(tour_id, embedding):
                        logger.info(f"Successfully updated embedding for tour {tour_id}")
                        batch_success_count += 1
                    else:
                        logger.error(f"Failed to update embedding for tour {tour_id} after retries.")
                        batch_fail_count += 1
                else:
                     # Should not happen if length check passed, but safety measure
                     logger.error(f"Index out of bounds error when processing tour {tour_id}. No embedding found at index {i}.")
                     batch_fail_count += 1


            total_succeeded += batch_success_count
            total_failed_update += batch_fail_count
            total_processed += len(tours) # Count all tours attempted in the fetch

            logger.info(f"Batch complete (Offset {offset}): {batch_success_count} updated, {batch_fail_count} failed update, {len(tours) - valid_tours_in_batch} skipped construction, {valid_tours_in_batch - batch_success_count - batch_fail_count} failed embedding generation.")

            # Increment offset for the next batch ONLY if the current fetch was successful
            offset += len(tours)

            # Optional: Add a small delay between batches to respect potential API limits further
            # time.sleep(1)

        except KeyboardInterrupt:
            logger.warning("Process interrupted by user.")
            break
        except Exception as e:
            # Catch unexpected errors in the main loop
            logger.critical(f"Critical error during main processing loop: {e}", exc_info=True)
            logger.warning("Attempting to continue with the next batch if possible...")
            # Decide if you want to break or try to continue
            offset += BATCH_SIZE # Try to advance past the potentially problematic batch range
            time.sleep(5) # Pause before retrying


    # --- Final Summary ---
    logger.info("--------------------------------------------------")
    logger.info("Embedding Population Complete.")
    logger.info(f"Total Tours Processed (attempted fetch): ~{total_processed}") # Might be slightly off if fetch failed mid-way
    logger.info(f"Successfully Updated Embeddings:       {total_succeeded}")
    logger.info(f"Failed (Embedding Generation Error):   {total_failed_embedding}")
    logger.info(f"Failed (Database Update Error):        {total_failed_update}")
    logger.info("--------------------------------------------------")

if __name__ == "__main__":
    main()