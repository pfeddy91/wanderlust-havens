#!/usr/bin/env python3
"""
Slug Update Script for Wanderlust Havens
Updates region and country slugs from complex format to simple format
"""

import os
import re
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from supabase import create_client, Client

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase configuration. Check your .env file.")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Region mapping for slug updates
REGION_SLUG_MAPPING = {
    'honeymoon-african-adventures': 'honeymoon-africa',
    'honeymoon-asian-wonders': 'honeymoon-asia',
    'honeymoon-european-escapes': 'honeymoon-europe',
    'honeymoon-north-america-hawaii': 'honeymoon-north-america',
    'honeymoon-south-america': 'honeymoon-south-america',
    'honeymoon-caribbean-central-america': 'honeymoon-caribbean-central-america',
    'honeymoon-oceania-pacific': 'honeymoon-oceania-pacific'
}

def setup_logging():
    """Setup logging to file and console"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = f"slug_update_log_{timestamp}.txt"
    
    def log(message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        print(log_message)
        with open(log_filename, 'a', encoding='utf-8') as f:
            f.write(log_message + '\n')
    
    return log

def get_current_regions() -> List[Dict]:
    """Fetch all current regions from database"""
    try:
        response = supabase.table('regions').select('id, name, slug').execute()
        return response.data if response.data else []
    except Exception as e:
        raise Exception(f"Failed to fetch regions: {e}")

def get_current_countries() -> List[Dict]:
    """Fetch all current countries from database"""
    try:
        response = supabase.table('countries').select('id, name, slug, region_id').execute()
        return response.data if response.data else []
    except Exception as e:
        raise Exception(f"Failed to fetch countries: {e}")

def update_region_slugs(log_func) -> List[Tuple[str, str, str]]:
    """Update region slugs and return list of changes"""
    log_func("=== UPDATING REGION SLUGS ===")
    
    regions = get_current_regions()
    changes = []
    
    for region in regions:
        old_slug = region['slug']
        new_slug = REGION_SLUG_MAPPING.get(old_slug)
        
        if new_slug and new_slug != old_slug:
            try:
                # Update the slug in database
                response = supabase.table('regions').update({
                    'slug': new_slug,
                    'updated_at': datetime.now().isoformat()
                }).eq('id', region['id']).execute()
                
                if response.data:
                    changes.append((region['id'], old_slug, new_slug))
                    log_func(f"✅ Region '{region['name']}': {old_slug} → {new_slug}")
                else:
                    log_func(f"❌ Failed to update region '{region['name']}': {old_slug}")
                    
            except Exception as e:
                log_func(f"❌ Error updating region '{region['name']}': {e}")
        else:
            log_func(f"⏭️  Region '{region['name']}': {old_slug} (no change needed)")
    
    log_func(f"Region updates completed: {len(changes)} changes made")
    return changes

def create_country_slug_from_old(old_slug: str) -> str:
    """Extract country name from old complex slug format"""
    # Remove honeymoon- prefix
    slug_without_prefix = old_slug.replace('honeymoon-', '', 1)
    
    # Split by hyphens and take the last part(s) as country
    parts = slug_without_prefix.split('-')
    
    # Handle known region prefixes
    region_prefixes = [
        'african-adventures',
        'asian-wonders', 
        'european-escapes',
        'north-america-hawaii',
        'south-america',
        'caribbean-central-america',
        'oceania-pacific'
    ]
    
    for prefix in region_prefixes:
        if slug_without_prefix.startswith(prefix + '-'):
            country_part = slug_without_prefix[len(prefix + '-'):]
            return f"honeymoon-{country_part}"
    
    # If no known prefix found, return the original slug
    return old_slug

def update_country_slugs(log_func) -> List[Tuple[str, str, str]]:
    """Update country slugs and return list of changes"""
    log_func("\n=== UPDATING COUNTRY SLUGS ===")
    
    countries = get_current_countries()
    changes = []
    
    for country in countries:
        old_slug = country['slug']
        new_slug = create_country_slug_from_old(old_slug)
        
        if new_slug != old_slug:
            try:
                # Update the slug in database
                response = supabase.table('countries').update({
                    'slug': new_slug,
                    'updated_at': datetime.now().isoformat()
                }).eq('id', country['id']).execute()
                
                if response.data:
                    changes.append((country['id'], old_slug, new_slug))
                    log_func(f"✅ Country '{country['name']}': {old_slug} → {new_slug}")
                else:
                    log_func(f"❌ Failed to update country '{country['name']}': {old_slug}")
                    
            except Exception as e:
                log_func(f"❌ Error updating country '{country['name']}': {e}")
        else:
            log_func(f"⏭️  Country '{country['name']}': {old_slug} (no change needed)")
    
    log_func(f"Country updates completed: {len(changes)} changes made")
    return changes

def update_frontend_references(region_changes: List[Tuple], country_changes: List[Tuple], log_func):
    """Update frontend code references to old slugs"""
    log_func("\n=== UPDATING FRONTEND REFERENCES ===")
    
    # Files to check for slug references
    frontend_files = [
        'src/components/RegionCountries.tsx',
        'src/services/honeymoonService.ts',
        'public/sitemap.xml'
    ]
    
    # Create mapping of old to new slugs
    slug_mapping = {}
    
    # Add region slug changes
    for _, old_slug, new_slug in region_changes:
        slug_mapping[old_slug] = new_slug
    
    # Add country slug changes  
    for _, old_slug, new_slug in country_changes:
        slug_mapping[old_slug] = new_slug
    
    if not slug_mapping:
        log_func("No slug changes to apply to frontend")
        return
    
    for file_path in frontend_files:
        if not os.path.exists(file_path):
            log_func(f"⚠️  File not found: {file_path}")
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            changes_made = 0
            
            # Replace each old slug with new slug
            for old_slug, new_slug in slug_mapping.items():
                if old_slug in content:
                    content = content.replace(old_slug, new_slug)
                    changes_made += 1
                    log_func(f"  📝 {file_path}: {old_slug} → {new_slug}")
            
            # Write back if changes were made
            if changes_made > 0:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                log_func(f"✅ Updated {file_path} ({changes_made} replacements)")
            else:
                log_func(f"⏭️  {file_path}: no changes needed")
                
        except Exception as e:
            log_func(f"❌ Error updating {file_path}: {e}")

def generate_updated_sitemap(log_func):
    """Generate updated sitemap with new slugs"""
    log_func("\n=== GENERATING UPDATED SITEMAP ===")
    
    try:
        # Fetch updated regions and countries
        regions = get_current_regions()
        countries = get_current_countries()
        
        sitemap_content = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- Homepage -->
  <url>
    <loc>https://www.gomoons.com/</loc>
    <lastmod>2025-01-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Main Pages -->
  <url>
    <loc>https://www.gomoons.com/destinations</loc>
    <lastmod>2025-01-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>https://www.gomoons.com/collections</loc>
    <lastmod>2025-01-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>https://www.gomoons.com/planner</loc>
    <lastmod>2025-01-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>https://www.gomoons.com/contact</loc>
    <lastmod>2025-01-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Region Pages -->
'''
        
        # Add region pages
        for region in regions:
            sitemap_content += f'''  <url>
    <loc>https://www.gomoons.com/destinations/{region['slug']}</loc>
    <lastmod>2025-01-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
'''
        
        sitemap_content += '''  <!-- Country Pages -->
'''
        
        # Add country pages
        for country in countries:
            sitemap_content += f'''  <url>
    <loc>https://www.gomoons.com/destinations/{country['slug']}</loc>
    <lastmod>2025-01-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
'''
        
        sitemap_content += '''  <!-- Collection Pages -->
  <url>
    <loc>https://www.gomoons.com/collections/adventure-honeymoons</loc>
    <lastmod>2025-01-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>https://www.gomoons.com/collections/cultural-immersion</loc>
    <lastmod>2025-01-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
</urlset>'''
        
        # Write updated sitemap
        with open('public/sitemap.xml', 'w', encoding='utf-8') as f:
            f.write(sitemap_content)
        
        log_func(f"✅ Generated updated sitemap with {len(regions)} regions and {len(countries)} countries")
        
    except Exception as e:
        log_func(f"❌ Error generating sitemap: {e}")

def main():
    """Main execution function"""
    log_func = setup_logging()
    
    log_func("🚀 Starting Slug Update Process")
    log_func("=" * 50)
    
    try:
        # Update region slugs
        region_changes = update_region_slugs(log_func)
        
        # Update country slugs
        country_changes = update_country_slugs(log_func)
        
        # Update frontend references
        update_frontend_references(region_changes, country_changes, log_func)
        
        # Generate updated sitemap
        generate_updated_sitemap(log_func)
        
        # Summary
        log_func("\n" + "=" * 50)
        log_func("🎉 SLUG UPDATE COMPLETED SUCCESSFULLY")
        log_func(f"📊 Summary:")
        log_func(f"   - Region slugs updated: {len(region_changes)}")
        log_func(f"   - Country slugs updated: {len(country_changes)}")
        log_func(f"   - Total changes: {len(region_changes) + len(country_changes)}")
        log_func("=" * 50)
        
    except Exception as e:
        log_func(f"💥 FATAL ERROR: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 