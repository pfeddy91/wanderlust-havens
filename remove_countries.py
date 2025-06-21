import os
from supabase import create_client
import time

# Supabase credentials
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_country_uuid(country_name):
    """Get the UUID for a country by name."""
    try:
        # Try exact match first
        response = supabase.table('countries').select('id, name').eq('name', country_name.strip()).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]['id'], response.data[0]['name']
        
        # Try case-insensitive match
        response = supabase.table('countries').select('id, name').ilike('name', f'%{country_name.strip()}%').execute()
        if response.data and len(response.data) > 0:
            print(f"Found approximate match for '{country_name}': {response.data[0]['name']}")
            return response.data[0]['id'], response.data[0]['name']
        
        print(f"❌ Country '{country_name}' not found in database")
        return None, None
        
    except Exception as e:
        print(f"Error finding country '{country_name}': {e}")
        return None, None

def clean_tours_references(country_uuid, country_name):
    """Remove country UUID from tours.countries arrays."""
    try:
        print(f"🧹 Cleaning tour references for {country_name}...")
        
        # Get all tours that reference this country
        response = supabase.table('tours').select('id, title, countries').contains('countries', [country_uuid]).execute()
        
        if not response.data:
            print(f"   No tours found referencing {country_name}")
            return True
        
        print(f"   Found {len(response.data)} tours referencing {country_name}")
        
        # Update each tour to remove the country UUID
        for tour in response.data:
            try:
                current_countries = tour.get('countries', [])
                if country_uuid in current_countries:
                    # Remove the country UUID from the array
                    updated_countries = [c for c in current_countries if c != country_uuid]
                    
                    # Update the tour
                    update_response = supabase.table('tours').update({
                        'countries': updated_countries,
                        'updated_at': 'now()'
                    }).eq('id', tour['id']).execute()
                    
                    if hasattr(update_response, 'error') and update_response.error:
                        print(f"   ❌ Error updating tour '{tour['title']}': {update_response.error}")
                        return False
                    else:
                        print(f"   ✅ Updated tour '{tour['title']}'")
                        
            except Exception as e:
                print(f"   ❌ Error processing tour '{tour.get('title', tour['id'])}': {e}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error cleaning tour references: {e}")
        return False

def clean_tour_countries_junction(country_uuid, country_name):
    """Remove entries from tour_countries junction table (if it exists)."""
    try:
        print(f"🧹 Checking for tour_countries junction table for {country_name}...")
        
        # Check if the table exists first
        try:
            response = supabase.table('tour_countries').select('id').eq('country_id', country_uuid).limit(1).execute()
            
            if hasattr(response, 'error') and response.error:
                if 'does not exist' in str(response.error):
                    print(f"   ℹ️  tour_countries junction table does not exist (this is normal for your schema)")
                    return True
                else:
                    print(f"   ❌ Error checking junction table: {response.error}")
                    return False
            
            # If we get here, table exists - check for records
            all_records_response = supabase.table('tour_countries').select('id').eq('country_id', country_uuid).execute()
            
            if not all_records_response.data:
                print(f"   No junction table records found for {country_name}")
                return True
            
            print(f"   Found {len(all_records_response.data)} junction table records for {country_name}")
            
            # Delete all records
            delete_response = supabase.table('tour_countries').delete().eq('country_id', country_uuid).execute()
            
            if hasattr(delete_response, 'error') and delete_response.error:
                print(f"   ❌ Error deleting junction records: {delete_response.error}")
                return False
            else:
                print(f"   ✅ Deleted {len(all_records_response.data)} junction table records")
                return True
                
        except Exception as table_error:
            if 'does not exist' in str(table_error):
                print(f"   ℹ️  tour_countries junction table does not exist (this is normal for your schema)")
                return True
            else:
                raise table_error
            
    except Exception as e:
        print(f"❌ Error cleaning junction table: {e}")
        return False

def remove_country(country_uuid, country_name):
    """Remove the country from the countries table."""
    try:
        print(f"🗑️  Removing {country_name} from countries table...")
        
        response = supabase.table('countries').delete().eq('id', country_uuid).execute()
        
        if hasattr(response, 'error') and response.error:
            print(f"   ❌ Error deleting country: {response.error}")
            return False
        else:
            print(f"   ✅ Successfully removed {country_name}")
            return True
            
    except Exception as e:
        print(f"❌ Error removing country: {e}")
        return False

def remove_countries(country_names):
    """Main function to remove countries and clean up references."""
    print("🚀 Starting country removal process...")
    print(f"Countries to remove: {', '.join(country_names)}")
    print("=" * 60)
    
    # First, collect all country UUIDs
    countries_to_remove = []
    for country_name in country_names:
        country_uuid, actual_name = get_country_uuid(country_name)
        if country_uuid:
            countries_to_remove.append((country_uuid, actual_name))
        else:
            print(f"⚠️  Skipping '{country_name}' - not found in database")
    
    if not countries_to_remove:
        print("❌ No valid countries found to remove")
        return
    
    print(f"\n✅ Found {len(countries_to_remove)} countries to remove")
    print("Countries found:")
    for uuid, name in countries_to_remove:
        print(f"  - {name} ({uuid})")
    
    # Ask for confirmation
    print("\n" + "=" * 60)
    confirm = input("⚠️  Are you sure you want to remove these countries? This cannot be undone! (type 'YES' to confirm): ")
    
    if confirm != 'YES':
        print("❌ Operation cancelled")
        return
    
    # Process each country
    print("\n🔄 Processing countries...")
    success_count = 0
    
    for country_uuid, country_name in countries_to_remove:
        print(f"\n📍 Processing: {country_name}")
        print("-" * 40)
        
        # Step 1: Clean tour references
        if not clean_tours_references(country_uuid, country_name):
            print(f"❌ Failed to clean tour references for {country_name}. Skipping...")
            continue
        
        # Step 2: Clean junction table
        if not clean_tour_countries_junction(country_uuid, country_name):
            print(f"❌ Failed to clean junction table for {country_name}. Skipping...")
            continue
        
        # Step 3: Remove country
        if not remove_country(country_uuid, country_name):
            print(f"❌ Failed to remove {country_name}")
            continue
        
        success_count += 1
        print(f"✅ Successfully removed {country_name}")
        
        # Small delay to avoid overwhelming the database
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print(f"🎉 Process completed!")
    print(f"Successfully removed: {success_count}/{len(countries_to_remove)} countries")

if __name__ == "__main__":
    print("Country Removal Script")
    print("=" * 60)
    print("Paste your country names below (one per line).")
    print("Press Enter twice when done, or Ctrl+C to cancel.")
    print("=" * 60)
    
    country_names = []
    try:
        while True:
            line = input().strip()
            if not line:  # Empty line means we're done
                break
            country_names.append(line)
    except KeyboardInterrupt:
        print("\n❌ Cancelled by user")
        exit()
    
    if not country_names:
        print("❌ No countries provided")
        exit()
    
    remove_countries(country_names) 