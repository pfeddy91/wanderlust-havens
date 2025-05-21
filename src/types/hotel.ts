// Define interface for hotel image
export interface HotelImage {
  id: string;
  hotel_id: string | null; // This connects the image to a hotel
  image_url: string;
  alt_text: string | null;
  is_featured: boolean | null; // You had this, might be useful
  created_at: string;
  updated_at: string;
}

// Define interface for hotel
export interface Hotel {
  id: string; // uuid
  name: string; // text
  location: string; // text
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  gemini_address: string | null; // text
  gemini_latitude: number | null; // numeric(10,7)
  gemini_longitude: number | null; // numeric(10,7)
  google_place_id: string | null; // text
  google_place_name_resource: string | null; // text
  google_place_display_name: string | null; // text
  google_place_formatted_address: string | null; // text
  google_place_short_formatted_address: string | null; // text
  google_place_latitude: number | null; // numeric(10,7)
  google_place_longitude: number | null; // numeric(10,7)
  google_maps_uri: string | null; // text
  google_place_price_level: string | null; // text
  google_place_rating: number | null; // numeric(2,1)
  google_place_user_rating_count: number | null; // integer
  google_place_website_uri: string | null; // text
  gemini_short_summary: string | null; // text
  gemini_longer_summary: string | null; // text
  gemini_location_description: string | null; // text
  gemini_rationale: string | null; // text
  gemini_top_tip: string | null; // text
  gemini_price_range: string | null; // text
  images: HotelImage[]; // This remains for the hotel's own images
} 