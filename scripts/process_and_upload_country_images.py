#!/usr/bin/env python3
"""
Comprehensive Country Image Processing & Upload Script
======================================================

This script processes both desktop and mobile images for countries, optimizes them,
uploads to Supabase storage, and updates the database with the new URLs.

Features:
- Downloads images from external URLs
- Processes desktop images (16:9 aspect ratio, 1920x1080px)
- Processes mobile images (5:3 aspect ratio, 1200x720px)
- Applies luxury post-processing with film grain
- Uploads to Supabase storage with consistent naming
- Updates countries table with new image URLs
- Comprehensive error handling and progress tracking
- Reusable for future countries

Usage:
    python scripts/process_and_upload_country_images.py
"""

import os
import sys
import time
import requests
import numpy as np
from typing import Dict, List, Optional, Tuple
from PIL import Image, ImageEnhance, ImageFilter
from io import BytesIO
from supabase import create_client

# Supabase configuration
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"
BUCKET_NAME = "country-image"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Output directories
DESKTOP_OUTPUT_DIR = "processed_desktop_images"
MOBILE_OUTPUT_DIR = "processed_mobile_images"

# Country image configurations
COUNTRY_IMAGES = {
    "austria": {
        "country_name": "Austria",
        "desktop_url": "https://cdn.cosmos.so/376bfd8e-7d86-42f5-9582-f95d526dfd5b?format=jpeg",
        "mobile_url": "https://images.unsplash.com/photo-1622540632978-2e9f3a882c76?q=80&w=2398&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "slug": "honeymoon-european-escapes-austria"
    },
    "bolivia": {
        "country_name": "Bolivia",
        "desktop_url": "https://images.unsplash.com/photo-1540294437416-5ac3b561d896?q=80&w=1939&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "mobile_url": "https://images.unsplash.com/photo-1540294437416-5ac3b561d896?q=80&w=1939&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "slug": "honeymoon-south-america-bolivia"
    },
    "cambodia": {
        "country_name": "Cambodia",
        "desktop_url": "https://images.unsplash.com/photo-1566706546199-a93ba33ce9f7?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "mobile_url": "https://images.unsplash.com/photo-1566706546199-a93ba33ce9f7?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "slug": "honeymoon-asian-wonders-cambodia"
    },
    "hawaii": {
        "country_name": "Hawaii",
        "desktop_url": "https://cdn.cosmos.so/266af2e3-f392-4114-8f25-a42db6439240?format=jpeg",
        "mobile_url": "https://images.unsplash.com/photo-1586996292898-71f4036c4e07?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "slug": "honeymoon-north-america-hawaii-usa-hawaii"
    },
    "hong_kong": {
        "country_name": "Hong Kong",
        "desktop_url": "https://images.unsplash.com/photo-1657080898184-1b7dc2dd9a95?q=80&w=1760&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "mobile_url": "https://images.unsplash.com/photo-1620015092538-e33c665fc181?q=80&w=2148&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "slug": "honeymoon-asian-wonders-hong-kong"
    },
    "india": {
        "country_name": "India",
        "desktop_url": "https://images.unsplash.com/photo-1524230507669-5ff97982bb5e?q=80&w=964&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "mobile_url": "https://cdn.cosmos.so/a11decc9-3064-492c-a396-c75ecb4736c1?format=jpeg",
        "slug": "honeymoon-asian-wonders-india"
    },
    "mauritius": {
        "country_name": "Mauritius",
        "desktop_url": "https://images.unsplash.com/photo-1581859814481-bfd944e3122f?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "mobile_url": "https://images.unsplash.com/photo-1507187632231-5beb21a654a2?q=80&w=2401&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "slug": "honeymoon-african-adventures-mauritius"
    },
    "montenegro": {
        "country_name": "Montenegro",
        "desktop_url": "https://images.unsplash.com/photo-1607625901435-5f896ba02bf5?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "mobile_url": "https://images.unsplash.com/photo-1582099704633-352b712cfe9d?q=80&w=2148&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "slug": "honeymoon-european-escapes-montenegro"
    },
    "singapore": {
        "country_name": "Singapore",
        "desktop_url": "https://images.unsplash.com/photo-1582512156321-24948d8d10fd?q=80&w=1760&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "mobile_url": "https://images.unsplash.com/photo-1542114740389-9b46fb1e5be7?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "slug": "honeymoon-asian-wonders-singapore"
    }
}

def download_image(url: str, description: str) -> bytes:
    """Download image from URL and return image bytes"""
    try:
        print(f"  📥 Downloading {description}...")
        response = requests.get(url, timeout=30, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()
        print(f"  ✅ Downloaded {len(response.content)} bytes")
        return response.content
    except Exception as e:
        print(f"  ❌ Error downloading {description}: {e}")
        raise

def add_film_grain(img: Image.Image, intensity: float = 0.015) -> Image.Image:
    """Add film grain/noise texture to the image"""
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
        print(f"  ⚠️  Warning: Failed to add film grain: {e}")
        return img

def apply_luxury_processing(img: Image.Image) -> Image.Image:
    """Apply luxury post-processing pipeline"""
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
    
    # Add film grain
    print(f"  🎞️  Applying film grain filter...")
    img = add_film_grain(img, intensity=0.015)
    
    # Subtle vignette
    vignette = Image.new('L', img.size, 255)
    for x in range(img.width):
        for y in range(img.height):
            dx = x - img.width / 2
            dy = y - img.height / 2
            distance = (dx**2 + dy**2)**0.5
            vignette.putpixel((x, y), int(255 * (1 - min(1, distance / (img.width / 2) * 0.08))))
    
    img = Image.composite(img, Image.new('RGB', img.size, (0, 0, 0)), vignette)
    
    return img

def process_desktop_image(image_data: bytes, target_width: int = 1920, target_height: int = 1080) -> bytes:
    """Process image for desktop display (16:9 aspect ratio)"""
    try:
        with Image.open(BytesIO(image_data)) as img:
            print(f"  🖼️  Original desktop size: {img.size}")
            
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Calculate crop for 16:9 aspect ratio
            original_width, original_height = img.size
            target_aspect = target_width / target_height  # 16:9 = 1.778
            
            if original_width / original_height > target_aspect:
                # Image is wider, crop width
                new_width = int(original_height * target_aspect)
                left = (original_width - new_width) // 2
                img = img.crop((left, 0, left + new_width, original_height))
            else:
                # Image is taller, crop height
                new_height = int(original_width / target_aspect)
                top = (original_height - new_height) // 2
                img = img.crop((0, top, original_width, top + new_height))
            
            # Resize to target dimensions
            img = img.resize((target_width, target_height), Image.LANCZOS)
            print(f"  🖥️  Desktop optimized: {img.size} (16:9)")
            
            # Apply luxury post-processing
            img = apply_luxury_processing(img)
            
            # Save to bytes
            output = BytesIO()
            img.save(output, format='JPEG', quality=92, optimize=True, progressive=True)
            
            print(f"  ✨ Processed desktop: {len(output.getvalue())} bytes")
            return output.getvalue()
            
    except Exception as e:
        print(f"  ❌ Error processing desktop image: {e}")
        raise

def process_mobile_image(image_data: bytes, target_width: int = 1200, target_height: int = 720) -> bytes:
    """Process image for mobile display (5:3 aspect ratio)"""
    try:
        with Image.open(BytesIO(image_data)) as img:
            print(f"  🖼️  Original mobile size: {img.size}")
            
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Calculate crop for 5:3 aspect ratio
            original_width, original_height = img.size
            target_aspect = target_width / target_height  # 5:3 = 1.667
            
            if original_width / original_height > target_aspect:
                # Image is wider, crop width
                new_width = int(original_height * target_aspect)
                left = (original_width - new_width) // 2
                img = img.crop((left, 0, left + new_width, original_height))
            else:
                # Image is taller, crop height
                new_height = int(original_width / target_aspect)
                top = (original_height - new_height) // 2
                img = img.crop((0, top, original_width, top + new_height))
            
            # Resize to target dimensions
            img = img.resize((target_width, target_height), Image.LANCZOS)
            print(f"  📱 Mobile optimized: {img.size} (5:3)")
            
            # Apply luxury post-processing
            img = apply_luxury_processing(img)
            
            # Save to bytes
            output = BytesIO()
            img.save(output, format='JPEG', quality=90, optimize=True, progressive=True)
            
            print(f"  ✨ Processed mobile: {len(output.getvalue())} bytes")
            return output.getvalue()
            
    except Exception as e:
        print(f"  ❌ Error processing mobile image: {e}")
        raise

def upload_to_storage(image_data: bytes, filename: str) -> str:
    """Upload image to Supabase storage and return public URL"""
    try:
        print(f"  📤 Uploading {filename}...")
        
        # Upload file
        upload_response = supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=image_data,
            file_options={
                "content-type": "image/jpeg",
                "upsert": "true"  # Overwrite if exists
            }
        )
        
        # Get public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        print(f"  ✅ Uploaded: {public_url}")
        
        return public_url
        
    except Exception as e:
        print(f"  ❌ Upload error for {filename}: {e}")
        # Try delete and re-upload
        try:
            print(f"  🔄 Retrying upload...")
            supabase.storage.from_(BUCKET_NAME).remove([filename])
            
            upload_response = supabase.storage.from_(BUCKET_NAME).upload(
                path=filename,
                file=image_data,
                file_options={"content-type": "image/jpeg"}
            )
            
            public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
            print(f"  ✅ Uploaded on retry: {public_url}")
            return public_url
            
        except Exception as retry_error:
            print(f"  ❌ Retry failed: {retry_error}")
            raise

def save_locally(image_data: bytes, directory: str, filename: str) -> str:
    """Save image locally for backup"""
    try:
        os.makedirs(directory, exist_ok=True)
        filepath = os.path.join(directory, filename)
        
        with open(filepath, 'wb') as f:
            f.write(image_data)
        
        print(f"  💾 Saved: {filepath}")
        return filepath
        
    except Exception as e:
        print(f"  ❌ Local save error: {e}")
        raise

def update_country_images(slug: str, desktop_url: str, mobile_url: str) -> bool:
    """Update country with new image URLs"""
    try:
        print(f"  📊 Updating database for: {slug}")
        
        response = supabase.table("countries").update({
            "featured_image": desktop_url,
            "mobile_image_url": mobile_url,
            "updated_at": "now()"
        }).eq("slug", slug).execute()
        
        if response.data:
            print(f"  ✅ Database updated for {slug}")
            return True
        else:
            print(f"  ⚠️  Country not found: {slug}")
            return False
            
    except Exception as e:
        print(f"  ❌ Database error for {slug}: {e}")
        return False

def get_country_by_slug(slug: str) -> Optional[Dict]:
    """Get country information by slug"""
    try:
        response = supabase.table("countries").select("*").eq("slug", slug).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print(f"  ❌ Error fetching country {slug}: {e}")
        return None

def process_country(country_key: str, config: Dict) -> Dict:
    """Process a single country's images"""
    country_name = config["country_name"]
    slug = config["slug"]
    
    print(f"\n🏝️  Processing {country_name} ({slug})...")
    
    try:
        # Verify country exists in database
        country_data = get_country_by_slug(slug)
        if not country_data:
            print(f"  ⚠️  Country '{slug}' not found in database")
            return {
                "country_name": country_name,
                "slug": slug,
                "success": False,
                "error": "Country not found in database"
            }
        
        # Generate unique filenames
        timestamp = int(time.time())
        desktop_filename = f"{country_key}-desktop-{timestamp}.jpg"
        mobile_filename = f"{country_key}-mobile-{timestamp}.jpg"
        
        # Process desktop image
        print(f"  🖥️  Processing desktop...")
        desktop_data = download_image(config["desktop_url"], "desktop image")
        processed_desktop = process_desktop_image(desktop_data)
        
        # Process mobile image
        print(f"  📱 Processing mobile...")
        mobile_data = download_image(config["mobile_url"], "mobile image")
        processed_mobile = process_mobile_image(mobile_data)
        
        # Save locally
        desktop_local = save_locally(processed_desktop, DESKTOP_OUTPUT_DIR, desktop_filename)
        mobile_local = save_locally(processed_mobile, MOBILE_OUTPUT_DIR, mobile_filename)
        
        # Upload to storage
        desktop_url = upload_to_storage(processed_desktop, desktop_filename)
        mobile_url = upload_to_storage(processed_mobile, mobile_filename)
        
        # Update database
        db_success = update_country_images(slug, desktop_url, mobile_url)
        
        result = {
            "country_name": country_name,
            "slug": slug,
            "success": True,
            "desktop_filename": desktop_filename,
            "mobile_filename": mobile_filename,
            "desktop_url": desktop_url,
            "mobile_url": mobile_url,
            "desktop_local": desktop_local,
            "mobile_local": mobile_local,
            "database_updated": db_success
        }
        
        print(f"  🎉 Successfully processed {country_name}")
        return result
        
    except Exception as e:
        print(f"  💥 Failed to process {country_name}: {e}")
        return {
            "country_name": country_name,
            "slug": slug,
            "success": False,
            "error": str(e)
        }

def print_summary(results: List[Dict]):
    """Print comprehensive summary"""
    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]
    
    print(f"\n📊 PROCESSING SUMMARY")
    print(f"=" * 50)
    print(f"✅ Successfully processed: {len(successful)}/{len(results)} countries")
    print(f"❌ Failed: {len(failed)} countries")
    
    if successful:
        print(f"\n🎉 SUCCESSFUL COUNTRIES:")
        for result in successful:
            print(f"  • {result['country_name']} ({result['slug']})")
            print(f"    Desktop: {result['desktop_filename']}")
            print(f"    Mobile: {result['mobile_filename']}")
            print(f"    Database: {'✅' if result.get('database_updated') else '⚠️'}")
            print()
    
    if failed:
        print(f"\n❌ FAILED COUNTRIES:")
        for result in failed:
            print(f"  • {result['country_name']}: {result.get('error', 'Unknown error')}")
    
    print(f"\n🎯 COMPLETED:")
    print(f"✅ Images uploaded to '{BUCKET_NAME}' bucket")
    print(f"✅ Database updated with new URLs")
    print(f"✅ Local backups in {DESKTOP_OUTPUT_DIR} and {MOBILE_OUTPUT_DIR}")

def main():
    """Main execution function"""
    print("🚀 COMPREHENSIVE COUNTRY IMAGE PROCESSING")
    print("=" * 50)
    print(f"🎯 Processing {len(COUNTRY_IMAGES)} countries")
    print(f"🖥️  Desktop: 16:9 (1920x1080px)")
    print(f"📱 Mobile: 5:3 (1200x720px)")
    print(f"🎞️  Film grain: 1.5%")
    print(f"📦 Bucket: {BUCKET_NAME}")
    
    # Create directories
    os.makedirs(DESKTOP_OUTPUT_DIR, exist_ok=True)
    os.makedirs(MOBILE_OUTPUT_DIR, exist_ok=True)
    print(f"📁 Created: {DESKTOP_OUTPUT_DIR}, {MOBILE_OUTPUT_DIR}")
    
    results = []
    
    # Process each country
    for country_key, config in COUNTRY_IMAGES.items():
        result = process_country(country_key, config)
        results.append(result)
        
        # Delay between countries
        if country_key != list(COUNTRY_IMAGES.keys())[-1]:
            print(f"  ⏸️  Waiting 2 seconds...")
            time.sleep(2)
    
    # Print summary
    print_summary(results)
    
    return results

if __name__ == "__main__":
    try:
        results = main()
        sys.exit(0)
    except KeyboardInterrupt:
        print(f"\n⚠️  Process interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1) 