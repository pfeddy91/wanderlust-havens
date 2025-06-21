#!/usr/bin/env python3
"""
Fix Duplicate Countries Script - MCP Version
Remaps tours from duplicate countries (UK, USA, UAE) to original ones 
Then removes the duplicate countries using step-by-step operations.
"""

# Country mapping: duplicate -> original
COUNTRY_MAPPINGS = {
    'UK': 'United Kingdom',
    'USA': 'United States', 
    'UAE': 'United Arab Emirates'
}

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
    
    print("\n📊 Current Status:")
    print("From database analysis:")
    print("• UK (2 tours) + United Kingdom (3 tours) = 5 total tours")
    print("• USA (10 tours) + United States (8 tours) = 18 total tours")
    print("• UAE (4 tours) + United Arab Emirates (1 tour) = 5 total tours")
    
    print("\n📝 Tours to be remapped:")
    print("UK tours: Royal Heritage Trail, Orient Express European Grand Tour")
    print("USA tours: California Wine Country, Pacific Northwest Discovery, etc. (10 tours)")
    print("UAE tours: Emirates Desert & Coast, Dubai & Abu Dhabi Ultimate, etc. (4 tours)")
    
    print("\n" + "=" * 60)
    confirm = input("⚠️  Ready to execute SQL commands via MCP? (type 'YES' to confirm): ")
    
    if confirm != 'YES':
        print("❌ Operation cancelled")
        return
    
    print("\n🔄 Please execute these SQL commands using MCP:")
    print("=" * 60)
    
    # Step 1: Remap UK tours to United Kingdom
    print("\n1️⃣ STEP 1: Remap UK tours to United Kingdom")
    print("Execute this SQL:")
    print("```sql")
    print("UPDATE tours")
    print("SET countries = array_replace(countries, '7dda02af-5f36-447d-8c12-e5acbdb86dee'::uuid, 'ff088a25-e33d-4361-8b02-d6fd15599ba2'::uuid),")
    print("    updated_at = now()")
    print("WHERE '7dda02af-5f36-447d-8c12-e5acbdb86dee'::uuid = ANY(countries);")
    print("```")
    
    # Step 2: Remap USA tours to United States  
    print("\n2️⃣ STEP 2: Remap USA tours to United States")
    print("Execute this SQL:")
    print("```sql")
    print("UPDATE tours")
    print("SET countries = array_replace(countries, '10c348bb-04db-48c0-8df3-38c4129c6c3f'::uuid, 'bc17cf65-2098-466b-96f4-1a8b53f7adc2'::uuid),")
    print("    updated_at = now()")
    print("WHERE '10c348bb-04db-48c0-8df3-38c4129c6c3f'::uuid = ANY(countries);")
    print("```")
    
    # Step 3: Remap UAE tours to United Arab Emirates
    print("\n3️⃣ STEP 3: Remap UAE tours to United Arab Emirates")
    print("Execute this SQL:")
    print("```sql")
    print("UPDATE tours")
    print("SET countries = array_replace(countries, '1d3e4204-7ad6-44c7-8ff4-5d9a087729d1'::uuid, '845c87b5-a82f-455a-bad9-c5d756c0e5ed'::uuid),")
    print("    updated_at = now()")
    print("WHERE '1d3e4204-7ad6-44c7-8ff4-5d9a087729d1'::uuid = ANY(countries);")
    print("```")
    
    # Step 4: Verify remapping
    print("\n4️⃣ STEP 4: Verify remapping worked")
    print("Execute this SQL to check no tours reference the old countries:")
    print("```sql")
    print("SELECT COUNT(*) as remaining_references")
    print("FROM tours")
    print("WHERE countries && ARRAY[")
    print("  '7dda02af-5f36-447d-8c12-e5acbdb86dee'::uuid,  -- UK")
    print("  '10c348bb-04db-48c0-8df3-38c4129c6c3f'::uuid,  -- USA") 
    print("  '1d3e4204-7ad6-44c7-8ff4-5d9a087729d1'::uuid   -- UAE")
    print("];")
    print("```")
    print("This should return 0 if remapping worked correctly.")
    
    # Step 5: Remove duplicate countries
    print("\n5️⃣ STEP 5: Remove duplicate countries (ONLY after verification)")
    print("Execute this SQL ONLY if step 4 returned 0:")
    print("```sql")
    print("DELETE FROM countries")
    print("WHERE id IN (")
    print("  '7dda02af-5f36-447d-8c12-e5acbdb86dee',  -- UK")
    print("  '10c348bb-04db-48c0-8df3-38c4129c6c3f',  -- USA")
    print("  '1d3e4204-7ad6-44c7-8ff4-5d9a087729d1'   -- UAE")
    print(");")
    print("```")
    
    print("\n" + "=" * 60)
    print("🎯 EXECUTION SUMMARY:")
    print("1. Execute steps 1-3 to remap tours")
    print("2. Execute step 4 to verify (should return 0)")
    print("3. If step 4 returns 0, execute step 5 to remove duplicates")
    print("4. The result will be all tours properly mapped to:")
    print("   • United Kingdom (instead of UK)")
    print("   • United States (instead of USA)")
    print("   • United Arab Emirates (instead of UAE)")
    print("=" * 60)

if __name__ == "__main__":
    main() 