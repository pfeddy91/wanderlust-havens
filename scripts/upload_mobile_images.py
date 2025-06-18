#!/usr/bin/env python3
"""
Script to upload processed mobile images to Supabase storage
"""

import os
from supabase import create_client

# Supabase configuration - Updated to match the project
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"
BUCKET_NAME = "country-image"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Images to upload (filename -> local path)
IMAGES_TO_UPLOAD = {
    "greece-mobile-1750179575.jpg": "processed_mobile_images/greece-mobile-1750179575.jpg",
    "french_polynesia-mobile-1750179578.jpg": "processed_mobile_images/french_polynesia-mobile-1750179578.jpg",
    "japan-mobile-1750179581.jpg": "processed_mobile_images/japan-mobile-1750179581.jpg",
    "thailand-mobile-1750179583.jpg": "processed_mobile_images/thailand-mobile-1750179583.jpg",
    "maldives-mobile-1750179587.jpg": "processed_mobile_images/maldives-mobile-1750179587.jpg"
}

def upload_image_to_storage(local_path: str, storage_filename: str) -> bool:
    """Upload a single image to Supabase storage"""
    try:
        print(f"📤 Uploading {storage_filename}...")
        
        # Read the image file
        with open(local_path, 'rb') as f:
            image_data = f.read()
        
        print(f"   📁 Read {len(image_data)} bytes from {local_path}")
        
        # Upload to Supabase storage
        upload_response = supabase.storage.from_(BUCKET_NAME).upload(
            path=storage_filename,
            file=image_data,
            file_options={"content-type": "image/jpeg", "upsert": "true"}
        )
        
        # Get the public URL to verify
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_filename)
        print(f"   ✅ Successfully uploaded to: {public_url}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Error uploading {storage_filename}: {e}")
        return False

def main():
    """Upload all processed mobile images"""
    print("🚀 Starting upload of processed mobile images to Supabase storage...")
    print(f"📦 Target bucket: {BUCKET_NAME}")
    
    success_count = 0
    total_count = len(IMAGES_TO_UPLOAD)
    
    for storage_filename, local_path in IMAGES_TO_UPLOAD.items():
        # Check if local file exists
        if not os.path.exists(local_path):
            print(f"❌ Local file not found: {local_path}")
            continue
        
        # Upload the image
        if upload_image_to_storage(local_path, storage_filename):
            success_count += 1
        
        print()  # Add spacing between uploads
    
    print(f"📊 Upload Summary:")
    print(f"✅ Successfully uploaded: {success_count}/{total_count} images")
    
    if success_count == total_count:
        print(f"\n🎉 All images uploaded successfully!")
        print(f"🔗 Expected URLs:")
        base_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}"
        for filename in IMAGES_TO_UPLOAD.keys():
            print(f"   • {base_url}/{filename}")
    else:
        print(f"\n⚠️  Some uploads failed. Please check the errors above.")

if __name__ == "__main__":
    main() 