#!/usr/bin/env python3
"""
Script to process mobile images for specific countries with film filter.
Downloads images, applies luxury post-processing + film grain, uploads to storage,
and updates countries.mobile_image_URL via Supabase MCP.
"""

import os
import sys
import requests
import time
import uuid
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from io import BytesIO
from supabase import create_client

# Supabase configuration - Updated to match the project
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"
BUCKET_NAME = "country-image"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Country image configurations
IMAGE_CONFIGS = {
    "greece": {
        "url": "https://images.unsplash.com/photo-1661687906213-850728e959e3?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "country_name": "Greece",
        "filename_prefix": "greece"
    },
    "french_polynesia": {
        "url": "https://images.unsplash.com/photo-1701156417506-b789655c7f3e?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "country_name": "French Polynesia",
        "filename_prefix": "french_polynesia"
    },
    "japan": {
        "url": "https://images.unsplash.com/photo-1588000316012-ae41e1c9db1a?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "country_name": "Japan",
        "filename_prefix": "japan"
    },
    "thailand": {
        "url": "https://images.unsplash.com/photo-1441814849630-e47ec6cced58?q=80&w=2334&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "country_name": "Thailand",
        "filename_prefix": "thailand"
    },
    "maldives": {
        "url": "https://assets.cntraveller.in/photos/60ba16d2002baf698cc67122/16:9/w_1024%2Cc_limit/maldives1-1366x768.jpg",
        "country_name": "Maldives",
        "filename_prefix": "maldives"
    }
}

def download_image(url: str) -> bytes:
    """Download image from URL and return image bytes"""
    try:
        print(f"  📥 Downloading image from: {url}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        print(f"  ✅ Downloaded {len(response.content)} bytes")
        return response.content
    except Exception as e:
        print(f"  ❌ Error downloading image: {e}")
        raise

def add_film_grain(img: Image.Image, intensity: float = 0.015) -> Image.Image:
    """
    Add film grain/noise texture to the image
    
    Args:
        img: PIL Image object
        intensity: Grain intensity (0.015 = 1.5%)
    
    Returns:
        PIL Image with film grain applied
    """
    try:
        # Convert to numpy array
        img_array = np.array(img)
        
        # Generate random noise with same shape as image
        noise = np.random.randint(-int(255 * intensity), int(255 * intensity) + 1, img_array.shape, dtype=np.int16)
        
        # Add noise to image
        noisy_array = img_array.astype(np.int16) + noise
        
        # Clip values to valid range
        noisy_array = np.clip(noisy_array, 0, 255)
        
        # Convert back to PIL Image
        return Image.fromarray(noisy_array.astype(np.uint8))
        
    except Exception as e:
        print(f"  ⚠️  Warning: Failed to add film grain, continuing without: {e}")
        return img

def post_process_mobile_image(image_data: bytes, target_width: int = 1200, target_height: int = 720) -> bytes:
    """
    Apply post-processing optimized for luxury travel photography with film grain
    Enhances colors particularly for sea, sky and nature while maintaining bright, premium aesthetic
    """
    try:
        with Image.open(BytesIO(image_data)) as img:
            print(f"  🖼️  Original image size: {img.size}")
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Calculate crop dimensions to get 5:3 aspect ratio (target_width:target_height)
            original_width, original_height = img.size
            target_aspect = target_width / target_height  # 5:3 = 1.667
            
            if original_width / original_height > target_aspect:
                # Image is wider than target, crop width (center crop)
                new_width = int(original_height * target_aspect)
                left = (original_width - new_width) // 2
                img = img.crop((left, 0, left + new_width, original_height))
            else:
                # Image is taller than target, crop height (center crop)
                new_height = int(original_width / target_aspect)
                top = (original_height - new_height) // 2
                img = img.crop((0, top, original_width, top + new_height))
            
            # Resize to target dimensions using high-quality resampling
            img = img.resize((target_width, target_height), Image.LANCZOS)
            print(f"  📱 Mobile optimized size: {img.size} (5:3 aspect ratio)")
            
            # Standard luxury post-processing pipeline
            # Enhance brightness slightly to make images less dark
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(0.97)
            
            # Enhance contrast for depth
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.1)
            
            # Enhance saturation for vibrant nature and sea colors
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(1.2)
            
            # Enhance colors with focus on blues for sea and sky
            r, g, b = img.split()
            r = r.point(lambda i: i * 1.02)
            g = g.point(lambda i: i * 1.02)
            b = b.point(lambda i: i * 1.05)  # Blue enhancement for sea/sky
            img = Image.merge('RGB', (r, g, b))
            
            # Sharpen with refined parameters for luxury detail
            img = img.filter(ImageFilter.UnsharpMask(radius=0.8, percent=70, threshold=2))
            
            # Add film grain (1.5% intensity)
            print(f"  🎞️  Applying film grain filter...")
            img = add_film_grain(img, intensity=0.015)
            
            # Very subtle vignette for a clean, premium look
            vignette = Image.new('L', img.size, 255)
            for x in range(img.width):
                for y in range(img.height):
                    dx = x - img.width / 2
                    dy = y - img.height / 2
                    distance = (dx**2 + dy**2)**0.5
                    vignette.putpixel((x, y), int(255 * (1 - min(1, distance / (img.width / 2) * 0.08))))
            
            img = Image.composite(img, Image.new('RGB', img.size, (0, 0, 0)), vignette)
            
            # Save to bytes with high quality for luxury brand
            output = BytesIO()
            img.save(output, format='JPEG', quality=90, optimize=True, progressive=True)
            
            print(f"  ✨ Post-processed image: {len(output.getvalue())} bytes")
            return output.getvalue()
            
    except Exception as e:
        print(f"  ❌ Error processing image: {e}")
        raise

def upload_to_supabase(image_data: bytes, filename: str) -> str:
    """Upload processed image to Supabase storage"""
    try:
        print(f"  📤 Uploading to Supabase storage: {filename}")
        
        # Upload to Supabase storage
        upload_response = supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=image_data,
            file_options={"content-type": "image/jpeg", "upsert": "true"}
        )
        
        # Get the public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        print(f"  ✅ Uploaded successfully: {public_url}")
        
        return public_url
        
    except Exception as e:
        print(f"  ❌ Error uploading to storage: {e}")
        raise

def get_country_by_name(country_name: str) -> dict:
    """Get country record from database by name"""
    try:
        response = supabase.table('countries').select('*').ilike('name', country_name).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print(f"  ❌ Error fetching country: {e}")
        return None

def update_country_mobile_image(country_id: str, image_url: str) -> bool:
    """Update country's mobile_image_URL field"""
    try:
        response = supabase.table('countries').update({
            'mobile_image_URL': image_url,
            'updated_at': 'now()'
        }).eq('id', country_id).execute()
        
        if response.data:
            print(f"  ✅ Updated mobile_image_URL in database")
            return True
        return False
    except Exception as e:
        print(f"  ❌ Error updating database: {e}")
        return False

def process_country_image(country_key: str):
    """Process a single country image"""
    config = IMAGE_CONFIGS[country_key]
    country_name = config["country_name"]
    
    print(f"\n🏝️  Processing {country_name} mobile image...")
    
    # Get country info from database
    country = get_country_by_name(country_name)
    if not country:
        print(f"  ❌ Country '{country_name}' not found in database")
        return False
    
    print(f"  📍 Found country: {country['name']} (ID: {country['id']})")
    
    try:
        # Download image
        image_data = download_image(config["url"])
        
        # Process for mobile with film grain
        processed_data = post_process_mobile_image(image_data)
        
        # Generate filename with mobile designation
        timestamp = int(time.time())
        filename = f"{config['filename_prefix']}-mobile-{timestamp}.jpg"
        
        # Upload to Supabase
        public_url = upload_to_supabase(processed_data, filename)
        
        # Update database
        success = update_country_mobile_image(country['id'], public_url)
        
        if success:
            print(f"  🎉 Successfully processed {country_name}")
            print(f"  📁 Filename: {filename}")
            print(f"  🔗 URL: {public_url}")
            return {
                "country": country,
                "filename": filename,
                "url": public_url
            }
        else:
            print(f"  ❌ Failed to update database for {country_name}")
            return False
        
    except Exception as e:
        print(f"  💥 Failed to process {country_name}: {e}")
        return False

def main():
    """Main function to process all country images"""
    print("🚀 Starting mobile image processing for countries with film filter...")
    print(f"📦 Target storage bucket: {BUCKET_NAME}")
    print(f"🎞️  Film grain intensity: 1.5%")
    print(f"📱 Target aspect ratio: 5:3 (1200x720px)")
    
    results = []
    failed = []
    
    for country_key in IMAGE_CONFIGS.keys():
        result = process_country_image(country_key)
        if result:
            results.append(result)
        else:
            failed.append(IMAGE_CONFIGS[country_key]["country_name"])
        
        # Small delay between uploads
        time.sleep(2)
    
    print(f"\n📊 Processing Summary:")
    print(f"✅ Successfully processed: {len(results)} countries")
    print(f"❌ Failed: {len(failed)} countries")
    
    if results:
        print(f"\n📋 Successfully Processed Countries:")
        for result in results:
            print(f"  • {result['country']['name']}: {result['filename']}")
            print(f"    Mobile URL: {result['url']}")
    
    if failed:
        print(f"\n⚠️  Failed Countries:")
        for country_name in failed:
            print(f"  • {country_name}")
    
    print(f"\n🎯 Summary:")
    print(f"- Images processed with luxury post-processing + 1.5% film grain")
    print(f"- Optimized for mobile at 5:3 aspect ratio (1200x720px)")
    print(f"- Uploaded to '{BUCKET_NAME}' bucket with 'mobile' designation")
    print(f"- Database field 'countries.mobile_image_URL' updated")

if __name__ == "__main__":
    main() 