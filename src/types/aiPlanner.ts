// Define the structure for the answers from the questionnaire
export interface QuestionnaireAnswers {
  vibe: string[]; // Changed to string array for multiple selections
  duration: number;
  regions: string[]; // Updated to match actual questionnaire (was destinationPrefs)
  interests: string[];
  budget_range: number; // Maximum budget per person
  openEndedQuery?: string; // Added for free-text input
  avoids?: string[]; // Added for explicit dislikes
  timing?: string[]; // Added for seasonal preference
  pace?: string[]; // Added for pace preference
}

// Define the structure for the itinerary preview data
export interface ItineraryPreview {
  id: string; // ID of the matched pre-generated itinerary
  title: string;
  summary: string;
  featured_image?: string;
  guide_price?: number;
  duration: number; // Added duration field
  countries: string[]; // Added countries field
  slug: string; // Added slug field
  similarity?: number; // Added similarity field
  // Add other preview-specific fields
}

// Define the structure for the full itinerary data
export interface FullItinerary extends ItineraryPreview {
  // Inherits preview fields and adds more detail
  daily_schedule: Array<{
    day: number;
    title: string;
    description: string;
    activities: string[];
    accommodation?: string; // Example
  }>;
  map_data?: any; // Placeholder for map details
  included_highlights?: string[];
  // Add all fields necessary to render the full itinerary
}

// Define the possible phases/steps of the planner
export enum PlannerPhase {
  QUESTIONNAIRE = 'questionnaire',
  LOADING_PREVIEW = 'loading_preview',
  PREVIEW = 'preview',
  PAYMENT = 'payment', // Placeholder for payment integration step
  LOADING_FULL = 'loading_full',
  FULL_ITINERARY = 'full_itinerary',
  EXPORT = 'export', // Placeholder for PDF export step
  ERROR = 'error',
} 