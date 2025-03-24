
// Define interface for tour image
export interface TourImage {
  id: string;
  tour_id: string | null;
  image_url: string;
  alt_text: string | null;
  is_featured: boolean | null;
  is_primary: boolean | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  search_term: string | null;
  overall_score: number | null;
  relevance_score?: number | null;
  quality_score?: number | null;
  luxury_score?: number | null;
  romantic_score?: number | null;
  uniqueness_score?: number | null;
}

// Define interface for tour highlight
export interface TourHighlight {
  id: string;
  tour_id: string | null;
  title: string;
  description: string | null;
  image: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

// Define interface for hotel
export interface Hotel {
  id: string;
  name: string;
  location: string;
  description: string | null;
  country_id: string | null;
  star_rating: number | null;
  features: string[] | null;
  created_at: string;
  updated_at: string;
  hotel_images?: HotelImage[];
}

// Define interface for hotel image
export interface HotelImage {
  id: string;
  hotel_id: string | null;
  image_url: string;
  alt_text: string | null;
  is_featured: boolean | null;
  created_at: string;
  updated_at: string;
}

// Define interface for tour hotel
export interface TourHotel {
  id: string;
  tour_id: string | null;
  hotel_id: string | null;
  nights: number;
  order: number;
  created_at: string;
  updated_at: string;
  hotels?: Hotel;
}

// Define interface for country
export interface Country {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured_image: string | null;
  map_image: string | null;
  region_id: string | null;
  created_at: string;
  updated_at: string;
}

// Define interface for tour country
export interface TourCountry {
  id: string;
  tour_id: string | null;
  country_id: string | null;
  order: number;
  created_at: string;
  updated_at: string;
  countries?: Country;
}

// Define interface for tour location
export interface TourLocation {
  id: number; // Changed from string to number to match the database
  tour_id: string;
  name: string;
  description?: string | null;
  longitude: number;
  latitude: number;
  order_index: number; // Changed from order to order_index to match the database
  location_type?: string | null;
  stay_duration?: number | null;
  // We'll make these optional since they don't appear in the API response
  created_at?: string;
  updated_at?: string;
}

// Define interface for tour map
export interface TourMap {
  id?: string;
  tour_id?: string;
  static_map_url: string;
  route_geojson?: any;
  distance?: string;
  duration?: string;
  created_at?: string;
  updated_at?: string;
}

// Define interface for tour with tour_images property
export interface Tour {
  id: string;
  name: string;
  slug: string;
  duration: number;
  guide_price: number;
  summary: string;
  description: string;
  featured_image: string | null;
  is_featured: boolean | null;
  created_at: string;
  updated_at: string;
  vibe_tag: any;
  tour_images?: TourImage[];
  tour_highlights?: TourHighlight[];
  tour_hotels?: TourHotel[];
  tour_countries?: TourCountry[];
  tour_locations?: TourLocation[];
}
