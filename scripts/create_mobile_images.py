#!/usr/bin/env python3
"""
Script to create optimized mobile horizontal images for destinations.
This processes images locally and shows the filenames for manual upload.
"""

import os
import requests
import time
from PIL import Image, ImageEnhance
from io import BytesIO

# Target directory for processed images
OUTPUT_DIR = "processed_mobile_images"

# Image configurations
IMAGE_CONFIGS = {
    "maldives": {
        "url": "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=85",
        "country_name": "Maldives",
        "filename_prefix": "maldives"
    },
    "thailand": {
        "url": "https://images.unsplash.com/photo-1742179890267-dbfe5abb1ab7?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "country_name": "Thailand", 
        "filename_prefix": "thailand"
    }
}

def create_output_directory():
    """Create output directory if it doesn't exist"""
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"📁 Created directory: {OUTPUT_DIR}")

def download_image(url: str) -> bytes:
    """Download image from URL and return image bytes"""
    try:
        print(f"📥 Downloading image from: {url[:80]}...")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"❌ Error downloading image: {e}")
        raise

def process_image_for_mobile(image_data: bytes, target_width: int = 1200, target_height: int = 600) -> bytes:
    """
    Process image for mobile horizontal display:
    - Resize to horizontal aspect ratio (2:1) 
    - Enhance colors and sharpness for premium look
    - Optimize for web display
    """
    try:
        # Open image
        img = Image.open(BytesIO(image_data))
        print(f"   Original size: {img.size}")
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Calculate crop dimensions to get 2:1 aspect ratio
        original_width, original_height = img.size
        target_aspect = target_width / target_height  # 2:1
        
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
        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        print(f"   Processed size: {img.size}")
        
        # Enhance the image for premium mobile display
        # Slight saturation boost for vibrant look
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.1)
        
        # Slight sharpness boost for crisp details
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.05)
        
        # Slight contrast boost for depth
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.02)
        
        # Save as high-quality JPEG
        output = BytesIO()
        img.save(output, format='JPEG', quality=90, optimize=True)
        
        return output.getvalue()
        
    except Exception as e:
        print(f"❌ Error processing image: {e}")
        raise

def save_image_locally(image_data: bytes, filename: str) -> str:
    """Save processed image locally"""
    try:
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'wb') as f:
            f.write(image_data)
        print(f"💾 Saved locally: {filepath}")
        return filepath
    except Exception as e:
        print(f"❌ Error saving image: {e}")
        raise

def process_destination_image(destination_key: str):
    """Process a single destination image"""
    config = IMAGE_CONFIGS[destination_key]
    country_name = config["country_name"]
    
    print(f"\n🏝️  Processing {country_name} mobile image...")
    
    try:
        # Download image
        image_data = download_image(config["url"])
        
        # Process for mobile horizontal display
        processed_data = process_image_for_mobile(image_data)
        
        # Generate filename with timestamp
        timestamp = int(time.time())
        filename = f"{config['filename_prefix']}-featured-horizontal-{timestamp}.jpg"
        
        # Save locally
        filepath = save_image_locally(processed_data, filename)
        
        print(f"✅ Successfully processed {country_name} mobile image")
        print(f"📁 Local file: {filename}")
        
        return {
            "country_name": country_name,
            "filename": filename,
            "filepath": filepath,
            "storage_path": filename  # For Supabase upload
        }
        
    except Exception as e:
        print(f"❌ Failed to process {country_name}: {e}")
        return None

def main():
    """Main function to process all destination images"""
    print("🚀 Creating mobile horizontal images for destinations...")
    
    # Create output directory
    create_output_directory()
    
    results = []
    
    for destination_key in IMAGE_CONFIGS.keys():
        result = process_destination_image(destination_key)
        if result:
            results.append(result)
        
        # Small delay between downloads
        time.sleep(1)
    
    print(f"\n📊 Processing Summary:")
    print(f"✅ Successfully processed: {len(results)} images")
    
    if results:
        print(f"\n📋 Created Mobile Images:")
        for result in results:
            print(f"  • {result['country_name']}: {result['filename']}")
            print(f"    Local path: {result['filepath']}")
        
        print(f"\n🎯 Next Steps:")
        print(f"1. Upload the images to Supabase storage bucket 'country-image':")
        for result in results:
            print(f"   - Upload {result['filename']} from {result['filepath']}")
        
        print(f"\n2. Update RegionsGrid.tsx to use these horizontal images:")
        print(f"   - The getMobileHorizontalImageSrc function should handle these naming patterns")
        print(f"   - Test on mobile to ensure proper display")
        
        print(f"\n3. Expected URLs after upload:")
        base_url = "https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/country-image"
        for result in results:
            print(f"   - {base_url}/{result['filename']}")

if __name__ == "__main__":
    main() 