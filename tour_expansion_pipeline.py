#!/usr/bin/env python3
"""
Tour Expansion Pipeline
Extends from 148 to 250 tours by processing incipit_v2.csv
Generates comprehensive tour content including questionnaire-specific fields
"""

import json
import requests
from supabase import create_client, Client
import random
import re
import unicodedata
import argparse
import csv
import yaml
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import time
import os
import logging
from pathlib import Path

# Configuration
CONFIG_FILE = "config.yaml"

class TourExpansionPipeline:
    def __init__(self, config_path: str = CONFIG_FILE):
        """Initialize the pipeline with configuration."""
        self.config = self.load_config(config_path)
        self.setup_logging()  # Setup logging first
        self.setup_apis()
        self.progress_file = self.config['processing']['progress_file']
        self.load_progress()
        
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
                logging.FileHandler(logs_dir / f"expansion_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
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

    def custom_slugify(self, text: str) -> str:
        """Convert text to URL-friendly slug."""
        text = text.lower()
        text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
        text = re.sub(r'[^a-z0-9]+', '-', text)
        text = text.strip('-')
        return text

    def call_gemini_api(self, prompt: str, max_retries: int = None) -> dict:
        """Call Gemini API with retry logic and rate limiting."""
        if max_retries is None:
            max_retries = self.gemini_max_retries
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
        headers = {'Content-Type': 'application/json'}
        payload = {"contents": [{"parts": [{"text": prompt.strip()}]}]}

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

                # Extract JSON content
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

    def load_tours_from_csv(self, filename: str) -> List[Dict]:
        """Load tours from CSV file."""
        tours = []
        try:
            with open(filename, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                self.logger.info(f"CSV Headers: {reader.fieldnames}")
                for i, row in enumerate(reader):
                    row['_row_number'] = i + 1  # Add row number for tracking
                    tours.append(row)
            self.logger.info(f"Loaded {len(tours)} tours from {filename}")
            return tours
        except FileNotFoundError:
            self.logger.error(f"Input file '{filename}' not found")
            raise
        except Exception as e:
            self.logger.error(f"Error reading CSV file '{filename}': {e}")
            raise

    def extract_countries_from_csv(self, countries_str: str) -> List[str]:
        """Extract country names from the CSV countries column."""
        countries = []
        
        # Handle comma-separated countries
        if ',' in countries_str:
            # Multi-country format like "Argentina, Chile"
            countries = [country.strip() for country in countries_str.split(',')]
        else:
            # Single country
            countries = [countries_str.strip()]
        
        # Clean up country names
        cleaned_countries = []
        for country in countries:
            # Remove quotes and extra spaces
            clean_country = country.strip().strip('"\'')
            if clean_country and clean_country not in cleaned_countries:
                cleaned_countries.append(clean_country)
                
        return cleaned_countries

    def get_countries_uuids(self, country_names: List[str]) -> List[str]:
        """Get UUIDs for country names from database."""
        country_uuids = []
        
        for country_name in country_names:
            try:
                clean_name = country_name.strip()
                
                # First try exact match
                response = self.supabase.table('countries').select('id').eq('name', clean_name).execute()
                if response.data and len(response.data) > 0:
                    country_uuids.append(response.data[0]['id'])
                    continue
                
                # Try case-insensitive match
                response = self.supabase.table('countries').select('id').ilike('name', f'%{clean_name}%').execute()
                if response.data and len(response.data) > 0:
                    self.logger.info(f"Found country by approximate match: '{clean_name}' -> '{response.data[0]['id']}'")
                    country_uuids.append(response.data[0]['id'])
                    continue
                
                self.logger.warning(f"Country '{clean_name}' not found in database")
                
            except Exception as e:
                self.logger.error(f"Error retrieving country ID for {country_name}: {str(e)}")
        
        return country_uuids

    def get_region_id_from_countries(self, country_uuids: List[str]) -> Optional[str]:
        """Get region ID from the first country's region."""
        if not country_uuids:
            return None
            
        try:
            response = self.supabase.table('countries').select('region_id').eq('id', country_uuids[0]).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]['region_id']
        except Exception as e:
            self.logger.error(f"Error retrieving region ID: {e}")
        
        return None

    def generate_basic_tour_content_prompt(self, tour_data: Dict) -> str:
        """Generate prompt for basic tour content (Call 1)."""
        tour_name = tour_data.get('Tour Name', 'N/A')
        countries = tour_data.get('Country / Countries', 'N/A')
        description = tour_data.get('A quick description', 'N/A')
        days = tour_data.get('Number of days', 'N/A')
        price = tour_data.get('Price', 'N/A')

        return f"""
    Context: You are a high-end (affordable luxury to luxury) travel expert specializing in helping honeymooners plan their dream honeymoon.

INPUT TOUR DATA:
- Tour Name: {tour_name}
- Countries: {countries}
- Description: {description}
- Duration: {days} days
- Price Guide: {price}

GENERATE BASIC TOUR CONTENT as a JSON object with these exact keys:

{{
  "slug": "SEO-optimized slug starting with 'honeymoon-' (e.g., 'honeymoon-italy-tuscany-florence-siena')",
  "duration": "Duration in days as integer (should be fairly relaxed pace, e.g., 10)",
  "guide_price": "Price in GBP as integer (considering 'affordable luxury' to 'luxury' accommodations, food and transportation, e.g., 6500)",
  "summary": "Compelling 150-word summary for couples (engaging and interesting, never in first person but can say 'we like this because..')",
  "description": "Detailed 300-word description with paragraphs separated by \\n (elaborate on experience and highlights, explain why highly recommended)",
  "collection": "Choose from ['Culture & Elegance', 'Beach & Relaxation', 'Adventure & Discovery', 'Safari & Wildlife', 'Mini-moon' if duration is 7 days, 'Road Trips']"
}}

EXAMPLE REFERENCE (Tuscan Countryside Retreat):
- slug: "honeymoon-italy-tuscany-florence-siena"
- duration: 10
- guide_price: 6500
- summary: "Surrender to the romance of Tuscany on this unforgettable journey through its heartland. Begin amidst the Renaissance masterpieces of Florence before escaping to the iconic Chianti region. Here, picture yourselves staying in beautifully restored country estates, surrounded by vineyards and olive groves. Indulge in leisurely drives through rolling hills, stopping for wine tastings and authentic farm-to-table meals. Continue to the captivating medieval city of Siena, famed for its stunning Piazza del Campo. This itinerary perfectly blends world-class art and history with tranquil countryside relaxation, delicious food, and exquisite wine – the essential ingredients for a magical Italian honeymoon. It offers a relaxed pace, allowing ample time for discovery and connection."
- collection: "Culture & Elegance"

IMPORTANT WRITING GUIDELINES:
- You are writing for a travel BLOG (not a travel agency), so avoid saying "We'll arrange exclusive experiences"
- DO NOT mention specific hotels or "Suggested accommodations" 
- Feel free to leverage boutique or high-end travel websites for inspiration
- Focus on exciting, interesting, and romantic descriptions
- Write for honeymooners planning their dream honeymoon
- Remember this is 'affordable luxury' 

Return ONLY the JSON object, properly formatted.
"""

    def generate_questionnaire_data_prompt(self, tour_data: Dict, basic_content: Dict) -> str:
        """Generate prompt for questionnaire fields (Call 2) - based on questions_vectors_tours.py approach."""
        tour_name = tour_data.get('Tour Name', 'N/A')
        countries = tour_data.get('Country / Countries', 'N/A')
        duration = basic_content.get('duration', 7)
        collection = basic_content.get('collection', 'Not specified')
        description = basic_content.get('description', 'Not provided')
        summary = basic_content.get('summary', 'Not provided')

        # Truncate for prompt efficiency
        description_preview = (description[:700] + "...") if description and len(description) > 700 else (description or "")
        summary_preview = (summary[:400] + "...") if summary and len(summary) > 400 else (summary or "")

        return f"""
Analyze the following honeymoon tour information to generate structured questionnaire data.

Tour Information:
- Tour Name: {tour_name}
- Countries: {countries}
- Duration: {duration} days
- Collection: {collection}
- Summary: {summary_preview}
- Description: {description_preview}

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
    "long_flights": integer // Assign 1 if the destination is typically considered a long-haul flight (e.g., >7-8 hours) from London (eg South America, Australia, Asia, Africa), 0 otherwise (e.g., within Europe, Caribbean from US, North Africa from Europe)
  }},
  "best_season": {{ // Assign 1 for seasons generally considered ideal for this destination/activities, 0 otherwise. Infer based on common knowledge if description/summary lacks specifics.
    "spring": integer, 
    "summer": integer, 
    "autumn": integer, 
    "winter": integer 
  }},
  "pace": string, // Choose ONE: "relaxed" (minimal travel between locations, ample free time, focus on unwinding), "balanced" (a good mix of scheduled activities, travel between locations, and free time), or "active" (frequent location changes, packed itinerary, many activities per day)
  "geo_region": string, // Choose ONE: "Europe", "Asia", "Africa", "Americas", "Oceania", "Caribbean & Central America" based on the primary location(s) of the tour.
  "theme_tags": {{ // For each theme, assign 1 if it strongly represents the tour's focus, 0 otherwise. Multiple themes can be 1.
    "Pure Relaxation & Island Bliss": integer,
    "Cultural Discovery & Historic Charm": integer,
    "Wildlife & Epic Landscapes": integer,
    "Active Adventures": integer
  }},
  "recommendation_metric": integer // Score from 1-5 based on appeal to honeymooners. We want to be able to rank tours by this metric.
}}

QUESTIONNAIRE FIELD REFERENCE (Tuscan Countryside Retreat):
- activity: {{"relaxation_spas": 1, "historical_sites": 1, "urban_landscapes": 1, "wildlife_encounters": 0, "cultural_experiences": 1, "food_wine_experiences": 1, "beach_water_activities": 0, "hiking_active_pursuits": 0}}
- pace: "relaxed"
- callouts: {{"very_remote": 0, "long_flights": 1, "intense_hiking": 0, "very_hot_climate": 0, "very_cold_climate": 0}}
- best_season: {{"autumn": 1, "spring": 1, "summer": 1, "winter": 0}}
- geo_region: "Europe"
- theme_tags: {{"Active Adventures": 0, "Wildlife & Epic Landscapes": 0, "Pure Relaxation & Island Bliss": 0, "Cultural Discovery & Historic Charm": 1}}
- recommendation_metric: 5

Ensure the output is ONLY the valid JSON object.
"""

    def generate_structured_components_prompt(self, tour_data: Dict, basic_content: Dict) -> str:
        """Generate prompt for highlights, itinerary, and locations (Call 3)."""
        tour_name = tour_data.get('Tour Name', 'N/A')
        countries = tour_data.get('Country / Countries', 'N/A')
        description = tour_data.get('A quick description', 'N/A')
        days = basic_content.get('duration', 7)
        collection = basic_content.get('collection', 'Not specified')
        summary = basic_content.get('summary', 'Not provided')

        return f"""
You are a luxury honeymoon travel expert creating structured tour components for our premium honeymoon platform.

INPUT TOUR DATA:
- Tour Name: {tour_name}
- Countries: {countries}
- Description: {description}
- Duration: {days} days
- Collection: {collection}
- Summary: {summary}

GENERATE STRUCTURED COMPONENTS as a JSON object with these exact keys:

{{
  "highlights": [
    {{
      "title": "Short title (max 5 words)",
      "description": "Description (max 50 words)",
      "order": 1
    }}
    // EXACTLY 6 highlights total, orders 1-6
  ],
  "itinerary": [
    {{
      "day_range": "Day range like 'Days 1-3' or 'Day 4'",
      "title": "Section title",
      "content": "Detailed content (no more than 75 words). Use proper paragraph structure with line breaks (\\n\\n) between paragraphs for readability. Avoid wall-of-text formatting.",
      "order_index": 1
    }}
    // Number of sections based on tour duration and complexity
  ],
  "locations": [
    {{
      "name": "City/destination name where you stay overnight",
      "latitude": 43.7696,
      "longitude": 11.2558,
      "description": "Brief description of the destination/city (50-100 words)",
      "order_index": 1
    }}
    // IMPORTANT: Locations are OVERNIGHT STOPS only - cities/destinations where accommodation changes, NOT attractions or points of interest
  ]
}}

EXAMPLES FROM TUSCAN COUNTRYSIDE RETREAT:

HIGHLIGHTS EXAMPLES:
1. {{"title": "Romantic Florence Art Exploration", "description": "Discover Florence's Renaissance heart, marveling at Michelangelo's David and wandering artistic streets hand-in-hand.", "order": 1}}
2. {{"title": "Intimate Oltrarno Trattoria Dinner", "description": "Savor authentic Tuscan flavors during a romantic dinner at a traditional trattoria in Florence's charming Oltrarno district.", "order": 2}}
3. {{"title": "Luxury Chianti Villa Escape", "description": "Unwind in a characterful private villa or farmhouse nestled amidst vineyards, enjoying serene Tuscan countryside views.", "order": 3}}

LOCATIONS EXAMPLES (OVERNIGHT STOPS ONLY):
1. {{"name": "Florence", "latitude": 43.7696, "longitude": 11.2558, "description": "Renaissance capital where you'll spend your first nights, renowned for art, architecture, and romantic atmosphere.", "order_index": 1}}
2. {{"name": "Chianti Region", "latitude": 43.5875, "longitude": 11.3175, "description": "Rolling hills countryside where you'll stay in a villa or farmhouse, known for world-class wines and scenic landscapes.", "order_index": 2}}
3. {{"name": "Siena", "latitude": 43.3181, "longitude": 11.3306, "description": "Medieval hilltop city where you'll spend your final nights, famous for its stunning central piazza and Gothic architecture.", "order_index": 3}}

LOCATION GUIDELINES - READ CAREFULLY:
- Locations = Cities/destinations where you change accommodation and stay overnight
- For a 7-day Vienna mini-moon: Only 1 location (Vienna)
- For a 10-day Italy tour: Typically 2-4 locations (e.g., Rome, Florence, Venice)
- For a 14-day multi-country tour: Typically 3-6 locations (e.g., different cities/regions)
- DO NOT include: Museums, restaurants, attractions, day-trip destinations, palaces, monuments
- DO include: Cities, regions, or resort areas where accommodation is booked for multiple nights

ITINERARY EXAMPLE (note the paragraph structure):
{{"day_range": "4-7", "title": "Chianti Charm: Vineyards, Vistas & Villa Serenity", "content": "Journey south into the heart of Tuscany, the rolling hills of Chianti. Check into your idyllic countryside retreat – perhaps a beautifully restored farmhouse or a private luxury villa nestled amongst vineyards and olive groves.\\n\\nThese days are designed for blissful immersion and unhurried exploration. Wake to the gentle Tuscan sun and birdsong. Discover charming hilltop towns like Greve in Chianti, with its lively market square, or the medieval fortress town of Radda.\\n\\nIndulge in an exclusive Chianti Classico experience: enjoy a private tour of a prestigious wine estate, learn the art of Tuscan winemaking, and savor guided tastings of exceptional vintages. Unleash your inner chef with a hands-on cooking class focused on seasonal, local ingredients.", "order_index": 2}}

CRITICAL FORMATTING REQUIREMENTS:
- Itinerary content MUST use \\n\\n to separate paragraphs for readability
- Avoid creating walls of text - break content into digestible paragraphs
- Each paragraph should focus on a specific aspect (arrival, activities, dining, etc.)
- Use descriptive, engaging language that appeals to honeymooners

GUIDELINES:
- ALWAYS create exactly 6 highlights for every tour
- Determine appropriate number of itinerary sections based on tour duration and scope
- Multi-country tours should have more locations and sections than single-destination tours
- Ensure all content is of elevated quality, romantic, luxurious, and appealing to honeymooners
- Use accurate coordinates for real locations
- Make itinerary content detailed, engaging, and properly formatted with paragraph breaks
- Try to provide a diverse set of highlights - do not repeat very similar highlights

Return ONLY the JSON object, properly formatted.
"""

    def check_existing_tour_by_title(self, title: str) -> bool:
        """Check if tour with given title already exists in database."""
        try:
            response = self.supabase.table('tours').select('id').eq('title', title).execute()
            return bool(response.data)
        except Exception as e:
            self.logger.error(f"Error checking existing tour by title: {e}")
            return False

    def check_existing_tour(self, slug: str) -> bool:
        """Check if tour with given slug already exists."""
        try:
            response = self.supabase.table('tours').select('id').eq('slug', slug).execute()
            return bool(response.data)
        except Exception as e:
            self.logger.error(f"Error checking existing tour: {e}")
            return False

    def create_tour_record(self, tour_data: Dict, content_json: Dict, countries: List[str]) -> Optional[str]:
        """Create the main tour record and return tour ID."""
        try:
            # Get country UUIDs and region
            country_uuids = self.get_countries_uuids(countries)
            region_id = self.get_region_id_from_countries(country_uuids)

            # Generate slug with uniqueness check
            base_slug = content_json.get('slug', self.custom_slugify(tour_data['Tour Name']))
            if not base_slug.startswith('honeymoon-'):
                base_slug = f"honeymoon-{base_slug}"
            
            slug = base_slug
            counter = 1
            while self.check_existing_tour(slug):
                slug = f"{base_slug}-{counter}"
                counter += 1

            # Prepare tour data
            tour_record = {
                "title": tour_data['Tour Name'],
                "slug": slug,
                "duration": int(content_json.get('duration', 7)),
                "guide_price": content_json.get('guide_price'),
                "summary": content_json.get('summary'),
                "description": content_json.get('description'),
                "region_id": region_id,
                "countries": country_uuids if country_uuids else [],
                "collection": content_json.get('collection'),
                "is_featured": False,
                
                # Questionnaire-specific fields
                "activity": content_json.get('activity'),
                "pace": content_json.get('pace'),
                "callouts": content_json.get('callouts'),
                "best_season": content_json.get('best_season'),
                "geo_region": content_json.get('geo_region'),
                "theme_tags": content_json.get('theme_tags'),
                "recommendation_metric": content_json.get('recommendation_metric'),
                
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }

            # Insert tour
            response = self.supabase.table('tours').insert(tour_record).execute()
            
            if not response.data:
                raise Exception("No data returned from tour insert")
                
            tour_id = response.data[0]['id']
            self.logger.info(f"Created tour: {tour_data['Tour Name']} (ID: {tour_id})")
            return tour_id
            
        except Exception as e:
            self.logger.error(f"Error creating tour record: {e}")
            return None

    def create_tour_highlights(self, tour_id: str, highlights: List[Dict]) -> bool:
        """Create tour highlights records."""
        try:
            highlights_records = []
            for highlight in highlights:
                highlights_records.append({
                    "tour_id": tour_id,
                    "title": highlight['title'],
                    "description": highlight['description'],
                    "order": highlight['order'],
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                })
            
            response = self.supabase.table('tour_highlights').insert(highlights_records).execute()
            self.logger.info(f"Created {len(highlights_records)} highlights for tour {tour_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error creating tour highlights: {e}")
            return False

    def create_tour_itinerary(self, tour_id: str, itinerary: List[Dict]) -> bool:
        """Create tour itinerary records."""
        try:
            itinerary_records = []
            for item in itinerary:
                itinerary_records.append({
                    "tour_id": tour_id,
                    "day_range": item['day_range'],
                    "title": item['title'],
                    "content": item['content'],
                    "order_index": item['order_index'],
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                })
            
            response = self.supabase.table('tour_itineraries').insert(itinerary_records).execute()
            self.logger.info(f"Created {len(itinerary_records)} itinerary items for tour {tour_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error creating tour itinerary: {e}")
            return False

    def create_tour_locations(self, tour_id: str, locations: List[Dict]) -> bool:
        """Create tour locations records."""
        try:
            location_records = []
            for location in locations:
                location_records.append({
                    "tour_id": tour_id,
                    "name": location['name'],
                    "latitude": float(location['latitude']),
                    "longitude": float(location['longitude']),
                    "description": location.get('description'),
                    "order_index": location['order_index']
                })
            
            response = self.supabase.table('tour_locations').insert(location_records).execute()
            self.logger.info(f"Created {len(location_records)} locations for tour {tour_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error creating tour locations: {e}")
            return False

    def process_single_tour(self, tour_data: Dict, override: bool = False) -> bool:
        """Process a single tour through the complete pipeline using 3 targeted API calls."""
        tour_name = tour_data.get('Tour Name', 'Unknown')
        row_number = tour_data.get('_row_number', 'Unknown')
        
        try:
            self.logger.info(f"Processing tour {row_number}: {tour_name}")
            
            # Check if already exists in database (skip check if override is True)
            if not override and self.check_existing_tour_by_title(tour_name):
                self.logger.info(f"Tour '{tour_name}' already exists in database, skipping")
                return True
            
            # Extract countries
            countries = self.extract_countries_from_csv(tour_data.get('Country / Countries', ''))
            
            # CALL 1: Generate basic tour content
            self.logger.info(f"Call 1/3: Generating basic tour content for {tour_name}")
            basic_prompt = self.generate_basic_tour_content_prompt(tour_data)
            basic_content = self.call_gemini_api(basic_prompt)
            
            # Log basic content for validation
            self.logger.info(f"✓ BASIC CONTENT: slug='{basic_content.get('slug', 'N/A')}', duration={basic_content.get('duration', 'N/A')}, price=£{basic_content.get('guide_price', 'N/A')}, collection='{basic_content.get('collection', 'N/A')}'")
            self.logger.info(f"  Summary: {basic_content.get('summary', 'N/A')[:100]}...")
            
            # Validate basic content
            required_basic_keys = ['slug', 'duration', 'guide_price', 'summary', 'description', 'collection']
            missing_basic_keys = [key for key in required_basic_keys if key not in basic_content]
            if missing_basic_keys:
                raise Exception(f"Missing required basic content keys: {missing_basic_keys}")
            
            # CALL 2: Generate questionnaire data
            self.logger.info(f"Call 2/3: Generating questionnaire data for {tour_name}")
            questionnaire_prompt = self.generate_questionnaire_data_prompt(tour_data, basic_content)
            questionnaire_data = self.call_gemini_api(questionnaire_prompt)
            
            # Log questionnaire data for validation
            activity_summary = {k: v for k, v in questionnaire_data.get('activity', {}).items() if v == 1}
            self.logger.info(f"✓ QUESTIONNAIRE: pace='{questionnaire_data.get('pace', 'N/A')}', geo_region='{questionnaire_data.get('geo_region', 'N/A')}', recommendation={questionnaire_data.get('recommendation_metric', 'N/A')}")
            self.logger.info(f"  Activities: {list(activity_summary.keys())}")
            
            # Validate questionnaire data
            required_questionnaire_keys = ['activity', 'pace', 'callouts', 'best_season', 'geo_region', 'theme_tags', 'recommendation_metric']
            missing_questionnaire_keys = [key for key in required_questionnaire_keys if key not in questionnaire_data]
            if missing_questionnaire_keys:
                raise Exception(f"Missing required questionnaire fields: {missing_questionnaire_keys}")
            
            # Validate questionnaire data types
            if not isinstance(questionnaire_data.get('activity'), dict):
                raise Exception("'activity' field must be a JSON object with 1/0 values")
            if not isinstance(questionnaire_data.get('callouts'), dict):
                raise Exception("'callouts' field must be a JSON object with 1/0 values") 
            if not isinstance(questionnaire_data.get('best_season'), dict):
                raise Exception("'best_season' field must be a JSON object with 1/0 values")
            if not isinstance(questionnaire_data.get('theme_tags'), dict):
                raise Exception("'theme_tags' field must be a JSON object with 1/0 values")
            if not isinstance(questionnaire_data.get('pace'), str):
                raise Exception("'pace' field must be a string")
            if not isinstance(questionnaire_data.get('geo_region'), str):
                raise Exception("'geo_region' field must be a string")
            if not isinstance(questionnaire_data.get('recommendation_metric'), int):
                raise Exception("'recommendation_metric' field must be an integer")
            
            # CALL 3: Generate structured components (highlights, itinerary, locations)
            self.logger.info(f"Call 3/3: Generating structured components for {tour_name}")
            components_prompt = self.generate_structured_components_prompt(tour_data, basic_content)
            components_data = self.call_gemini_api(components_prompt)
            
            # Log components data for validation
            highlights_count = len(components_data.get('highlights', []))
            itinerary_count = len(components_data.get('itinerary', []))
            locations_count = len(components_data.get('locations', []))
            self.logger.info(f"✓ COMPONENTS: {highlights_count} highlights, {itinerary_count} itinerary sections, {locations_count} locations")
            
            # Show sample highlight and location for quick validation
            if components_data.get('highlights'):
                sample_highlight = components_data['highlights'][0]
                self.logger.info(f"  Sample highlight: '{sample_highlight.get('title', 'N/A')}' - {sample_highlight.get('description', 'N/A')[:60]}...")
            
            if components_data.get('locations'):
                sample_location = components_data['locations'][0]
                self.logger.info(f"  Sample location: '{sample_location.get('name', 'N/A')}' ({sample_location.get('latitude', 'N/A')}, {sample_location.get('longitude', 'N/A')})")
            
            # Validate components data
            required_components_keys = ['highlights', 'itinerary', 'locations']
            missing_components_keys = [key for key in required_components_keys if key not in components_data]
            if missing_components_keys:
                raise Exception(f"Missing required components keys: {missing_components_keys}")
            
            # Validate highlights count
            if len(components_data.get('highlights', [])) != 6:
                raise Exception(f"Expected exactly 6 highlights, got {len(components_data.get('highlights', []))}")
            
            # Merge all data for tour creation
            complete_content = {**basic_content, **questionnaire_data}
            
            # Create tour record
            tour_id = self.create_tour_record(tour_data, complete_content, countries)
            if not tour_id:
                raise Exception("Failed to create tour record")
            
            # Create related records
            success = True
            success &= self.create_tour_highlights(tour_id, components_data['highlights'])
            success &= self.create_tour_itinerary(tour_id, components_data['itinerary'])
            success &= self.create_tour_locations(tour_id, components_data['locations'])
            
            if success:
                # Mark as completed in progress file (for tracking purposes)
                if tour_name not in self.progress['completed']:
                    self.progress['completed'].append(tour_name)
                self.save_progress()
                self.logger.info(f"🎉 Successfully processed tour: {tour_name}")
                return True
            else:
                raise Exception("Failed to create some related records")
                
        except Exception as e:
            self.logger.error(f"❌ Error processing tour {tour_name}: {str(e)}")
            self.progress['failed'].append({
                'tour_name': tour_name,
                'row_number': row_number,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
            self.save_progress()
            return False

    def process_tours_batch(self, tours: List[Dict], start_idx: int = 0, override: bool = False) -> Tuple[int, int]:
        """Process a batch of tours."""
        batch_size = self.config['processing']['batch_size']
        max_concurrent = self.config['processing']['max_concurrent_tours']
        
        successful = 0
        failed = 0
        
        for i in range(start_idx, len(tours), batch_size):
            batch = tours[i:i + batch_size]
            self.logger.info(f"Processing batch {i//batch_size + 1}: tours {i+1}-{min(i+batch_size, len(tours))}")
            
            for tour in batch:
                if self.process_single_tour(tour, override):
                    successful += 1
                else:
                    failed += 1
                    
                # Check failure thresholds
                if failed >= self.config['monitoring']['failure_thresholds']['max_failed_tours_per_batch']:
                    self.logger.error(f"Too many failures in batch, stopping")
                    break
            
            # Update batch progress
            self.progress['current_batch'] = i // batch_size + 1
            self.save_progress()
            
            self.logger.info(f"Batch completed. Successful: {successful}, Failed: {failed}")
            
        return successful, failed

    def run_expansion(self, resume: bool = True, override: bool = False):
        """Run the complete tour expansion pipeline."""
        try:
            self.logger.info("Starting Tour Expansion Pipeline")
            self.logger.info(f"Target: Process {self.config['project']['current_tours']} tours from {self.config['paths']['input']['tours_csv']}")
            
            # Load tours from CSV
            tours = self.load_tours_from_csv(self.config['paths']['input']['tours_csv'])
            
            if not tours:
                self.logger.error("No tours loaded, exiting")
                return
            
            # Determine starting point for resumability
            start_idx = 0
            if resume and self.progress.get('completed') and not override:
                completed_count = len(self.progress['completed'])
                start_idx = completed_count
                self.logger.info(f"Resuming from tour {start_idx + 1} ({completed_count} already completed)")
            
            # Process tours
            successful, failed = self.process_tours_batch(tours, start_idx, override)
            
            # Final report
            total_completed = len(self.progress.get('completed', []))
            total_failed = len(self.progress.get('failed', []))
            
            self.logger.info("="*60)
            self.logger.info("TOUR EXPANSION PIPELINE COMPLETE")
            self.logger.info(f"Total Completed: {total_completed}")
            self.logger.info(f"Total Failed: {total_failed}")
            self.logger.info(f"Success Rate: {(total_completed/(total_completed+total_failed)*100):.1f}%")
            self.logger.info("="*60)
            
            if total_failed > 0:
                self.logger.info("Failed tours:")
                for failure in self.progress.get('failed', []):
                    self.logger.info(f"  - {failure['tour_name']}: {failure['error']}")
            
        except Exception as e:
            self.logger.error(f"Pipeline execution failed: {e}")
            raise

    def extract_all_countries_from_csv(self, filename: str) -> List[str]:
        """Extract all unique countries from the CSV file."""
        all_countries = set()
        
        tours = self.load_tours_from_csv(filename)
        for tour in tours:
            countries_str = tour.get('Country / Countries', '')
            countries = self.extract_countries_from_csv(countries_str)
            all_countries.update(countries)
        
        return sorted(list(all_countries))
    
    def check_missing_countries(self, csv_countries: List[str]) -> List[str]:
        """Check which countries from CSV are missing from the database."""
        missing_countries = []
        
        for country_name in csv_countries:
            try:
                clean_name = country_name.strip()
                response = self.supabase.table('countries').select('id').eq('name', clean_name).execute()
                
                if not response.data:
                    # Try case-insensitive match
                    response = self.supabase.table('countries').select('id').ilike('name', f'%{clean_name}%').execute()
                    if not response.data:
                        missing_countries.append(clean_name)
                        self.logger.warning(f"Missing country: {clean_name}")
                
            except Exception as e:
                self.logger.error(f"Error checking country {country_name}: {e}")
                missing_countries.append(country_name)
        
        return missing_countries

    def generate_missing_countries_data(self, missing_countries: List[str]) -> Dict:
        """Generate countries and regions data for missing countries using Gemini."""
        countries_str = ", ".join(missing_countries)
        
        prompt = f"""
You are a luxury travel database expert. I need to populate missing countries for a premium honeymoon travel website.

MISSING COUNTRIES: {countries_str}

EXISTING REGIONS in our database:
1. "Europe" - European countries
2. "Asia" - Asian countries  
3. "Africa" - African countries
4. "North America & Hawaii" - USA, Canada, Hawaii
5. "South America" - South American countries
6. "Caribbean & Central America" - Caribbean islands and Central America
7. "Oceania & Pacific" - Australia, New Zealand, Pacific islands

For each missing country, generate ALL the following fields using the examples as style guides:

EXAMPLES FROM EXISTING COUNTRIES:

FRANCE EXAMPLE:
- name: "France"
- region_name: "Europe"
- description: "Indulge in the epitome of romance in France, a timeless sanctuary for discerning honeymooners. From whispered secrets beneath the Eiffel Tower's sparkle to sun-drenched afternoons on the Côte d'Azur, France blends iconic glamour with intimate moments. Explore rolling vineyards in Bordeaux, discovering world-class vintages, or step into fairytale castles in the Loire Valley. Wander through fragrant lavender fields in Provence or savor Michelin-starred artistry in Lyon. France offers an unparalleled tapestry of culture, cuisine, and captivating landscapes, crafting unforgettable memories for couples embarking on their journey together. It's where luxury meets *joie de vivre*, creating the perfect overture to married life."
- rationale: "France captivates couples seeking a blend of iconic romance, cultural richness, and sophisticated indulgence. Ideal for those who appreciate fine dining, art, history, and picturesque landscapes – from Parisian elegance to Riviera chic and rustic Provençal charm. It suits travelers who enjoy both vibrant city exploration and tranquil countryside retreats. While offering unparalleled luxury and diverse experiences, be mindful that popular spots can be crowded during peak season. It's perfect for couples desiring a classic, stylish European honeymoon with deep cultural immersion and endless opportunities for romantic moments."
- best_period: "April to June and September to October"
- comfort: "5/5 - Short flight, exceptional infrastructure, luxury hotels, high-speed rail"
- distance: "1-2 hours"
- slug: "honeymoon-european-escapes-france"

JAPAN EXAMPLE:
- name: "Japan"
- region_name: "Asia"
- description: "Japan, an archipelago of captivating contrasts, offers an unforgettable canvas for a luxury honeymoon. Imagine waking in a serene ryokan overlooking misty mountains, followed by exhilarating explorations of futuristic cityscapes. Witness the ephemeral beauty of cherry blossoms painting Mount Fuji pink, or wander hand-in-hand through mystical bamboo groves in Kyoto. Indulge in Michelin-starred dining, private onsen experiences, and seamless travel aboard sleek bullet trains. From ancient temples steeped in tranquility to vibrant, neon-lit nights, Japan masterfully blends timeless tradition with cutting-edge modernity, crafting uniquely sophisticated memories for discerning couples seeking romance, culture, and unparalleled refinement within the Asian Wonders."
- rationale: "Japan captivates couples valuing profound cultural immersion alongside impeccable luxury and seamless efficiency. Ideal for sophisticated travellers seeking more than just a beach escape, it offers a dynamic blend of ancient traditions, hyper-modernity, serene nature, and exquisite cuisine. Honeymooners should appreciate intricate etiquette and be prepared for stimulating exploration, though tranquil retreats provide balance. It's perfect for curious minds eager to discover unique art, history, and gastronomy, wrapped in world-class comfort. Less suited for purely relaxation-focused trips due to the wealth of experiences encouraging exploration."
- best_period: "March to May and October to November"
- comfort: "5/5 - Long flight, exceptional infrastructure, luxury hotels, seamless transport"
- distance: "13-15 hours"
- slug: "honeymoon-asian-wonders-japan"

Generate a JSON object for each missing country following this EXACT structure:

{{
  "countries": [
    {{
      "name": "Country Name",
      "region_name": "Exact region name from above list",
      "description": "Evocative 150-200 word description from luxury travel advisor perspective, highlighting romantic experiences and what makes it special for honeymooners",
      "rationale": "120-150 word description of who will love this destination and who might not, mentioning travel style preferences and expectations",
      "best_period": "Best months/seasons to visit",
      "comfort": "X/5 - Brief comfort description including flight length, infrastructure quality, luxury level",
      "distance": "Flight time from London in hours (e.g., '2-3 hours', '8-10 hours')",
      "slug": "honeymoon-[region-slug]-[country-name] (lowercase, hyphenated: Europe='european-escapes', Asia='asian-wonders', Africa='african-adventures', etc.)"
    }}
  ]
}}

RULES:
- Use EXACT region names from the list above
- Follow the writing style and tone of the examples
- Distance should be flight time from London
- Comfort rating should be 1-5 with brief explanation
- Slug format: Use established patterns - Europe: 'honeymoon-european-escapes-', Asia: 'honeymoon-asian-wonders-', Africa: 'honeymoon-african-adventures-', Caribbean & Central America: 'honeymoon-caribbean-central-america-', North America & Hawaii: 'honeymoon-north-america-hawaii-', Oceania & Pacific: 'honeymoon-oceania-pacific-', South America: 'honeymoon-south-america-'

Return ONLY the JSON object.
"""
        
        try:
            result = self.call_gemini_api(prompt)
            return result
        except Exception as e:
            self.logger.error(f"Error generating missing countries data: {e}")
            return None
    
    def populate_missing_countries(self, missing_countries: List[str]) -> bool:
        """Populate missing countries in the database."""
        if not missing_countries:
            self.logger.info("No missing countries to populate")
            return True
        
        self.logger.info(f"Processing {len(missing_countries)} missing countries in batches")
        
        # Process in batches of 5 to avoid timeouts
        batch_size = 5
        total_success = 0
        
        for i in range(0, len(missing_countries), batch_size):
            batch = missing_countries[i:i + batch_size]
            self.logger.info(f"Processing batch {i//batch_size + 1}: {batch}")
            
            # Generate data using Gemini for this batch
            countries_data = self.generate_missing_countries_data(batch)
            if not countries_data or 'countries' not in countries_data:
                self.logger.error(f"Failed to generate data for batch: {batch}")
                continue
            
            # Get region mappings
            regions_response = self.supabase.table('regions').select('id, name').execute()
            region_map = {r['name']: r['id'] for r in regions_response.data}
            
            # Prepare country records for this batch
            country_records = []
            for country_data in countries_data['countries']:
                country_name = country_data['name']
                region_name = country_data['region_name']
                
                if region_name not in region_map:
                    self.logger.error(f"Invalid region '{region_name}' for country '{country_name}'")
                    continue
                
                country_records.append({
                    "name": country_name,
                    "region_id": region_map[region_name],
                    "description": country_data.get('description'),
                    "rationale": country_data.get('rationale'),
                    "best_period": country_data.get('best_period'),
                    "comfort": country_data.get('comfort'),
                    "distance": country_data.get('distance'),
                    "slug": country_data.get('slug'),
                    "is_featured": False,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                })
            
            # Insert countries for this batch
            try:
                if country_records:
                    response = self.supabase.table('countries').insert(country_records).execute()
                    batch_success = len(country_records)
                    total_success += batch_success
                    self.logger.info(f"✅ Successfully populated {batch_success} countries from batch")
                else:
                    self.logger.error(f"No valid country records to insert for batch: {batch}")
                    
            except Exception as e:
                self.logger.error(f"Error inserting countries for batch {batch}: {e}")
        
        if total_success > 0:
            self.logger.info(f"✅ Successfully populated {total_success} out of {len(missing_countries)} missing countries")
            return True
        else:
            self.logger.error("Failed to populate any missing countries")
            return False

def main():
    parser = argparse.ArgumentParser(description='Tour Expansion Pipeline - Expand to 250 tours')
    parser.add_argument('--config', default=CONFIG_FILE, help='Configuration file path')
    parser.add_argument('--no-resume', action='store_true', help='Start fresh, ignore existing progress')
    parser.add_argument('--single-tour', type=int, help='Process only a specific tour by row number')
    parser.add_argument('--override', action='store_true', help='Override existing tours if they already exist')
    parser.add_argument('--check-countries', action='store_true', help='Check and populate missing countries from CSV')
    
    args = parser.parse_args()
    
    try:
        pipeline = TourExpansionPipeline(args.config)
        
        if args.check_countries:
            # Check and populate missing countries
            print("🔍 Checking for missing countries...")
            csv_file = pipeline.config['paths']['input']['tours_csv']
            all_countries = pipeline.extract_all_countries_from_csv(csv_file)
            print(f"Found {len(all_countries)} unique countries in CSV: {all_countries}")
            
            missing_countries = pipeline.check_missing_countries(all_countries)
            if missing_countries:
                print(f"❌ Missing countries: {missing_countries}")
                confirm = input("Populate missing countries? (y/n): ")
                if confirm.lower() == 'y':
                    success = pipeline.populate_missing_countries(missing_countries)
                    if success:
                        print("✅ Successfully populated missing countries!")
                    else:
                        print("❌ Failed to populate missing countries")
                        return 1
                else:
                    print("Skipping country population")
            else:
                print("✅ All countries found in database!")
            
        elif args.single_tour:
            # Process single tour for testing
            tours = pipeline.load_tours_from_csv(pipeline.config['paths']['input']['tours_csv'])
            if args.single_tour <= len(tours):
                tour = tours[args.single_tour - 1]
                success = pipeline.process_single_tour(tour, args.override)
                print(f"Tour processing {'succeeded' if success else 'failed'}")
            else:
                print(f"Invalid tour number. Available: 1-{len(tours)}")
        else:
            # Run full pipeline
            pipeline.run_expansion(resume=not args.no_resume, override=args.override)
            
    except Exception as e:
        print(f"Pipeline failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 