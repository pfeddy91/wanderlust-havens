#!/usr/bin/env python3
"""
Script to check available Supabase storage buckets
"""

from supabase import create_client

# Supabase configuration
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_buckets():
    """Check available storage buckets"""
    try:
        print("🔍 Checking available storage buckets...")
        buckets = supabase.storage.list_buckets()
        
        print(f"📦 Found {len(buckets)} buckets:")
        for bucket in buckets:
            print(f"  • {bucket.name} (ID: {bucket.id}) - Public: {bucket.public}")
            
        # Also try to list files in country-image bucket if it exists
        print(f"\n📁 Checking files in 'country-image' bucket:")
        try:
            files = supabase.storage.from_('country-image').list()
            print(f"  Found {len(files)} files:")
            for file in files[:10]:  # Show first 10 files
                print(f"    - {file['name']}")
        except Exception as e:
            print(f"  ❌ Error listing files: {e}")
            
    except Exception as e:
        print(f"❌ Error checking buckets: {e}")

if __name__ == "__main__":
    check_buckets() 