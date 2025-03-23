
import { supabase } from '@/integrations/supabase/client';

// Region-related functions
export async function getRegions() {
  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching regions:', error);
    return [];
  }
  
  return data || [];
}

export async function getRegionBySlug(slug: string) {
  const { data, error } = await supabase
    .from('regions')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) {
    console.error(`Error fetching region with slug ${slug}:`, error);
    return null;
  }
  
  return data;
}

// Country-related functions
export async function getCountries() {
  const { data, error } = await supabase
    .from('countries')
    .select('*, regions(*)')
    .order('name');
  
  if (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
  
  return data || [];
}

export async function getCountriesByRegion(regionId: string) {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .eq('region_id', regionId)
    .order('name');
  
  if (error) {
    console.error(`Error fetching countries for region ${regionId}:`, error);
    return [];
  }
  
  return data || [];
}

export async function getCountryBySlug(slug: string) {
  const { data, error } = await supabase
    .from('countries')
    .select('*, regions(*)')
    .eq('slug', slug)
    .single();
  
  if (error) {
    console.error(`Error fetching country with slug ${slug}:`, error);
    return null;
  }
  
  return data;
}

// Tour-related functions
export async function getTours() {
  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching tours:', error);
    return [];
  }
  
  return data || [];
}

export async function getFeaturedTours() {
  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('is_featured', true)
    .order('name');
  
  if (error) {
    console.error('Error fetching featured tours:', error);
    return [];
  }
  
  return data || [];
}

export async function getTourBySlug(slug: string) {
  const { data, error } = await supabase
    .from('tours')
    .select(`
      *,
      tour_countries(*, countries(*)),
      tour_highlights(*),
      tour_hotels(*, hotels(*, hotel_images(*)))
    `)
    .eq('slug', slug)
    .single();
  
  if (error) {
    console.error(`Error fetching tour with slug ${slug}:`, error);
    return null;
  }
  
  return data;
}

export async function getToursByCountry(countryId: string) {
  const { data, error } = await supabase
    .from('tour_countries')
    .select('*, tours(*)')
    .eq('country_id', countryId);
  
  if (error) {
    console.error(`Error fetching tours for country ${countryId}:`, error);
    return [];
  }
  
  return data?.map(tc => tc.tours) || [];
}

// Hotel-related functions
export async function getHotels() {
  const { data, error } = await supabase
    .from('hotels')
    .select('*, countries(*), hotel_images(*)')
    .order('name');
  
  if (error) {
    console.error('Error fetching hotels:', error);
    return [];
  }
  
  return data || [];
}

export async function getHotelsByCountry(countryId: string) {
  const { data, error } = await supabase
    .from('hotels')
    .select('*, hotel_images(*)')
    .eq('country_id', countryId)
    .order('name');
  
  if (error) {
    console.error(`Error fetching hotels for country ${countryId}:`, error);
    return [];
  }
  
  return data || [];
}

// Vibe categories functions
export async function getVibeCategories() {
  // This query fetches distinct vibe tags from the tours table
  const { data, error } = await supabase
    .from('tours')
    .select('vibe_tag')
    .not('vibe_tag', 'is', null);
  
  if (error) {
    console.error('Error fetching vibe categories:', error);
    return [];
  }
  
  // Process the data to get unique vibe tags
  const allVibeTags: string[] = data.flatMap(tour => {
    // Check if vibe_tag is an array, a string, or in a different format
    if (typeof tour.vibe_tag === 'string') {
      return [tour.vibe_tag];
    } else if (Array.isArray(tour.vibe_tag)) {
      // Filter out non-string values and convert everything to strings
      return tour.vibe_tag
        .filter(tag => tag !== null && tag !== undefined)
        .map(tag => String(tag));
    }
    return []; // Return empty array for unsupported types
  });
  
  const uniqueVibeTags = [...new Set(allVibeTags)];
  
  // Map vibe tags to their display information
  const vibeCategories = uniqueVibeTags.map(tag => {
    const vibeMappings: Record<string, { title: string, image: string, description: string }> = {
      'adventure': {
        title: "Adventure",
        image: "https://images.unsplash.com/photo-1527631120902-378417754324?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        description: "For thrill-seeking couples"
      },
      'relaxation': {
        title: "Relaxation",
        image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        description: "Serene escapes for unwinding"
      },
      'cultural': {
        title: "Cultural",
        image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2339&q=80",
        description: "Immersive local experiences"
      },
      'luxury': {
        title: "Luxury",
        image: "https://images.unsplash.com/photo-1551918120-9739cb430c6d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        description: "Exclusive high-end getaways"
      },
      'romantic': {
        title: "Romantic",
        image: "https://images.unsplash.com/photo-1494469125874-2aa94d9cffb8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        description: "Perfect for couples in love"
      },
      'wildlife': {
        title: "Wildlife",
        image: "https://images.unsplash.com/photo-1504173010664-32509aeebb62?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        description: "Close encounters with nature"
      },
      'beach': {
        title: "Beach",
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        description: "Sun, sand and ocean views"
      },
      'mountain': {
        title: "Mountain",
        image: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        description: "Breathtaking highland escapes"
      },
      'city': {
        title: "City",
        image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        description: "Urban adventures and nightlife"
      },
      'culinary': {
        title: "Culinary",
        image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
        description: "Gourmet experiences worldwide"
      }
    };

    // Return default values if mapping is not found
    return vibeMappings[tag] || {
      title: String(tag).charAt(0).toUpperCase() + String(tag).slice(1),
      image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
      description: "Explore this unique travel style"
    };
  });
  
  return vibeCategories;
}

