
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
