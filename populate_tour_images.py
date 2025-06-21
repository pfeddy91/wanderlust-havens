#!/usr/bin/env python3
"""
Tour Images Pipeline
Populates images for tours that don't have featured images
Refactored from generate_tour_images.py with pipeline structure
"""

import json
import requests
from supabase import create_client, Client
import random
import re
import unicodedata
import argparse
import yaml
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import time
import os
import logging
from pathlib import Path
import uuid
import base64
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np


# Configuration
CONFIG_FILE = "config.yaml"

class TourImagesPipeline:
    def __init__(self, config_path: str = CONFIG_FILE):
        """Initialize the pipeline with configuration."""
        self.config = self.load_config(config_path)
        self.setup_logging()
        self.setup_apis()
        self.progress_file = self.config['processing'].get('images_progress_file', 'tour_images_progress.json')
        self.load_progress()
        
        # Image processing settings
        self.storage_bucket = "tour-images"
        self.db_table_name = "tour_images"
        self.image_quality_threshold = 8
        
        # API settings from generate_tour_images.py
        self.unsplash_access_key = "x49l7PRQ_Du5MyKVvAK_Y4FTjcWXEzUgMtnp4SQeG8s"
        self.pexels_api_key = "2nTDyWqcjwBRUWzyi2mpWlbqKHAy4xxAHuRbSHtA38kCOfoNQbDeOoye"
        
        self.pexels_headers = {"Authorization": self.pexels_api_key}
        self.unsplash_headers = {
            "Accept-Version": "v1",
            "Authorization": f"Client-ID {self.unsplash_access_key}"
        }
        
        # Initialize rate limiting counters
        self.unsplash_requests = {
            'count': 0,
            'hour_start': time.time()
        }
        self.pexels_last_request = 0
        
    def load_config(self, config_path: str) -> dict:
        """Load configuration from YAML file."""
        try:
            with open(config_path, 'r') as file:
                return yaml.safe_load(file)
        except FileNotFoundError:
            print(f"Configuration file {config_path} not found")
            raise
        except yaml.YAMLError as e:
            print(f"Error parsing configuration file: {e}")
            raise

    def setup_logging(self):
        """Configure logging based on config settings."""
        log_level = getattr(logging, self.config['monitoring']['log_level'], logging.INFO)
        
        # Create logs directory if it doesn't exist
        logs_dir = Path(self.config['paths']['output']['logs'])
        logs_dir.mkdir(exist_ok=True)
        
        # Configure logging
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(logs_dir / f"images_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_apis(self):
        """Initialize API clients."""
        # Supabase
        supabase_config = self.config['apis']['supabase']
        self.supabase: Client = create_client(
            supabase_config['url'], 
            supabase_config['anon_key']
        )
        
        # Gemini API settings
        gemini_config = self.config['apis']['gemini']
        self.gemini_api_key = gemini_config['api_key']
        self.gemini_model = gemini_config['model']
        self.gemini_timeout = gemini_config['timeout_seconds']
        self.gemini_max_retries = gemini_config['max_retries']
        self.gemini_rate_limit = gemini_config['rate_limit_delay']
        
    def load_progress(self):
        """Load existing progress or initialize new progress tracking."""
        try:
            if os.path.exists(self.progress_file):
                with open(self.progress_file, 'r') as f:
                    self.progress = json.load(f)
                if hasattr(self, 'logger'):
                    self.logger.info(f"Loaded progress: {len(self.progress.get('completed', []))} completed tours")
            else:
                self.progress = {
                    'completed': [],
                    'failed': [],
                    'current_batch': 0,
                    'started_at': datetime.now().isoformat()
                }
        except Exception as e:
            if hasattr(self, 'logger'):
                self.logger.error(f"Error loading progress: {e}")
            else:
                print(f"Error loading progress: {e}")
            self.progress = {
                'completed': [],
                'failed': [],
                'current_batch': 0,
                'started_at': datetime.now().isoformat()
            }
    
    def save_progress(self):
        """Save current progress to file."""
        try:
            self.progress['last_updated'] = datetime.now().isoformat()
            with open(self.progress_file, 'w') as f:
                json.dump(self.progress, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving progress: {e}")

    def call_gemini_api(self, prompt: str, max_retries: int = None, image_data=None) -> dict:
        """Call Gemini API with retry logic and rate limiting."""
        if max_retries is None:
            max_retries = self.gemini_max_retries
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
        headers = {'Content-Type': 'application/json'}
        
        # Construct the parts list
        parts = [{"text": prompt}]
        if image_data:
            parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": base64.b64encode(image_data).decode('utf-8')
                }
            })
        
        payload = {"contents": [{"parts": parts}]}

        for attempt in range(max_retries + 1):
            try:
                # Rate limiting
                time.sleep(self.gemini_rate_limit)
                
                self.logger.debug(f"Calling Gemini API (attempt {attempt + 1}/{max_retries + 1})")
                response = requests.post(url, headers=headers, json=payload, timeout=self.gemini_timeout)

                if not response.ok:
                    raise Exception(f"Gemini API returned status code {response.status_code}: {response.text}")

                result = response.json()

                if 'candidates' not in result or not result['candidates'] or 'content' not in result['candidates'][0]:
                    raise Exception("Invalid response format from Gemini API")

                content_parts = result['candidates'][0]['content']['parts']
                content = ''.join([part.get('text', '') for part in content_parts if 'text' in part])

                if image_data:
                    # For image validation, return the text content directly
                    return content
                else:
                    # For search terms generation, extract JSON
                    json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', content, re.DOTALL)
                    if json_match:
                        json_content = json_match.group(1).strip()
                    else:
                        json_content = content.strip()

                    # Clean and parse JSON
                    json_content = re.sub(r'[\x00-\x1F\x7F]', '', json_content)
                    json_content = json_content.strip('"\'')

                    try:
                        return json.loads(json_content)
                    except json.JSONDecodeError as e:
                        if attempt < max_retries:
                            self.logger.warning(f"JSON decode error (attempt {attempt + 1}), retrying: {e}")
                            continue
                        else:
                            raise Exception(f"Failed to parse JSON from Gemini response: {e}")

            except Exception as e:
                if attempt < max_retries:
                    self.logger.warning(f"Gemini API error (attempt {attempt + 1}), retrying: {str(e)}")
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                else:
                    self.logger.error(f"Gemini API request failed after {max_retries + 1} attempts: {str(e)}")
                    raise

    def get_tours_needing_images(self) -> List[Dict]:
        """Get all tours that don't have featured images."""
        try:
            response = self.supabase.table('tours').select('id, title, summary').is_('featured_image', 'null').execute()
            tours = response.data
            self.logger.info(f"Found {len(tours)} tours without featured images")
            return tours
        except Exception as e:
            self.logger.error(f"Error fetching tours needing images: {e}")
            return []

    def get_single_tour(self, tour_id: str) -> Optional[Dict]:
        """Get a specific tour by ID."""
        try:
            response = self.supabase.table('tours').select('id, title, summary').eq('id', tour_id).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            self.logger.error(f"Error fetching tour {tour_id}: {e}")
            return None

    def generate_search_terms_for_tour(self, tour_name: str, tour_summary: str) -> dict:
        """Generate diverse search terms for a tour using Gemini API."""
        self.logger.info(f"Generating diverse search terms for tour: {tour_name}")
        
        prompt = f"""
I need 8 specific search terms for beautiful and stunning images to convey the tour for a luxury honeymoon titled:

Tour Title: "{tour_name}"
Tour Summary: "{tour_summary}"

Please provide search terms in these categories:
1. Landmarks & Natural Features (5 terms): Specific locations, landmarks, or natural wonders one can expect from the tour
2. Cultural Elements (2 terms): Local food, traditions, festivals, or cultural experiences
3. Activities & Experiences (1 terms): Activities or experiences

Important criteria to consider: 
1) The search terms should not be too specific or they run risk of not returning any images. For example, "Sifnos Uncrowded Beach" or 'Provence lavender fields sunrise' are too specific and will not return any images. "Sifnos Greece" or 'Provence lavender fields' are ok. 
2) If there are 4 locations mentioned in the tour summary, then there should be at least 1 search term for each.
3) Be smart in selecting the search terms. Give terms that represent what customers would want from that honeymoon. Eg for the maldives, give a term for diving or a beautiful beach. For Italy, give a term for a beautiful museum or food.
4) The search term needs to relate to the tour summary.  Eg 'Sunset Boat Trip' is not a good search term because it's not specific to the tour summary. 'Greece Sailing' is ok instead if the tour is in Greece.
5) Please ensure some diversity in the search terms. For example, if one term from landmarks is 'Venice Canals', then the activity term should not be 'Gondola Ride' but maybe 'Amalfi Coast Drive' or 'Amalfi Coast Boat'. Otherwise we repeat ourselves.
6) For activities: focus on food, culture, nature and adventure. Remember it's a luxury honeymoon. 'Italian Cafe' is not special. 'Renaissance Italy Art' or 'Italian Food' are better.
7) ONLY for places that are famous with probably a lot of pictures (Italy, Japan, France, Spain, etc), avoid generic terms like 'Italian Food' or 'Italian Village' and try to be more specific. For example, if tour is in Amalfi, you could use 'Amalfi Lemons' or 'Amalfi Food' instead of 'Italian Food'.  

Format your response as a JSON object with these categories, like this:
{{
    "landmarks": ["Bali Rice Terraces", "Colosseum", "Mount Batur", "Machu Picchu"],
    "cultural": ["Balinese Dancers", "Italian Osteria"],
    "activities": ["Sunrise Yoga", "Driving Amalfi Coast", "Snorkeling Maldives"]
}}

Do not include any explanations or additional text, just the JSON object.
"""
        
        try:
            response = self.call_gemini_api(prompt)
            if response and isinstance(response, dict):
                self.logger.info(f"Successfully generated search terms: {response}")
                return response
            else:
                self.logger.error(f"Invalid response format from Gemini for search terms")
                return {}
        except Exception as e:
            self.logger.error(f"Error generating search terms for {tour_name}: {e}")
            return {}

    def search_pexels_images(self, search_term: str, per_page: int = 2) -> List[Dict]:
        """Search for images on Pexels API."""
        url = f"https://api.pexels.com/v1/search"
        params = {
            "query": search_term,
            "per_page": per_page,
            "orientation": "landscape",
        }
        
        self.logger.info(f"Searching Pexels for: '{search_term}'")
        
        # Basic rate limiting for Pexels (be respectful) - at least 1 second between requests
        current_time = time.time()
        time_since_last = current_time - self.pexels_last_request
        if time_since_last < 1:
            time.sleep(1 - time_since_last)
        self.pexels_last_request = time.time()
        
        try:
            response = requests.get(url, params=params, headers=self.pexels_headers)
            response.raise_for_status()
            data = response.json()
            photos = data.get("photos", [])
            
            formatted_photos = []
            for photo in photos:
                img_url = photo['src'].get('large2x') or photo['src'].get('original') or photo['src'].get('large')
                if img_url:
                    formatted_photos.append({
                        "src": {
                            "large2x": img_url, 
                            "original": img_url
                        },
                        "alt": photo.get('alt', ''),
                        "source": "pexels"
                    })
            return formatted_photos
        except Exception as e:
            self.logger.error(f"Error searching Pexels: {e}")
            return []

    def search_unsplash_images(self, search_term: str, per_page: int = 2) -> List[Dict]:
        """Search for images on Unsplash API."""
        url = f"https://api.unsplash.com/search/photos"
        params = {
            "query": search_term,
            "per_page": per_page,
            "orientation": "landscape"
        }
        
        self.logger.info(f"Searching Unsplash for: '{search_term}'")
        
        # Unsplash rate limiting (50 requests per hour)
        current_time = time.time()
        if current_time - self.unsplash_requests['hour_start'] >= 3600:
            self.logger.info("Resetting Unsplash request counter for new hour")
            self.unsplash_requests['count'] = 0
            self.unsplash_requests['hour_start'] = current_time
        
        # If we're about to exceed the limit, wait until the next hour
        if self.unsplash_requests['count'] >= 48:  # Leave buffer of 2 requests
            wait_time = 3600 - (current_time - self.unsplash_requests['hour_start'])
            self.logger.info(f"Reached Unsplash rate limit. Waiting {wait_time/60:.1f} minutes for next hour...")
            time.sleep(wait_time + 60)  # Add 60 seconds buffer
            self.unsplash_requests['count'] = 0
            self.unsplash_requests['hour_start'] = time.time()
        
        try:
            response = requests.get(url, params=params, headers=self.unsplash_headers)
            response.raise_for_status()
            data = response.json()
            photos = data.get("results", [])
            
            formatted_photos = []
            for photo in photos:
                formatted_photos.append({
                    "src": {
                        "large2x": photo['urls']['regular'],
                        "original": photo['urls']['full'] 
                    },
                    "alt": photo.get('alt_description', ''),
                    "source": "unsplash"
                })
            
            # Increment request counter
            self.unsplash_requests['count'] += 1
            self.logger.debug(f"Unsplash API calls this hour: {self.unsplash_requests['count']}/50")
            
            return formatted_photos
        except Exception as e:
            self.logger.error(f"Error searching Unsplash: {e}")
            return []

    def validate_single_image(self, image_data: bytes, image_url: str, tour_name: str, tour_summary: str, search_term: str, source_alt: str) -> dict:
        """Validate a single image using Gemini API."""
        self.logger.info(f"Validating image for tour '{tour_name}', search term '{search_term}'")
        
        prompt = f"""
Please evaluate this image for a luxury honeymoon website featuring a tour titled: "{tour_name}"
Tour Summary: "{tour_summary}"
Search term used: "{search_term}"
Original Alt Text: "{source_alt}"

Evaluate on a scale of 1-10 for overall suitability. Consider these criteria:
1. Relevance to the Tour Summary, the specific 'search_term', and the Original Alt Text.
2. Quality and professional appearance suitable for a luxury brand.
3. Luxury appeal and visual attractiveness.

A score of 8 is the minimum acceptable.

Big no no: 
1) Closeups of people UNLESS they are local people or folkloristic (eg Balinese dancers).
2) The picture is clearly from a country that is NOT consistent with the tour.
3) Picture is from a location that is not mentioned in the tour summary.
4) Picture is black and white.
5) Picture is too vague - could be taken anywhere.
6) Pictures that are cheesy and banal.

Format your response ONLY as JSON with the following structure, no other text:
{{ 
    "overall_score": X, 
    "description": "Brief description of what's in the image (refine original alt text if needed)", 
    "country": "Country depicted in the image, or 'Unknown'"
}}
"""
        
        try:
            response_text = self.call_gemini_api(prompt, image_data=image_data)
            
            if not response_text:
                self.logger.error(f"Failed to get validation from Gemini API for image: {image_url}")
                return {"overall_score": 0, "description": "", "country": "Unknown"}
            
            # Try to extract JSON from the response
            json_match = re.search(r'({[\s\S]*})', response_text)
            if json_match:
                json_str = json_match.group(1)
                json_str = re.sub(r'^```json\n|\n```$', '', json_str).strip()
                validation_result = json.loads(json_str)
                
                if all(key in validation_result for key in ["overall_score", "description", "country"]):
                    self.logger.info(f"Image validation result: Score {validation_result.get('overall_score', 0)}/10")
                    return validation_result
                else:
                    self.logger.error(f"Gemini validation JSON missing required keys: {validation_result}")
                    return {"overall_score": 0, "description": "", "country": "Unknown"}
            else:
                self.logger.error(f"Could not find JSON in Gemini response for image validation: {image_url}")
                return {"overall_score": 0, "description": "", "country": "Unknown"}
                
        except json.JSONDecodeError as e:
            self.logger.error(f"Error parsing JSON from image validation response ({image_url}): {e}")
            return {"overall_score": 0, "description": "", "country": "Unknown"}
        except Exception as e:
            self.logger.error(f"Unexpected error during image validation ({image_url}): {e}")
            return {"overall_score": 0, "description": "", "country": "Unknown"}

    def add_film_grain(self, img: Image.Image, intensity: float = 0.02) -> Image.Image:
        """Add film grain/noise texture to the image with 2% intensity."""
        try:
            img_array = np.array(img)
            noise = np.random.randint(
                -int(255 * intensity), 
                int(255 * intensity) + 1, 
                img_array.shape, 
                dtype=np.int16
            )
            noisy_array = img_array.astype(np.int16) + noise
            noisy_array = np.clip(noisy_array, 0, 255)
            return Image.fromarray(noisy_array.astype(np.uint8))
        except Exception as e:
            self.logger.warning(f"Failed to add film grain: {e}")
            return img

    def post_process_image(self, image_data: bytes) -> bytes:
        """Apply post-processing optimized for luxury travel photography with mobile dimensions (3:2 aspect ratio)."""
        try:
            with Image.open(BytesIO(image_data)) as img:
                # Convert to RGB if needed
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Target dimensions: 3:2 aspect ratio (1200x800px) for mobile optimization
                target_width = 1200
                target_height = 800
                target_aspect = target_width / target_height  # 3:2 = 1.5
                
                # Smart cropping to 3:2 aspect ratio
                original_width, original_height = img.size
                original_aspect = original_width / original_height
                
                if original_aspect > target_aspect:
                    # Image is wider, crop width (sides)
                    new_width = int(original_height * target_aspect)
                    left = (original_width - new_width) // 2
                    img = img.crop((left, 0, left + new_width, original_height))
                else:
                    # Image is taller, crop height (top/bottom)
                    new_height = int(original_width / target_aspect)
                    top = (original_height - new_height) // 2
                    img = img.crop((0, top, original_width, top + new_height))
                
                # Resize to target dimensions
                img = img.resize((target_width, target_height), Image.LANCZOS)
                
                # Apply luxury enhancements
                # Enhance brightness slightly
                enhancer = ImageEnhance.Brightness(img)
                img = enhancer.enhance(0.97)
                
                # Enhance contrast for depth
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(1.1)
                
                # Enhance saturation for vibrant colors
                enhancer = ImageEnhance.Color(img)
                img = enhancer.enhance(1.2)
                
                # Enhanced color channels (blue for sea/sky)
                r, g, b = img.split()
                r = r.point(lambda i: i * 1.02)
                g = g.point(lambda i: i * 1.02)
                b = b.point(lambda i: i * 1.05)  # Blue enhancement
                img = Image.merge('RGB', (r, g, b))
                
                # Sharpen for luxury detail
                img = img.filter(ImageFilter.UnsharpMask(radius=0.8, percent=70, threshold=2))
                
                # Add film grain with 2% intensity
                self.logger.debug("Applying film grain filter (2% intensity)...")
                img = self.add_film_grain(img, intensity=0.02)
                
                # Save to bytes with high quality
                output = BytesIO()
                img.save(output, format='JPEG', quality=90, optimize=True, progressive=True)
                return output.getvalue()
        except Exception as e:
            self.logger.error(f"Error post-processing image: {e}")
            return image_data

    def upload_to_supabase_storage(self, image_data: bytes, filename: str) -> Optional[str]:
        """Upload an image to Supabase Storage."""
        url = f"{self.config['apis']['supabase']['url']}/storage/v1/object/{self.storage_bucket}/{filename}"
        
        headers = {
            "apikey": self.config['apis']['supabase']['anon_key'],
            "Authorization": f"Bearer {self.config['apis']['supabase']['anon_key']}",
            "Content-Type": "image/jpeg"
        }
        
        try:
            response = requests.post(url, headers=headers, data=image_data)
            
            if response.status_code == 200:
                public_url = f"{self.config['apis']['supabase']['url']}/storage/v1/object/public/{self.storage_bucket}/{filename}"
                self.logger.info(f"Successfully uploaded image to Supabase storage: {filename}")
                return public_url.rstrip('?')
            else:
                self.logger.error(f"Error uploading to storage: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            self.logger.error(f"Exception during storage upload: {e}")
            return None

    def insert_to_tour_images(self, tour_id: str, image_url: str, alt_text: str, search_term: str, validation_result: dict, display_order: int, source_alt: str, is_featured: bool = False) -> Optional[str]:
        """Insert a record into the tour_images table."""
        try:
            now = datetime.now().isoformat()
            
            data = {
                "tour_id": tour_id,
                "image_url": image_url,
                "alt_text": alt_text,
                "is_featured": is_featured,
                "search_term": search_term,
                "overall_score": validation_result.get("overall_score", 0),
                "country_name": validation_result.get("country", "Unknown"),
                "created_at": now,
                "updated_at": now,
                "display_order": display_order,
                "alt": source_alt,
            }
            
            response = self.supabase.table(self.db_table_name).insert(data).execute()
            
            if response.data:
                inserted_id = response.data[0]["id"]
                self.logger.info(f"Successfully inserted record into {self.db_table_name} table with ID: {inserted_id}")
                return inserted_id
            else:
                self.logger.error(f"Error inserting to {self.db_table_name}: No data returned")
                return None
        except Exception as e:
            self.logger.error(f"Exception during database insert: {e}")
            return None

    def select_final_images_with_gemini(self, images: List[Dict], tour_name: str, tour_summary: str) -> List[Dict]:
        """Use Gemini to select the final subset of images with sophisticated visual curation."""
        if not images:
            return []
        
        self.logger.info(f"Using Gemini to select final images from {len(images)} candidates for tour: {tour_name}")
        
        # Prepare image data for Gemini
        images_for_gemini = []
        image_descriptions = []
        
        for i, image in enumerate(images):
            image_descriptions.append(f"""
Image {i+1}:
- URL: {image['url']}
- Search Term: {image['search_term']}
- Quality Score: {image['score']}/10
- Description: {image['description']}
- Source: {image['source']}
""")
            images_for_gemini.append(image['image_data'])
        
        prompt = f"""
You are a sophisticated visual designer with excellent taste, curating images for a luxury honeymoon travel website (similar to CNN Traveller).

TOUR CONTEXT:
Tour Name: "{tour_name}"
Tour Summary: "{tour_summary}"

TASK: Select 5-13 images (ideally around 10) from the {len(images)} candidates provided. You must select AT LEAST 5 images.

SELECTION CRITERIA:
1. AVOID DUPLICATES: Ensure the same exact subject/scene is not present in multiple images. Eg 2 images of glasses with wine are not acceptable. Just pick 1. 
2. LUXURY AESTHETIC: Choose images that convey luxury, sophistication, and premium travel experiences
3. VISUAL DIVERSITY: Select images that together tell a complete visual story of the destination
4. RELEVANCE: Ensure selected images are highly relevant to the tour summary
5. PROFESSIONAL QUALITY: Prioritize images with excellent composition, lighting, and visual appeal. Deprioritise dark images with a lot of filtering/post processing.

CANDIDATE IMAGES:
{chr(10).join(image_descriptions)}

Respond with ONLY a JSON array containing the image numbers you select (e.g., [1, 3, 5, 8, 12]).
Do not include any explanations or additional text.
Remember: You MUST select at least 5 images. These images will be used to create a slideshow on the tour page.
"""
        
        try:
            # Send all images to Gemini for selection
            response_text = self.call_gemini_api(prompt, image_data=b''.join(images_for_gemini))
            
            if not response_text:
                self.logger.error(f"Failed to get image selection from Gemini")
                return []
            
            # Extract JSON array from response
            json_match = re.search(r'\[([\d,\s]+)\]', response_text)
            if json_match:
                selected_indices = json.loads(json_match.group(0))
                # Convert to 0-based indexing
                selected_indices = [idx - 1 for idx in selected_indices if 1 <= idx <= len(images)]
                
                if len(selected_indices) < 5:
                    self.logger.error(f"Gemini selected only {len(selected_indices)} images, minimum 5 required")
                    return []
                
                selected_images = [images[i] for i in selected_indices if 0 <= i < len(images)]
                self.logger.info(f"Gemini selected {len(selected_images)} images: indices {[i+1 for i in selected_indices]}")
                return selected_images
            else:
                self.logger.error(f"Could not parse image selection from Gemini response")
                return []
                
        except Exception as e:
            self.logger.error(f"Error in Gemini image selection: {e}")
            return []

    def select_diverse_images(self, images: List[Dict], max_images: int = 13, max_per_search_term: int = 2) -> List[Dict]:
        """Select a diverse subset of images based on quality and diversity scores."""
        if not images:
            return []

        sorted_images = sorted(images, key=lambda x: x.get("score", 0), reverse=True)

        selected_images = []
        remaining_images = sorted_images.copy()
        search_term_counts = {}
        
        # Stricter similarity threshold - reject images that are too similar
        VISUAL_SIMILARITY_THRESHOLD = 0.7  # Reject if visual similarity > 70%
        TEXT_SIMILARITY_THRESHOLD = 0.8    # Reject if text similarity > 80%

        while len(selected_images) < max_images and remaining_images:
            for img in remaining_images:
                diversity_score = self.calculate_image_diversity_score(selected_images, img)
                img["diversity_score"] = diversity_score

            remaining_images.sort(key=lambda x:
                (x.get("score", 0) * 0.7) + (x.get("diversity_score", 0) * 0.3),
                reverse=True)

            image_selected_this_iteration = False
            for idx, potential_image in enumerate(remaining_images):
                # Check diversity threshold - skip if too similar to existing images
                diversity_score = potential_image.get("diversity_score", 0)
                if diversity_score < 0.3:  # Less than 30% diversity = too similar
                    self.logger.warning(f"Skipping similar image (diversity: {diversity_score:.3f}): {potential_image.get('search_term', 'unknown')}")
                    continue
                
                term = potential_image.get("search_term", "unknown_term")
                current_term_count = search_term_counts.get(term, 0)

                if current_term_count < max_per_search_term:
                    selected_image = remaining_images.pop(idx)
                    selected_images.append(selected_image)
                    search_term_counts[term] = current_term_count + 1
                    image_selected_this_iteration = True
                    self.logger.info(f"Selected image (diversity: {diversity_score:.3f}, score: {selected_image.get('score', 0)}/10): {term}")
                    break

            if not image_selected_this_iteration:
                # If no image could be selected, lower the diversity threshold slightly
                remaining_diverse = [img for img in remaining_images if img.get("diversity_score", 0) >= 0.2]
                if remaining_diverse:
                    best_remaining = max(remaining_diverse, key=lambda x: x.get("score", 0))
                    term = best_remaining.get("search_term", "unknown_term")
                    current_term_count = search_term_counts.get(term, 0)
                    if current_term_count < max_per_search_term:
                        remaining_images.remove(best_remaining)
                        selected_images.append(best_remaining)
                        search_term_counts[term] = current_term_count + 1
                        self.logger.info(f"Selected fallback image (diversity: {best_remaining.get('diversity_score', 0):.3f}): {term}")
                        continue
                break

        self.logger.info(f"Selected {len(selected_images)} images. Final counts per search term: {search_term_counts}")
        
        # Log diversity statistics
        if selected_images:
            diversity_scores = [img.get("diversity_score", 0) for img in selected_images]
            avg_diversity = sum(diversity_scores) / len(diversity_scores)
            min_diversity = min(diversity_scores)
            self.logger.info(f"Diversity stats - Average: {avg_diversity:.3f}, Minimum: {min_diversity:.3f}")
        
        return selected_images

    def delete_existing_tour_images(self, tour_id: str) -> bool:
        """Delete existing images for a tour."""
        try:
            response = self.supabase.table(self.db_table_name).delete().eq('tour_id', tour_id).execute()
            
            if hasattr(response, 'data') and isinstance(response.data, list):
                self.logger.info(f"Successfully deleted {len(response.data)} existing images for tour {tour_id}")
                return True
            elif hasattr(response, 'error') and response.error:
                self.logger.error(f"Error deleting existing images for tour {tour_id}: {response.error}")
                return False
            else:
                self.logger.info(f"No existing images found for tour {tour_id}")
                return True
        except Exception as e:
            self.logger.error(f"Exception during deletion for tour {tour_id}: {e}")
            return False

    def create_preview_page(self, tour_id: str, tour_name: str, tour_summary: str, selected_images: List[Dict], search_terms: List[str]) -> str:
        """Create HTML preview page for human quality review."""
        
        # Generate image cards HTML
        image_cards_html = ""
        for i, image in enumerate(selected_images):
            # Convert image data to base64 for display
            image_base64 = base64.b64encode(image["image_data"]).decode('utf-8')
            
            image_cards_html += f"""
            <div class="image-card">
                <img src="data:image/jpeg;base64,{image_base64}" alt="{image['description']}">
                <div class="image-info">
                    <p><strong>Search Term:</strong> {image['search_term']}</p>
                    <p><strong>Score:</strong> {image['score']}/10</p>
                    <p><strong>Source:</strong> {image.get('source', 'unknown')}</p>
                    <p><strong>Description:</strong> {image['description']}</p>
                    <p><strong>Selected by:</strong> Gemini AI Curator</p>
                </div>
            </div>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quality Review: {tour_name}</title>
            <style>
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f5f5f5; 
                }}
                .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                h1 {{ color: #2c3e50; margin-bottom: 10px; }}
                .tour-info {{ background: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 20px; }}
                .approval-buttons {{ text-align: center; margin: 30px 0; }}
                .btn {{ 
                    padding: 15px 30px; 
                    margin: 0 10px; 
                    border: none; 
                    border-radius: 5px; 
                    font-size: 16px; 
                    font-weight: bold; 
                    cursor: pointer; 
                    transition: all 0.3s ease; 
                }}
                .approve {{ background: #27ae60; color: white; }}
                .approve:hover {{ background: #229954; }}
                .reject {{ background: #e74c3c; color: white; }}
                .reject:hover {{ background: #c0392b; }}
                .image-grid {{ 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
                    gap: 20px; 
                    margin-top: 20px; 
                }}
                .image-card {{ 
                    border: 1px solid #ddd; 
                    border-radius: 8px; 
                    overflow: hidden; 
                    background: white; 
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
                }}
                .image-card img {{ 
                    width: 100%; 
                    height: 250px; 
                    object-fit: cover; 
                }}
                .image-info {{ 
                    padding: 15px; 
                }}
                .image-info p {{ 
                    margin: 5px 0; 
                    font-size: 14px; 
                }}
                .search-terms {{ 
                    background: #3498db; 
                    color: white; 
                    padding: 10px 15px; 
                    border-radius: 5px; 
                    margin: 15px 0; 
                }}
                .status {{ 
                    position: fixed; 
                    top: 20px; 
                    right: 20px; 
                    padding: 10px 20px; 
                    border-radius: 5px; 
                    color: white; 
                    font-weight: bold; 
                    display: none; 
                }}
                .status.success {{ background: #27ae60; }}
                .status.error {{ background: #e74c3c; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎯 Quality Review: {tour_name}</h1>
                
                <div class="tour-info">
                    <p><strong>Tour ID:</strong> {tour_id}</p>
                    <p><strong>Summary:</strong> {tour_summary}</p>
                </div>
                
                <div class="search-terms">
                    <strong>🔍 Search Terms Used:</strong> {', '.join(search_terms)}
                </div>
                
                <div class="approval-buttons">
                    <button class="btn approve" onclick="setApproval(true)">✅ APPROVE BATCH</button>
                    <button class="btn reject" onclick="setApproval(false)">❌ REJECT & REGENERATE</button>
                </div>
                
                <h2>📸 Selected Images ({len(selected_images)} total)</h2>
                <div class="image-grid">
                    {image_cards_html}
                </div>
            </div>
            
            <div id="status" class="status"></div>
            
            <script>
                function setApproval(approved) {{
                    const result = {{ 
                        tour_id: '{tour_id}', 
                        approved: approved, 
                        timestamp: new Date().toISOString() 
                    }};
                    
                    // Create and download approval file
                    const blob = new Blob([JSON.stringify(result, null, 2)], {{type: 'application/json'}});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'approval_{tour_id}.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    // Show status
                    const status = document.getElementById('status');
                    status.textContent = approved ? '✅ APPROVED - Check Terminal' : '❌ REJECTED - Will Regenerate';
                    status.className = 'status ' + (approved ? 'success' : 'error');
                    status.style.display = 'block';
                    
                    // Disable buttons
                    document.querySelectorAll('.btn').forEach(btn => {{
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                    }});
                }}
            </script>
        </body>
        </html>
        """
        
        preview_path = f"temp_preview_{tour_id}_{int(time.time())}.html"
        with open(preview_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return preview_path

    def wait_for_approval(self, tour_id: str, tour_name: str, preview_file: str) -> bool:
        """Wait for human approval of the image batch."""
        
        print(f"\n🔍 QUALITY REVIEW REQUIRED")
        print(f"📋 Tour: {tour_name} (ID: {tour_id})")
        print(f"📁 Preview file: {preview_file}")
        print(f"🌐 Open in browser: file://{os.path.abspath(preview_file)}")
        print("\n👉 Review the images and click APPROVE or REJECT in the browser")
        print("⏳ Waiting for your decision...")
        
        approval_file = f"approval_{tour_id}.json"
        
        # Clean up any existing approval file
        if os.path.exists(approval_file):
            os.remove(approval_file)
        
        # Wait for approval file (30 minute timeout)
        timeout = 30 * 60  # 30 minutes
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if os.path.exists(approval_file):
                try:
                    with open(approval_file, 'r') as f:
                        result = json.load(f)
                    
                    # Cleanup
                    os.remove(approval_file)
                    os.remove(preview_file)
                    
                    approved = result.get('approved', False)
                    print(f"✅ Decision received: {'APPROVED' if approved else 'REJECTED'}")
                    return approved
                    
                except Exception as e:
                    self.logger.error(f"Error reading approval file: {e}")
                    continue
            
            time.sleep(2)  # Poll every 2 seconds
        
        # Timeout - cleanup and default to rejection
        print(f"⏰ Timeout reached (30 minutes). Defaulting to REJECTION.")
        if os.path.exists(preview_file):
            os.remove(preview_file)
        if os.path.exists(approval_file):
            os.remove(approval_file)
        return False

    def process_single_tour_images(self, tour_id: str, override: bool = False, api_source: str = 'boosted', quality_review: bool = False) -> bool:
        """Process images for a single tour."""
        max_regeneration_attempts = 2 if quality_review else 1
        
        for attempt in range(max_regeneration_attempts):
            if attempt > 0:
                self.logger.info(f"Regeneration attempt {attempt + 1}/{max_regeneration_attempts} for tour {tour_id}")
            
            success = self._process_tour_images_attempt(tour_id, override, api_source, quality_review, attempt)
            if success:
                return True
            
            if not quality_review:
                # If not in quality review mode, don't retry
                break
                
        return False
    
    def _process_tour_images_attempt(self, tour_id: str, override: bool, api_source: str, quality_review: bool, attempt: int) -> bool:
        """Single attempt at processing tour images."""
        try:
            # Get tour data
            tour_data = self.get_single_tour(tour_id)
            if not tour_data:
                self.logger.error(f"Tour {tour_id} not found")
                return False
            
            tour_name = tour_data['title']
            tour_summary = tour_data.get('summary', '')
            
            self.logger.info(f"Processing images for tour: {tour_name} (ID: {tour_id})")
            
            # Check for existing images
            if not override:
                existing_images = self.supabase.table(self.db_table_name).select('id', count='exact').eq('tour_id', tour_id).execute()
                if existing_images.count and existing_images.count > 0:
                    self.logger.info(f"Tour {tour_name} already has {existing_images.count} images and override is False. Skipping.")
                    return True
            else:
                # Delete existing images if override is True
                if not self.delete_existing_tour_images(tour_id):
                    self.logger.error(f"Failed to delete existing images for tour {tour_id}")
                    return False
            
            # Generate search terms
            search_terms = self.generate_search_terms_for_tour(tour_name, tour_summary)
            if not search_terms:
                self.logger.error(f"Could not generate search terms for tour: {tour_name}")
                return False
            
            all_candidate_images = []
            display_order_counter = 0
            
            # Process each category of search terms
            for category, terms in search_terms.items():
                self.logger.info(f"Processing {category} search terms for tour: {tour_name}")
                
                for search_term in terms:
                    self.logger.info(f"Processing search term: '{search_term}' for tour: {tour_name} using {api_source.upper()}")
                    
                    # Search APIs based on source selection
                    all_results = []
                    if api_source == 'pexels' or api_source == 'boosted':
                        pexels_results = self.search_pexels_images(search_term, per_page=2)
                        for res in pexels_results:
                            res['source'] = 'pexels'
                        all_results.extend(pexels_results)
                        
                    if api_source == 'unsplash' or api_source == 'boosted':
                        unsplash_results = self.search_unsplash_images(search_term, per_page=2)
                        for res in unsplash_results:
                            res['source'] = 'unsplash'
                        all_results.extend(unsplash_results)
                    
                    if not all_results:
                        self.logger.warning(f"No results found for search term: '{search_term}'")
                        continue
                    
                    self.logger.info(f"Found {len(all_results)} total images from {api_source.upper()} source(s) for search term: '{search_term}' (expecting 4 max: 2 Pexels + 2 Unsplash)")
                    
                    # Process each image
                    for i, image_meta in enumerate(all_results):
                        try:
                            image_url = image_meta["src"]["large2x"] or image_meta["src"]["original"]
                            source_alt_text = image_meta.get("alt", "")
                            image_source = image_meta.get("source", "unknown")
                            
                            self.logger.info(f"  Processing image [{i+1}/{len(all_results)}] from {image_source.upper()}: {image_url}")

                            # Download image
                            img_response = requests.get(image_url, timeout=20)
                            img_response.raise_for_status()
                            image_data = img_response.content

                            # Validate image
                            validation_result = self.validate_single_image(
                                image_data=image_data,
                                image_url=image_url, 
                                tour_name=tour_name, 
                                tour_summary=tour_summary, 
                                search_term=search_term,
                                source_alt=source_alt_text
                            )
                            
                            overall_score = float(validation_result.get("overall_score", 0))
                            
                            if overall_score < self.image_quality_threshold:
                                self.logger.warning(f"    Image rejected: Score {overall_score}/10 below minimum {self.image_quality_threshold}")
                                continue
                            
                            self.logger.info(f"    Image ACCEPTED with score {overall_score}/10")
                            
                            all_candidate_images.append({
                                "image_data": image_data,
                                "url": image_url, 
                                "description": validation_result.get("description", ""),
                                "country": validation_result.get("country", "Unknown"),
                                "score": overall_score,
                                "search_term": search_term, 
                                "category": category, 
                                "alt": source_alt_text,
                                "source": image_source
                            })
                                
                        except Exception as e:
                            self.logger.error(f"    Error processing image {i+1} for search term '{search_term}': {e}")
                    
                    time.sleep(2)  # Rate limiting
            
            # Use Gemini to select final images with sophisticated curation
            selected_images = self.select_final_images_with_gemini(all_candidate_images, tour_name, tour_summary)
            
            # Check if we have enough images (minimum 5 required)
            if len(selected_images) < 5:
                self.logger.error(f"Gemini selected only {len(selected_images)} images, minimum 5 required. Regenerating search terms and retrying.")
                return False  # This will trigger a retry in the calling function
            
            # Quality review if enabled
            if quality_review:
                # Collect all search terms used
                all_search_terms = []
                for category, terms in search_terms.items():
                    all_search_terms.extend(terms)
                
                # Create preview and wait for approval
                preview_file = self.create_preview_page(tour_id, tour_name, tour_summary, selected_images, all_search_terms)
                approved = self.wait_for_approval(tour_id, tour_name, preview_file)
                
                if not approved:
                    self.logger.info(f"Images for tour '{tour_name}' were rejected. Skipping upload.")
                    return False
                
                self.logger.info(f"Images for tour '{tour_name}' were approved. Proceeding with upload.")
            
            # Upload selected images
            self.logger.info(f"Uploading {len(selected_images)} selected images for tour '{tour_name}'")
            uploaded_images = []
            featured_set = False

            for image in selected_images:
                try:
                    # Generate filename
                    unique_id = str(uuid.uuid4()).replace("-", "")[:12]
                    safe_tour_name = re.sub(r'[^a-zA-Z0-9]', '_', tour_name.lower())
                    safe_search_term = re.sub(r'[^a-zA-Z0-9]', '_', image["search_term"].lower())
                    filename = f"{safe_tour_name}_{safe_search_term}_{unique_id}.jpg"

                    # Post-process image
                    processed_image_data = self.post_process_image(image["image_data"])

                    # Upload to storage
                    storage_url = self.upload_to_supabase_storage(processed_image_data, filename)
                    if not storage_url:
                        self.logger.error(f"Failed to upload image to storage")
                        continue

                    # Set as featured if first high-scoring image
                    is_featured = not featured_set and image["score"] >= 9.0
                    if is_featured:
                        featured_set = True
                        self.logger.info(f"Setting image as featured (Score: {image['score']})")

                    display_order_counter += 1

                    # Insert into database
                    image_id = self.insert_to_tour_images(
                        tour_id=tour_id,
                        image_url=storage_url,
                        alt_text=image["description"],
                        search_term=image["search_term"],
                        validation_result={
                            "overall_score": image["score"],
                            "description": image["description"],
                            "country": image["country"]
                        },
                        display_order=display_order_counter,
                        source_alt=image["alt"],
                        is_featured=is_featured
                    )

                    if image_id:
                        uploaded_images.append({
                            "id": image_id,
                            "url": storage_url,
                            "score": image["score"],
                            "is_featured": is_featured
                        })
                        self.logger.info(f"Successfully processed image (Score: {image['score']}/10, Order: {display_order_counter})")

                except Exception as e:
                    self.logger.error(f"Error processing image: {e}")

            self.logger.info(f"Successfully processed {len(uploaded_images)} images for tour: {tour_name}")
            
            # Update tour featured_image if we set one
            if featured_set:
                featured_image = next((img for img in uploaded_images if img["is_featured"]), None)
                if featured_image:
                    try:
                        self.supabase.table('tours').update({"featured_image": featured_image["url"]}).eq('id', tour_id).execute()
                        self.logger.info(f"Updated tour featured_image for {tour_name}")
                    except Exception as e:
                        self.logger.error(f"Error updating tour featured_image: {e}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error processing tour images for {tour_id} (attempt {attempt + 1}): {e}")
            return False

    def process_tours_batch(self, tours: List[Dict], start_idx: int = 0, override: bool = False, api_source: str = 'boosted', quality_review: bool = False) -> Tuple[int, int]:
        """Process a batch of tours."""
        batch_size = self.config['processing']['batch_size']
        
        successful = 0
        failed = 0
        
        for i in range(start_idx, len(tours), batch_size):
            batch = tours[i:i + batch_size]
            self.logger.info(f"Processing batch {i//batch_size + 1}: tours {i+1}-{min(i+batch_size, len(tours))}")
            
            for tour in batch:
                tour_id = tour['id']
                tour_name = tour['title']
                
                if self.process_single_tour_images(tour_id, override, api_source, quality_review):
                    successful += 1
                    if tour_id not in self.progress['completed']:
                        self.progress['completed'].append(tour_id)
                else:
                    failed += 1
                    self.progress['failed'].append({
                        'tour_id': tour_id,
                        'tour_name': tour_name,
                        'error': 'Image processing failed',
                        'timestamp': datetime.now().isoformat()
                    })
                    
                self.save_progress()
                    
                # Check failure thresholds
                if failed >= self.config['monitoring']['failure_thresholds'].get('max_failed_tours_per_batch', 5):
                    self.logger.error(f"Too many failures in batch, stopping")
                    break
            
            # Update batch progress
            self.progress['current_batch'] = i // batch_size + 1
            self.save_progress()
            
            self.logger.info(f"Batch completed. Successful: {successful}, Failed: {failed}")
            
        return successful, failed

    def run_images_pipeline(self, resume: bool = True, override: bool = False, api_source: str = 'boosted', quality_review: bool = False):
        """Run the complete tour images pipeline."""
        try:
            self.logger.info("Starting Tour Images Pipeline")
            
            # Get tours needing images
            tours = self.get_tours_needing_images()
            
            if not tours:
                self.logger.info("No tours found needing images")
                return
            
            self.logger.info(f"Found {len(tours)} tours needing images")
            
            # Determine starting point for resumability
            start_idx = 0
            if resume and self.progress.get('completed') and not override:
                completed_count = len(self.progress['completed'])
                # Filter out already completed tours
                remaining_tours = [t for t in tours if t['id'] not in self.progress['completed']]
                tours = remaining_tours
                self.logger.info(f"Resuming: {completed_count} already completed, {len(tours)} remaining")
            
            if not tours:
                self.logger.info("All tours already have images processed")
                return
            
            # Process tours
            successful, failed = self.process_tours_batch(tours, start_idx, override, api_source, quality_review)
            
            # Final report
            total_completed = len(self.progress.get('completed', []))
            total_failed = len(self.progress.get('failed', []))
            
            self.logger.info("="*60)
            self.logger.info("TOUR IMAGES PIPELINE COMPLETE")
            self.logger.info(f"Total Completed: {total_completed}")
            self.logger.info(f"Total Failed: {total_failed}")
            if total_completed + total_failed > 0:
                self.logger.info(f"Success Rate: {(total_completed/(total_completed+total_failed)*100):.1f}%")
            self.logger.info("="*60)
            
            if total_failed > 0:
                self.logger.info("Failed tours:")
                for failure in self.progress.get('failed', []):
                    self.logger.info(f"  - {failure.get('tour_name', failure.get('tour_id'))}: {failure.get('error')}")
            
        except Exception as e:
            self.logger.error(f"Pipeline execution failed: {e}")
            raise

def main():
    parser = argparse.ArgumentParser(
        description='Tour Images Pipeline - Populate images for tours without featured images',
        epilog="""
Examples:
  # Process all tours needing images
  python populate_tour_images.py
  
  # Process with quality review for manual approval
  python populate_tour_images.py --quality-review
  
  # Process specific tour with quality review
  python populate_tour_images.py --tour-id ABC123 --quality-review
  
  # Process using only Pexels with quality review
  python populate_tour_images.py --api-source pexels --quality-review
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('--config', default=CONFIG_FILE, help='Configuration file path')
    parser.add_argument('--no-resume', action='store_true', help='Start fresh, ignore existing progress')
    parser.add_argument('--tour-id', type=str, help='Process only a specific tour by ID')
    parser.add_argument('--override', action='store_true', help='Override existing images if they already exist')
    parser.add_argument('--api-source', type=str, choices=['pexels', 'unsplash', 'boosted'], default='boosted', 
                        help='Image API source(s) to use (pexels, unsplash, or boosted), default: boosted')
    parser.add_argument('--quality-review', action='store_true', help='Enable human quality review before uploading images')
    
    args = parser.parse_args()
    
    try:
        pipeline = TourImagesPipeline(args.config)
        
        if args.tour_id:
            # Process single tour
            success = pipeline.process_single_tour_images(args.tour_id, args.override, args.api_source, args.quality_review)
            print(f"Tour image processing {'succeeded' if success else 'failed'}")
        else:
            # Run full pipeline
            pipeline.run_images_pipeline(resume=not args.no_resume, override=args.override, api_source=args.api_source, quality_review=args.quality_review)
            
    except Exception as e:
        print(f"Pipeline failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 