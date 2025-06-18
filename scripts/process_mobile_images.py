#!/usr/bin/env python3
"""
Script to process and upload mobile horizontal images for specific destinations.
This handles downloading, processing, and uploading images to Supabase storage.
"""

import os
import sys
import requests
import time
from PIL import Image, ImageEnhance, ImageFilter
from io import BytesIO
from supabase import create_client

# Supabase configuration
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"
BUCKET_NAME = "country-image"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Test image URLs - Note: First Maldives URL needs to be replaced with direct image URL
IMAGE_CONFIGS = {
    "maldives": {
        "url": "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=85",  # Premium overwater villa
        "country_name": "Maldives",
        "filename_prefix": "maldives"
    },
    "thailand": {
        "url": "https://images.unsplash.com/photo-1742179890267-dbfe5abb1ab7?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "country_name": "Thailand",
        "filename_prefix": "thailand"
    }
}

def download_image(url: str) -> bytes:
    """Download image from URL and return image bytes"""
    try:
        print(f"Downloading image from: {url}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"Error downloading image: {e}")
        raise

def process_image_for_mobile(image_data: bytes, target_width: int = 1200, target_height: int = 600) -> bytes:
    """
    Process image for mobile horizontal display:
    - Resize to horizontal aspect ratio (2:1)
    - Enhance colors and sharpness
    - Optimize for web
    """
    try:
        # Open image
        img = Image.open(BytesIO(image_data))
        print(f"Original image size: {img.size}")
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Calculate crop dimensions to get 2:1 aspect ratio
        original_width, original_height = img.size
        target_aspect = target_width / target_height  # 2:1
        
        if original_width / original_height > target_aspect:
            # Image is wider than target, crop width
            new_width = int(original_height * target_aspect)
            left = (original_width - new_width) // 2
            img = img.crop((left, 0, left + new_width, original_height))
        else:
            # Image is taller than target, crop height
            new_height = int(original_width / target_aspect)
            top = (original_height - new_height) // 2
            img = img.crop((0, top, original_width, top + new_height))
        
        # Resize to target dimensions
        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        print(f"Processed image size: {img.size}")
        
        # Enhance the image for mobile display
        # Slight saturation boost for premium look
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.1)
        
        # Slight sharpness boost
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.05)
        
        # Save as high-quality JPEG
        output = BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        
        return output.getvalue()
        
    except Exception as e:
        print(f"Error processing image: {e}")
        raise

def upload_to_supabase(image_data: bytes, filename: str) -> str:
    """Upload processed image to Supabase storage"""
    try:
        print(f"Uploading to Supabase storage: {filename}")
        
        # Upload to Supabase storage
        upload_response = supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=image_data,
            file_options={"content-type": "image/jpeg", "upsert": "true"}
        )
        
        # Get the public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        print(f"✅ Uploaded successfully: {public_url}")
        
        return public_url
        
    except Exception as e:
        print(f"❌ Error uploading to storage: {e}")
        raise

def get_country_by_name(country_name: str):
    """Get country information from database"""
    try:
        response = supabase.table("countries").select("id, name, slug, featured_image").ilike("name", f"%{country_name}%").execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error fetching country data: {e}")
        return None

def process_destination_image(destination_key: str):
    """Process a single destination image"""
    config = IMAGE_CONFIGS[destination_key]
    country_name = config["country_name"]
    
    print(f"\n🏝️  Processing {country_name} mobile image...")
    
    # Get country info from database
    country = get_country_by_name(country_name)
    if not country:
        print(f"❌ Country '{country_name}' not found in database")
        return False
    
    print(f"Found country: {country['name']} (ID: {country['id']})")
    
    try:
        # Download image
        image_data = download_image(config["url"])
        
        # Process for mobile horizontal display
        processed_data = process_image_for_mobile(image_data)
        
        # Generate filename
        timestamp = int(time.time())
        filename = f"{config['filename_prefix']}-featured-horizontal-{timestamp}.jpg"
        
        # Upload to Supabase
        public_url = upload_to_supabase(processed_data, filename)
        
        print(f"✅ Successfully processed {country_name} mobile image")
        print(f"📁 Filename: {filename}")
        print(f"🔗 URL: {public_url}")
        
        return {
            "country": country,
            "filename": filename,
            "url": public_url
        }
        
    except Exception as e:
        print(f"❌ Failed to process {country_name}: {e}")
        return False

def main():
    """Main function to process all destination images"""
    print("🚀 Starting mobile image processing for destinations...")
    print(f"📦 Target storage bucket: {BUCKET_NAME}")
    
    results = []
    
    for destination_key in IMAGE_CONFIGS.keys():
        result = process_destination_image(destination_key)
        if result:
            results.append(result)
        
        # Small delay between uploads
        time.sleep(1)
    
    print(f"\n📊 Processing Summary:")
    print(f"✅ Successfully processed: {len(results)} images")
    
    if results:
        print("\n📋 Processed Images:")
        for result in results:
            print(f"  • {result['country']['name']}: {result['filename']}")
            print(f"    URL: {result['url']}")
    
    print("\n🎯 Next Steps:")
    print("1. Test the horizontal images in the mobile version of RegionsGrid")
    print("2. Update the getMobileHorizontalImageSrc function if needed")
    print("3. Verify the images display correctly on mobile devices")

if __name__ == "__main__":
    main() 