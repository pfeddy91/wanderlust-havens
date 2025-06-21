#!/usr/bin/env python3
"""
Simple Country Removal Script
Uses direct SQL queries for more reliable database operations.
"""

import os
from supabase import create_client

# Supabase credentials
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def execute_sql(query, description=""):
    """Execute SQL query and return result."""
    try:
        print(f"   {description}...")
        result = supabase.rpc('sql', {'query': query}).execute()
        
        if hasattr(result, 'error') and result.error:
            print(f"   ❌ SQL Error: {result.error}")
            return None
        
        return result.data
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return None

def remove_countries_simple(country_names):
    """Remove countries using direct SQL queries."""
    print("🚀 Simple Country Removal Process")
    print("=" * 60)
    
    # Step 1: Get country UUIDs
    country_list = "', '".join(country_names)
    get_countries_sql = f"""
    SELECT name, id 
    FROM countries 
    WHERE name IN ('{country_list}')
    ORDER BY name;
    """
    
    print("🔍 Finding countries in database...")
    countries_result = execute_sql(get_countries_sql, "Getting country UUIDs")
    
    if not countries_result:
        print("❌ Failed to get countries")
        return
    
    print(f"✅ Found {len(countries_result)} countries:")
    for country in countries_result:
        print(f"  - {country['name']} ({country['id']})")
    
    # Step 2: Show tours that will be affected
    country_uuids = [c['id'] for c in countries_result]
    uuid_list = "', '".join(country_uuids)
    
    get_affected_tours_sql = f"""
    SELECT title, countries
    FROM tours 
    WHERE countries && ARRAY['{uuid_list}']::uuid[];
    """
    
    print("\n🔍 Checking affected tours...")
    tours_result = execute_sql(get_affected_tours_sql, "Finding affected tours")
    
    if tours_result:
        print(f"⚠️  {len(tours_result)} tours will be affected:")
        for tour in tours_result:
            print(f"  - {tour['title']}")
    else:
        print("✅ No tours will be affected")
    
    # Step 3: Confirmation
    print("\n" + "=" * 60)
    confirm = input("⚠️  Proceed with removal? This cannot be undone! (type 'YES' to confirm): ")
    
    if confirm != 'YES':
        print("❌ Operation cancelled")
        return
    
    # Step 4: Remove country UUIDs from tours.countries arrays
    print("\n🧹 Cleaning tour references...")
    for country in countries_result:
        country_uuid = country['id']
        country_name = country['name']
        
        clean_tours_sql = f"""
        UPDATE tours 
        SET countries = array_remove(countries, '{country_uuid}'::uuid),
            updated_at = now()
        WHERE '{country_uuid}'::uuid = ANY(countries);
        """
        
        result = execute_sql(clean_tours_sql, f"Removing {country_name} from tours")
        if result is not None:
            print(f"   ✅ Cleaned tour references for {country_name}")
        else:
            print(f"   ❌ Failed to clean tour references for {country_name}")
            return
    
    # Step 5: Remove countries
    print("\n🗑️  Removing countries...")
    remove_countries_sql = f"""
    DELETE FROM countries 
    WHERE id IN ('{uuid_list}');
    """
    
    result = execute_sql(remove_countries_sql, "Deleting countries")
    if result is not None:
        print(f"   ✅ Successfully removed {len(countries_result)} countries")
    else:
        print(f"   ❌ Failed to remove countries")
        return
    
    print("\n" + "=" * 60)
    print("🎉 Process completed successfully!")
    print(f"Removed {len(countries_result)} countries and cleaned all tour references")

if __name__ == "__main__":
    print("Simple Country Removal Script")
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
    
    remove_countries_simple(country_names) 