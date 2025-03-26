import os
from supabase import create_client, Client

# Hardcoded credentials
url = "https://jeiuruhneitvfyjkmbvj.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaXVydWhuZWl0dmZ5amttYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjU5NzQsImV4cCI6MjA1ODI0MTk3NH0.iYBsdI4p7o7rKbrMHstzis4KZYV_ks2p09pmtj5-bTo"

supabase: Client = create_client(url, key)

def populate_destination_images():
    print("Starting population of destination_images table...")
    
    # 1. Get all countries
    countries_response = supabase.table('countries').select('id, name').execute()
    countries = countries_response.data
    
    # Track statistics
    total_countries = len(countries)
    processed_countries = 0
    total_images_added = 0
    
    for country in countries:
        country_id = country['id']
        country_name = country['name']
        print(f"Processing country: {country_name} ({country_id})")
        
        # 2. Get all tours associated with this country
        tour_countries_response = supabase.table('tour_countries').select('tour_id').eq('country_id', country_id).execute()
        tour_ids = [tc['tour_id'] for tc in tour_countries_response.data]
        
        if not tour_ids:
            print(f"No tours found for country: {country_name}")
            processed_countries += 1
            continue
        
        # 3. Get all images for these tours
        all_images = []
        for tour_id in tour_ids:
            tour_images_response = supabase.table('tour_images').select('*').eq('tour_id', tour_id).execute()
            all_images.extend(tour_images_response.data)
        
        # 4. Sort images by importance
        sorted_images = sorted(all_images, 
                              key=lambda img: (-int(img.get('is_featured', False)), 
                                              -int(img.get('is_primary', False)), 
                                              img.get('display_order', 999)))
        
        # 5. Prepare data for insertion, checking for duplicates
        destination_images = []
        seen_urls = set()  # Set to track seen image URLs
        
        for i, img in enumerate(sorted_images):
            if img['image_url'] not in seen_urls:  # Check for duplicates
                destination_images.append({
                    'country_id': country_id,
                    'image_url': img['image_url'],
                    'alt_text': img.get('alt_text') or f"Beautiful scene in {country_name}",
                    'is_featured': img.get('is_featured', False),
                    'display_order': i,  # Use our own ordering
                    'source_tour_id': img['tour_id'],
                    'source_image_id': img['id'],
                    'overall_score': img.get('overall_score', 0)  # Add overall_score here
                })
                seen_urls.add(img['image_url'])  # Mark this URL as seen
        
        # 6. Insert into destination_images table
        if destination_images:
            # First delete any existing images for this country
            supabase.table('destination_images').delete().eq('country_id', country_id).execute()
            
            # Then insert the new images
            insert_response = supabase.table('destination_images').insert(destination_images).execute()
            images_added = len(insert_response.data)
            total_images_added += images_added
            print(f"Added {images_added} images for {country_name}")
        else:
            print(f"No unique images found for country: {country_name}")
        
        processed_countries += 1
        print(f"Progress: {processed_countries}/{total_countries} countries processed")
    
    print(f"Completed! Added {total_images_added} images across {total_countries} countries")

if __name__ == "__main__":
    populate_destination_images()