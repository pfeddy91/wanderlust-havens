#!/usr/bin/env python3
"""
Fix Duplicate Countries Script
Remaps tours from duplicate countries (UK, USA, UAE) to original ones (United Kingdom, United States, United Arab Emirates)
Then removes the duplicate countries.
"""

import os
from supabase import create_client

# Supabase credentials
SUPABASE_URL = "https://ydcggawwxohbcpcjyhdk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY2dnYXd3eG9oYmNwY2p5aGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjk3NjUsImV4cCI6MjA1ODg0NTc2NX0.FHSkH2qML9w5Li6VfG8jWbcu-DV4HQCLTK0wu6J3VV0"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Country mapping: duplicate -> original
COUNTRY_MAPPINGS = {
    'UK': 'United Kingdom',
    'USA': 'United States', 
    'UAE': 'United Arab Emirates'
}

def execute_select_query(table, select_fields, where_conditions="", description=""):
    """Execute a SELECT query using Supabase client."""
    try:
        print(f"   {description}...")
        query = supabase.table(table).select(select_fields)
        
        if where_conditions:
            # This is a simplified approach - we'll handle specific cases
            pass
            
        result = query.execute()
        
        if hasattr(result, 'error') and result.error:
            print(f"   ❌ Error: {result.error}")
            return None
        
        return result.data
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return None

def get_country_info():
    """Get information about duplicate and original countries."""
    print("🔍 Getting country information...")
    
    all_country_names = list(COUNTRY_MAPPINGS.keys()) + list(COUNTRY_MAPPINGS.values())
    country_list = "', '".join(all_country_names)
    
    query = f"""
    SELECT name, id, slug
    FROM countries 
    WHERE name IN ('{country_list}')
    ORDER BY name;
    """
    
    result = execute_sql(query, "Fetching country details")
    if not result:
        return None
    
    # Organize by name for easy lookup
    countries = {country['name']: country for country in result}
    
    print("✅ Found countries:")
    for name, country in countries.items():
        print(f"  - {name}: {country['id']}")
    
    return countries

def get_affected_tours(countries):
    """Get tours that will be affected by the remapping."""
    print("\n🔍 Checking affected tours...")
    
    duplicate_uuids = []
    for duplicate_name in COUNTRY_MAPPINGS.keys():
        if duplicate_name in countries:
            duplicate_uuids.append(countries[duplicate_name]['id'])
    
    if not duplicate_uuids:
        print("   No duplicate countries found")
        return None
    
    uuid_list = "', '".join(duplicate_uuids)
    
    query = f"""
    SELECT title, countries
    FROM tours 
    WHERE countries && ARRAY['{uuid_list}']::uuid[]
    ORDER BY title;
    """
    
    result = execute_sql(query, "Finding affected tours")
    
    if result:
        print(f"📊 Found {len(result)} tours that need remapping:")
        for tour in result:
            print(f"  - {tour['title']}")
    else:
        print("   No tours found that need remapping")
    
    return result

def remap_tours(countries):
    """Remap tours from duplicate countries to original countries."""
    print("\n🔄 Remapping tours...")
    
    success_count = 0
    
    for duplicate_name, original_name in COUNTRY_MAPPINGS.items():
        if duplicate_name not in countries or original_name not in countries:
            print(f"   ⚠️  Skipping {duplicate_name} -> {original_name} (country not found)")
            continue
        
        duplicate_uuid = countries[duplicate_name]['id']
        original_uuid = countries[original_name]['id']
        
        print(f"\n   📍 Remapping {duplicate_name} -> {original_name}")
        
        # Update tours: replace duplicate UUID with original UUID
        query = f"""
        UPDATE tours 
        SET countries = array_replace(countries, '{duplicate_uuid}'::uuid, '{original_uuid}'::uuid),
            updated_at = now()
        WHERE '{duplicate_uuid}'::uuid = ANY(countries);
        """
        
        result = execute_sql(query, f"Remapping tours from {duplicate_name} to {original_name}")
        
        if result is not None:
            print(f"   ✅ Successfully remapped {duplicate_name} tours to {original_name}")
            success_count += 1
        else:
            print(f"   ❌ Failed to remap {duplicate_name} tours")
            return False
    
    print(f"\n✅ Successfully remapped {success_count}/{len(COUNTRY_MAPPINGS)} country mappings")
    return True

def remove_duplicate_countries(countries):
    """Remove the duplicate countries from the database."""
    print("\n🗑️  Removing duplicate countries...")
    
    duplicate_uuids = []
    for duplicate_name in COUNTRY_MAPPINGS.keys():
        if duplicate_name in countries:
            duplicate_uuids.append(countries[duplicate_name]['id'])
    
    if not duplicate_uuids:
        print("   No duplicate countries to remove")
        return True
    
    uuid_list = "', '".join(duplicate_uuids)
    
    query = f"""
    DELETE FROM countries 
    WHERE id IN ('{uuid_list}');
    """
    
    result = execute_sql(query, "Deleting duplicate countries")
    
    if result is not None:
        print(f"   ✅ Successfully removed {len(duplicate_uuids)} duplicate countries")
        return True
    else:
        print(f"   ❌ Failed to remove duplicate countries")
        return False

def verify_results(countries):
    """Verify that the remapping worked correctly."""
    print("\n🔍 Verifying results...")
    
    # Check that no tours reference the old duplicate countries
    duplicate_uuids = []
    for duplicate_name in COUNTRY_MAPPINGS.keys():
        if duplicate_name in countries:
            duplicate_uuids.append(countries[duplicate_name]['id'])
    
    if not duplicate_uuids:
        print("   No duplicate UUIDs to check")
        return True
    
    uuid_list = "', '".join(duplicate_uuids)
    
    query = f"""
    SELECT COUNT(*) as count
    FROM tours 
    WHERE countries && ARRAY['{uuid_list}']::uuid[];
    """
    
    result = execute_sql(query, "Checking for remaining references to duplicate countries")
    
    if result and len(result) > 0:
        remaining_count = result[0]['count']
        if remaining_count == 0:
            print("   ✅ No tours reference duplicate countries anymore")
            return True
        else:
            print(f"   ❌ Still {remaining_count} tours referencing duplicate countries")
            return False
    else:
        print("   ❌ Failed to verify results")
        return False

def main():
    """Main function to fix duplicate countries."""
    print("🔧 Fix Duplicate Countries Script")
    print("=" * 60)
    print("This script will:")
    print("1. Remap tours from UK → United Kingdom")
    print("2. Remap tours from USA → United States") 
    print("3. Remap tours from UAE → United Arab Emirates")
    print("4. Remove the duplicate countries (UK, USA, UAE)")
    print("=" * 60)
    
    # Step 1: Get country information
    countries = get_country_info()
    if not countries:
        print("❌ Failed to get country information")
        return
    
    # Step 2: Show affected tours
    affected_tours = get_affected_tours(countries)
    
    # Step 3: Confirmation
    print("\n" + "=" * 60)
    confirm = input("⚠️  Proceed with remapping and removal? This cannot be undone! (type 'YES' to confirm): ")
    
    if confirm != 'YES':
        print("❌ Operation cancelled")
        return
    
    # Step 4: Remap tours
    if not remap_tours(countries):
        print("❌ Remapping failed, stopping process")
        return
    
    # Step 5: Verify remapping worked
    if not verify_results(countries):
        print("❌ Verification failed, NOT removing duplicate countries")
        return
    
    # Step 6: Remove duplicate countries
    if not remove_duplicate_countries(countries):
        print("❌ Failed to remove duplicate countries")
        return
    
    print("\n" + "=" * 60)
    print("🎉 Process completed successfully!")
    print("✅ All tours have been remapped to correct countries")
    print("✅ Duplicate countries (UK, USA, UAE) have been removed")
    print("✅ Tours now reference: United Kingdom, United States, United Arab Emirates")

if __name__ == "__main__":
    main() 