import { supabase } from '@/integrations/supabase/client';
import { Tour, TourImage, TourLocation, TourMap } from '@/types/tour';
import { Country } from '@/types/country';
import { TourHighlight } from '@/types/tourHighlight';
import { TourItinerary } from '@/types/tourItinerary';

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
  console.log('Calling getCountries API');
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

export async function getTourBySlug(slug: string): Promise<Tour | null> {
  if (!slug) {
    console.error("getTourBySlug called with no slug");
    return null;
  }
  console.log(`Fetching tour with slug: ${slug}`);

  // 1. Fetch the main tour data
  const { data: tourData, error: tourError } = await supabase
    .from('tours')
    .select('*') // Select all fields from the tours table
    .eq('slug', slug)
    .single(); // Expect only one tour or null

  // Handle initial fetch error or no data found
  if (tourError) {
    console.error(`Supabase error fetching tour by slug ${slug}:`, tourError.message);
    return null; // Return null if there's a DB error
  }
  if (!tourData) {
    console.log(`No tour found with slug: ${slug}`);
    return null; // Return null if no tour matches the slug
  }

  // We have tourData, proceed to fetch related details
  const tourId = tourData.id;

  // 2. Fetch associated tour images
  const { data: imagesData, error: imagesError } = await supabase
    .from('tour_images')
    .select('*')
    .eq('tour_id', tourId)
    .order('display_order');

  if (imagesError) {
    console.error(`Error fetching images for tour ${tourId}:`, imagesError);
    // Continue, but assign empty array
  }

  // 3. Fetch associated tour locations
  const { data: locationsData, error: locationsError } = await supabase
    .from('tour_locations')
    .select('*')
    .eq('tour_id', tourId)
    .order('order_index');

  if (locationsError) {
    console.error(`Error fetching locations for tour ${tourId}:`, locationsError);
    // Continue, but assign empty array
  }

  // 4. Fetch associated tour highlights
  const { data: highlightsData, error: highlightsError } = await supabase
    .from('tour_highlights')
    .select('*')
    .eq('tour_id', tourId)
    .order('order'); // Assuming 'order' is the column name

   if (highlightsError) {
     console.error(`Error fetching highlights for tour ${tourId}:`, highlightsError);
     // Continue, but assign empty array
   }

   // 5. Fetch associated tour itineraries (including nested hotel data)
   const { data: itinerariesData, error: itinerariesError } = await supabase
     .from('tour_itineraries')
     .select(`
       *,
       hotels (
         *,
         hotel_images (*)
       )
     `)
     .eq('tour_id', tourId)
     .order('order_index');

   if (itinerariesError) {
     console.error(`Error fetching itineraries for tour ${tourId}:`, itinerariesError);
     // Continue, but assign empty array
   }


  // 6. Fetch associated countries based on UUIDs in tourData.countries
  let fetchedCountries: Country[] = [];
  if (tourData.countries && tourData.countries.length > 0) {
     const { data: countriesData, error: countriesError } = await supabase
       .from('countries')
       .select('*') // Select needed country fields (id, name, slug, etc.)
       .in('id', tourData.countries); // Filter countries whose ID is in the tour's array

     if (countriesError) {
       console.error(`Error fetching countries for tour ${tourId}:`, countriesError);
       // Assign empty array if countries fail
     } else {
       fetchedCountries = (countriesData as Country[] || []);
     }
  }

  // 7. Combine all data into a single Tour object
  //    Ensure your `Tour` type definition includes fields for these relations
  const combinedTourData: Tour = {
    ...tourData,
    tour_images: (imagesData as TourImage[] || []),
    tour_locations: (locationsData as TourLocation[] || []),
    tour_highlights: (highlightsData as TourHighlight[] || []), // Add highlights
    tour_itineraries: (itinerariesData as TourItinerary[] || []), // Add itineraries
    // Add a field for the fetched country details, e.g., country_details
    // You'll need to add `country_details?: Country[]` to your Tour type definition
    country_details: fetchedCountries,
    // Remove the old tour_countries field if it's still in your type
    // tour_countries: undefined,
  };

  console.log(`Successfully fetched tour and related data for slug: ${slug}`);
  return combinedTourData;
}

export async function getToursByCountry(countryId: string): Promise<Tour[]> {
  if (!countryId) {
    console.error("getToursByCountry called with no countryId");
    return [];
  }

  // Fetch tours directly where the 'countries' array contains the countryId
  const { data: toursData, error: toursError } = await supabase
    .from('tours') // Query the 'tours' table directly
    .select('*')    // Select all tour fields
    .contains('countries', [countryId]); // Filter: 'countries' array must contain countryId

  if (toursError) {
    console.error(`Error fetching tours for country ${countryId}:`, toursError);
    return [];
  }

  if (!toursData || toursData.length === 0) {
     console.log(`No tours found containing country ID: ${countryId}`);
     return [];
  }

  // Now, fetch associated images for each fetched tour
  // (This part remains similar, but operates on the tours fetched above)
  const toursWithImages: Tour[] = [];
  for (const tour of toursData) {
    if (tour) {
      const { data: images, error: imagesError } = await supabase
        .from('tour_images')
        .select('*')
        .eq('tour_id', tour.id)
        .order('display_order');

      if (imagesError) {
        console.error(`Error fetching images for tour ${tour.id}:`, imagesError);
        // Add tour even if images fail to load? Or skip? Depends on desired behavior.
        // Let's add it but with empty images for now.
        toursWithImages.push({ ...tour, tour_images: [] });
      } else {
        // Assign images to the tour object
        toursWithImages.push({ ...tour, tour_images: (images as TourImage[] || []) });
      }
    }
  }

  console.log(`Returning ${toursWithImages.length} tours for country ${countryId}`);
  return toursWithImages; // Return the processed list of tours with their images
}

export async function getTourImages(tourId: string) {
  const { data, error } = await supabase
    .from('tour_images')
    .select('*')
    .eq('tour_id', tourId)
    .order('display_order');
  
  if (error) {
    console.error(`Error fetching images for tour ${tourId}:`, error);
    return [];
  }
  
  return data || [];
}

// Tour locations functions
export const getTourLocations = async (tourId: string) => {
  try {
    console.log(`Fetching locations for tour: ${tourId}`);
    
    const { data, error } = await supabase
      .from('tour_locations')
      .select('*')
      .eq('tour_id', tourId)
      .order('order_index');
      
    if (error) {
      console.error('Error fetching tour locations:', error);
      return [];
    }
    
    console.log(`Found ${data.length} locations for tour ${tourId}:`, data);
    
    // Ensure data is in the expected format
    return data.map(location => ({
      id: location.id,
      name: location.name,
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude),
      description: location.description || '',
      order_index: location.order_index
    }));
  } catch (error) {
    console.error('Failed to fetch tour locations:', error);
    return [];
  }
};

export async function getTourMap(tourId: string): Promise<TourMap | null> {
  const { data, error } = await supabase
    .from('tour_maps')
    .select('*')
    .eq('tour_id', tourId)
    .single();
  
  if (error) {
    console.error(`Error fetching map for tour ${tourId}:`, error);
    return null;
  }
  
  return data;
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
  const { data, error } = await supabase
    .from('tours')
    .select('vibe_tag')
    .not('vibe_tag', 'is', null);
  
  if (error) {
    console.error('Error fetching vibe categories:', error);
    return [];
  }
  
  const allVibeTags: string[] = data.flatMap(tour => {
    if (typeof tour.vibe_tag === 'string') {
      return [tour.vibe_tag];
    } else if (Array.isArray(tour.vibe_tag)) {
      return tour.vibe_tag
        .filter(tag => tag !== null && tag !== undefined)
        .map(tag => String(tag));
    }
    return [];
  });
  
  const uniqueVibeTags = [...new Set(allVibeTags)];
  
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

    return vibeMappings[tag] || {
      title: String(tag).charAt(0).toUpperCase() + String(tag).slice(1),
      image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
      description: "Explore this unique travel style"
    };
  });
  
  return vibeCategories;
}

export const getFeaturedCountries = async () => {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('is_featured', true)
      .order('name');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching featured countries:', error);
    return [];
  }
};

