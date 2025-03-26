import os
from supabase import create_client
import time

# Supabase credentials
SUPABASE_URL = "https://jeiuruhneitvfyjkmbvj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaXVydWhuZWl0dmZ5amttYnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjU5NzQsImV4cCI6MjA1ODI0MTk3NH0.iYBsdI4p7o7rKbrMHstzis4KZYV_ks2p09pmtj5-bTo"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def update_tours_table():
    print("Starting update of tours table...")
    
    # 1. Get all tours
    response = supabase.table('tours').select('id, name').execute()
    tours = response.data
    
    if not tours:
        print("No tours found!")
        return
    
    print(f"Found {len(tours)} tours to update")
    
    # Process each tour
    for i, tour in enumerate(tours):
        tour_id = tour['id']
        print(f"Processing tour {i+1}/{len(tours)}: {tour['name']} (ID: {tour_id})")
        
        # 2. Get countries for this tour
        countries_response = supabase.table('tour_countries') \
            .select('countries(id, name)') \
            .eq('tour_id', tour_id) \
            .execute()
        
        tour_countries = countries_response.data
        
        # Initialize country names
        country_name1 = None
        country_name2 = None
        
        # Extract country names
        if tour_countries:
            for i, tc in enumerate(tour_countries):
                if i == 0 and 'countries' in tc and tc['countries']:
                    country_name1 = tc['countries']['name']
                elif i == 1 and 'countries' in tc and tc['countries']:
                    country_name2 = tc['countries']['name']
        
        # 3. Get featured image for this tour
        images_response = supabase.table('tour_images') \
            .select('image_url') \
            .eq('tour_id', tour_id) \
            .eq('is_primary', True) \
            .limit(1) \
            .execute()
        
        featured_image = None
        if images_response.data and len(images_response.data) > 0:
            featured_image = images_response.data[0]['image_url']
        
        # 4. Update the tour with country names and featured image
        update_data = {}
        if country_name1:
            update_data['country_name1'] = country_name1
        if country_name2:
            update_data['country_name2'] = country_name2
        if featured_image:
            update_data['featured_image'] = featured_image
        
        if update_data:
            update_response = supabase.table('tours') \
                .update(update_data) \
                .eq('id', tour_id) \
                .execute()
            
            print(f"  Updated tour with: {', '.join(update_data.keys())}")
        else:
            print("  No data to update for this tour")
        
        # Small delay to avoid rate limiting
        time.sleep(0.1)
    
    print("Tours table update completed!")

if __name__ == "__main__":
    update_tours_table()