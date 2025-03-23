
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
  relevance_score: number | null;
  quality_score: number | null;
  luxury_score: number | null;
  romantic_score: number | null;
  uniqueness_score: number | null;
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
}
