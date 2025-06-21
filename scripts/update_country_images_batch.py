#!/usr/bin/env python3
"""
Update Country Images Batch Script
=================================

This script updates specific country images with new URLs, processes them with luxury
enhancements, uploads to Supabase storage, and updates the database.

Key Features:
- Downloads new images from external URLs
- Processes desktop images (16:9 aspect ratio, 1920x1080px)
- Processes mobile images (5:3 aspect ratio, 1200x720px)
- Applies luxury post-processing including film grain
- Deletes old images from storage before uploading new ones
- Updates countries table with new image URLs
- Comprehensive error handling and progress tracking

Usage:
    python scripts/update_country_images_batch.py
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
from urllib.parse import urlparse

# Supabase configuration
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"
BUCKET_NAME = "country-image"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Output directories for backups
DESKTOP_OUTPUT_DIR = "updated_desktop_images"
MOBILE_OUTPUT_DIR = "updated_mobile_images"

# Image update configurations
IMAGE_UPDATES = [
    {
        "country_search": "greece",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "austria",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1463725876303-ff840e2aa8d5?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "botswana",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1516799175873-1d0a42e4a668?q=80&w=2334&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "botswana",
        "type": "desktop",
        "url": "https://images.unsplash.com/photo-1516799175873-1d0a42e4a668?q=80&w=2334&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "madagascar",
        "type": "desktop",
        "url": "https://images.unsplash.com/photo-1570742544137-3a469196c32b?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "mongolia",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1547371131-4f509bd884c1?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "mongolia",
        "type": "desktop",
        "url": "https://images.unsplash.com/photo-1547371131-4f509bd884c1?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "costa rica",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1597693253938-0ba06637f6e5?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "costa rica",
        "type": "desktop",
        "url": "https://images.unsplash.com/photo-1558642369-043a801e48fd?q=80&w=1801&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "guatemala",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1669578718614-0dec2071ce83?q=80&w=2710&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "austria",
        "type": "desktop",
        "url": "https://images.unsplash.com/photo-1597086831879-756db15e81d3?q=80&w=2148&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "croatia",
        "type": "desktop",
        "url": "https://images.unsplash.com/photo-1553773077-91673524aafa?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "croatia",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1626699748984-47d6942751ca?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "sweden",
        "type": "desktop",
        "url": "https://images.unsplash.com/photo-1536881018007-75f5b57f41cd?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "sweden",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1508500709478-37a0e8d6603c?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "hawaii",
        "type": "desktop",
        "url": "https://images.unsplash.com/photo-1626049789315-2d5f1b656454?q=80&w=1314&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "united states",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "fiji",
        "type": "desktop",
        "url": "https://images.unsplash.com/photo-1656042246835-e2fb93fb4a76?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "fiji",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1656042246835-e2fb93fb4a76?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "ecuador",
        "type": "mobile",
        "url": "https://images.unsplash.com/photo-1509747129352-c4244f0b9bf9?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
        "country_search": "ecuador",
        "type": "desktop",
        "url": "https://images.unsplash.com/photo-1509747129352-c4244f0b9bf9?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    }
]

def ensure_directories():
    """Create output directories if they don't exist"""
    os.makedirs(DESKTOP_OUTPUT_DIR, exist_ok=True)
    os.makedirs(MOBILE_OUTPUT_DIR, exist_ok=True)

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
            
            # Apply luxury processing
            print(f"  ✨ Applying luxury processing...")
            img = apply_luxury_processing(img)
            
            print(f"  ✅ Processed desktop image: {img.size}")
            
            # Convert back to bytes
            output = BytesIO()
            img.save(output, format='JPEG', quality=95, optimize=True)
            return output.getvalue()
            
    except Exception as e:
        print(f"  ❌ Error processing desktop image: {e}")
        raise

def process_mobile_image(image_data: bytes, target_width: int = 1200, target_height: int = 720) -> bytes:
    """Process image for mobile display (5:3 aspect ratio)"""
    try:
        with Image.open(BytesIO(image_data)) as img:
            print(f"  📱 Original mobile size: {img.size}")
            
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
            
            # Apply luxury processing
            print(f"  ✨ Applying luxury processing...")
            img = apply_luxury_processing(img)
            
            print(f"  ✅ Processed mobile image: {img.size}")
            
            # Convert back to bytes
            output = BytesIO()
            img.save(output, format='JPEG', quality=95, optimize=True)
            return output.getvalue()
            
    except Exception as e:
        print(f"  ❌ Error processing mobile image: {e}")
        raise

def extract_filename_from_url(url: str) -> str:
    """Extract a filename from storage URL"""
    try:
        # Parse the URL and get the path
        parsed_url = urlparse(url)
        path = parsed_url.path
        
        # Extract filename from path
        if '/object/public/' in path:
            # Standard Supabase storage URL format
            filename = path.split('/object/public/')[-1].split('/')[-1]
        else:
            # Fallback: just get the last part of the path
            filename = path.split('/')[-1]
        
        return filename
    except Exception:
        return ""

def delete_old_image(old_url: str) -> bool:
    """Delete old image from Supabase storage"""
    if not old_url or not old_url.startswith('https://'):
        return True  # No old image to delete
    
    try:
        # Extract filename from the URL
        filename = extract_filename_from_url(old_url)
        
        if not filename:
            print(f"  ⚠️  Could not extract filename from URL: {old_url}")
            return False
        
        print(f"  🗑️  Deleting old image: {filename}")
        
        # Delete from storage
        response = supabase.storage.from_(BUCKET_NAME).remove([filename])
        
        if hasattr(response, 'error') and response.error:
            print(f"  ⚠️  Warning: Could not delete old image {filename}: {response.error}")
            return False
        else:
            print(f"  ✅ Deleted old image: {filename}")
            return True
            
    except Exception as e:
        print(f"  ⚠️  Warning: Error deleting old image: {e}")
        return False

def upload_to_storage(image_data: bytes, filename: str) -> str:
    """Upload processed image to Supabase storage"""
    try:
        print(f"  ☁️  Uploading to storage: {filename}")
        
        response = supabase.storage.from_(BUCKET_NAME).upload(
            filename, 
            image_data,
            file_options={"content-type": "image/jpeg"}
        )
        
        if hasattr(response, 'error') and response.error:
            # Check if error is due to file already existing
            if 'already exists' in str(response.error):
                print(f"  🔄 File exists, updating: {filename}")
                # Update existing file
                update_response = supabase.storage.from_(BUCKET_NAME).update(
                    filename, 
                    image_data,
                    file_options={"content-type": "image/jpeg"}
                )
                if hasattr(update_response, 'error') and update_response.error:
                    raise Exception(f"Update failed: {update_response.error}")
            else:
                raise Exception(f"Upload failed: {response.error}")
        
        # Get public URL
        public_url_response = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        public_url = public_url_response
        
        print(f"  ✅ Uploaded successfully: {public_url}")
        return public_url
        
    except Exception as e:
        print(f"  ❌ Upload error for {filename}: {e}")
        raise

def save_locally(image_data: bytes, directory: str, filename: str) -> str:
    """Save processed image locally as backup"""
    try:
        filepath = os.path.join(directory, filename)
        with open(filepath, 'wb') as f:
            f.write(image_data)
        print(f"  💾 Saved locally: {filepath}")
        return filepath
    except Exception as e:
        print(f"  ⚠️  Warning: Could not save locally: {e}")
        return ""

def find_country_by_search(search_term: str) -> Optional[Dict]:
    """Find country by search term (case-insensitive)"""
    try:
        response = supabase.table("countries").select("*").ilike("name", f"%{search_term}%").execute()
        if response.data:
            # If multiple matches, prefer exact match
            for country in response.data:
                if country['name'].lower() == search_term.lower():
                    return country
            # Otherwise return first match
            return response.data[0]
        return None
    except Exception as e:
        print(f"  ❌ Error finding country '{search_term}': {e}")
        return None

def update_country_image(country: Dict, image_type: str, new_url: str) -> bool:
    """Update country with new image URL"""
    try:
        print(f"  📊 Updating database for: {country['name']}")
        
        update_data = {"updated_at": "now()"}
        
        if image_type == "desktop":
            update_data["featured_image"] = new_url
        else:  # mobile
            update_data["mobile_image_url"] = new_url
        
        response = supabase.table("countries").update(update_data).eq("id", country['id']).execute()
        
        if response.data:
            print(f"  ✅ Database updated for {country['name']}")
            return True
        else:
            print(f"  ❌ Failed to update database for {country['name']}")
            return False
            
    except Exception as e:
        print(f"  ❌ Database error for {country['name']}: {e}")
        return False

def process_image_update(update_config: Dict) -> Dict:
    """Process a single image update"""
    result = {
        'country_search': update_config['country_search'],
        'type': update_config['type'],
        'success': False,
        'error': None,
        'country_name': None,
        'old_url': None,
        'new_url': None
    }
    
    try:
        print(f"\n{'='*80}")
        print(f"🌍 Processing {update_config['type'].upper()} image for '{update_config['country_search']}'")
        print(f"{'='*80}")
        
        # Find country in database
        country = find_country_by_search(update_config['country_search'])
        if not country:
            result['error'] = f"Country '{update_config['country_search']}' not found in database"
            print(f"  ❌ {result['error']}")
            return result
        
        result['country_name'] = country['name']
        print(f"  ✅ Found country: {country['name']} (ID: {country['id']})")
        
        # Get current image URL for deletion
        if update_config['type'] == 'desktop':
            old_url = country.get('featured_image')
        else:
            old_url = country.get('mobile_image_url')
        
        result['old_url'] = old_url
        
        # Download new image
        image_data = download_image(update_config['url'], f"{update_config['type']} image")
        
        # Process image
        if update_config['type'] == 'desktop':
            processed_data = process_desktop_image(image_data)
            filename = f"{country['slug']}-desktop.jpg"
            save_dir = DESKTOP_OUTPUT_DIR
        else:
            processed_data = process_mobile_image(image_data)
            filename = f"{country['slug']}-mobile.jpg"
            save_dir = MOBILE_OUTPUT_DIR
        
        # Delete old image from storage if it exists
        if old_url:
            delete_old_image(old_url)
        
        # Upload new image
        new_url = upload_to_storage(processed_data, filename)
        result['new_url'] = new_url
        
        # Save local backup
        save_locally(processed_data, save_dir, filename)
        
        # Update database
        if update_country_image(country, update_config['type'], new_url):
            result['success'] = True
            print(f"  🎉 Successfully updated {update_config['type']} image for {country['name']}")
        else:
            result['error'] = "Failed to update database"
        
        return result
        
    except Exception as e:
        result['error'] = str(e)
        print(f"  ❌ Error processing {update_config['country_search']} {update_config['type']}: {e}")
        return result

def print_summary(results: List[Dict]):
    """Print a comprehensive summary of all updates"""
    print(f"\n\n{'='*100}")
    print(f"📊 BATCH IMAGE UPDATE SUMMARY")
    print(f"{'='*100}")
    
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    print(f"✅ Successful Updates: {len(successful)}/{len(results)}")
    print(f"❌ Failed Updates: {len(failed)}/{len(results)}")
    print(f"📈 Success Rate: {len(successful)/len(results)*100:.1f}%")
    
    if successful:
        print(f"\n🎉 SUCCESSFUL UPDATES:")
        for result in successful:
            print(f"  ✅ {result['country_name']} ({result['type']})")
            print(f"     Old: {result['old_url'] or 'None'}")
            print(f"     New: {result['new_url']}")
    
    if failed:
        print(f"\n❌ FAILED UPDATES:")
        for result in failed:
            country_name = result['country_name'] or result['country_search']
            print(f"  ❌ {country_name} ({result['type']}): {result['error']}")
    
    print(f"\n💾 Local backups saved in:")
    print(f"  📱 Mobile: {MOBILE_OUTPUT_DIR}/")
    print(f"  🖥️  Desktop: {DESKTOP_OUTPUT_DIR}/")
    
    print(f"\n{'='*100}")

def main():
    """Main function to process all image updates"""
    print("🚀 Starting Batch Country Image Update Process")
    print(f"📝 Total updates to process: {len(IMAGE_UPDATES)}")
    print("="*80)
    
    # Ensure output directories exist
    ensure_directories()
    
    # Process each update
    results = []
    for i, update_config in enumerate(IMAGE_UPDATES, 1):
        print(f"\n📍 Progress: {i}/{len(IMAGE_UPDATES)}")
        result = process_image_update(update_config)
        results.append(result)
        
        # Add delay between processing to be respectful
        if i < len(IMAGE_UPDATES):
            time.sleep(2)
    
    # Print comprehensive summary
    print_summary(results)
    
    return results

if __name__ == "__main__":
    try:
        results = main()
        sys.exit(0 if all(r['success'] for r in results) else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Process interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)