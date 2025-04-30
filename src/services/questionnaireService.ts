import { supabase } from '@/utils/supabaseClient'; // Adjust this path if your Supabase client is elsewhere

// Define interfaces based on the Supabase schema we created

// Interface for individual options within a question
export interface QuestionOption {
  id: string;
  question_id: string; // Foreign key back to the question
  value: string; // Value stored in form state (e.g., 'relaxation', 'europe')
  display_text: string; // Text shown on the card/button
  description: string | null; // Longer text for explainer/tooltips
  icon_name: string | null; // Name of Lucide icon (e.g., 'Waves')
  image_url: string | null; // URL for images (e.g., region cards)
  collection_map: string | null; // Maps 'vibe' options to collection names
  order_index: number; // Display order
  created_at?: string; // Optional timestamp
  updated_at?: string; // Optional timestamp
}

// Interface for a single question/step in the questionnaire
export interface QuestionnaireQuestion {
  id: string;
  step_number: number; // Order of the question (1, 2, 3...)
  form_key: string; // Key used in react-hook-form ('vibe', 'duration', 'regions')
  question_text: string; // Main label text for the question
  question_type: string; // Determines rendering ('card_multi_select', 'slider', etc.)
  validation_rules: Record<string, any> | null; // JSON object with rules { max_select: 2 }
  helper_text: string | null; // Optional text below the input
  explainer_trigger_text: string | null; // Text for the 'Need advice?' link
  explainer_dialog_title: string | null; // Title for the explainer popup
  question_options: QuestionOption[]; // Array of options for this question
  created_at?: string; // Optional timestamp
  updated_at?: string; // Optional timestamp
}

/**
 * Fetches all questionnaire questions and their associated options from Supabase,
 * ordered by step number and option order index.
 */
export const fetchQuestionnaireData = async (): Promise<QuestionnaireQuestion[]> => {
  console.log("Attempting to fetch questionnaire data..."); // Add log
  const { data, error } = await supabase
    .from('questionnaire_questions')
    .select(`
      id,
      step_number,
      form_key,
      question_text,
      question_type,
      validation_rules,
      helper_text,
      explainer_trigger_text,
      explainer_dialog_title,
      question_options (
        id,
        question_id,
        value,
        display_text,
        description,
        icon_name,
        image_url,
        collection_map,
        order_index
      )
    `)
    .order('step_number', { ascending: true }) // Order questions by step
    .order('order_index', { referencedTable: 'question_options', ascending: true }); // Order options within each question

  if (error) {
    console.error('Error fetching questionnaire data:', error);
    throw new Error(`Failed to load questionnaire configuration: ${error.message}`);
  }

  if (!data) {
    console.warn("No questionnaire data returned from Supabase.");
    return []; // Return empty array if data is null/undefined
  }

  // Ensure question_options is always an array, even if Supabase returns null
   const formattedData = data.map(q => ({
     ...q,
     question_options: q.question_options || [] // Default to empty array if no options found
   }));

  console.log("Successfully fetched questionnaire data:", formattedData); // Add log
  // We cast here because Supabase typings might not perfectly match nested selects
  return formattedData as QuestionnaireQuestion[];
};


// --- Function to fetch Collections needed for the explainer dialog ---

// Interface for the relevant collection data
export interface FetchedCollection {
  id: string;
  name: string;
  featured_image: string | null;
}

/**
 * Fetches collections (name and featured image) used for the
 * explainer dialog image lookup, typically linked via collection_map.
 */
export const fetchCollectionsForExplainer = async (): Promise<FetchedCollection[]> => {
    console.log("Attempting to fetch collections for explainer..."); // Add log
    const { data, error } = await supabase
        .from('collections')
        .select('id, name, featured_image')
        .neq('featured_image', null); // Optimization: only fetch collections that have an image

    if (error) {
        console.error('Error fetching collections for explainer:', error);
        // Decide if this error should block the form or just disable the explainer image
        // Returning empty array allows the form to load but without explainer images.
        return [];
    }

    if (!data) {
        console.warn("No collection data returned for explainer.");
        return [];
    }

    console.log("Successfully fetched collections for explainer:", data); // Add log
    return data;
}; 