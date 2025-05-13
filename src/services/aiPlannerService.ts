import { QuestionnaireAnswers, ItineraryPreview, FullItinerary } from '@/types/aiPlanner'; // Adjust path
import { supabase } from '@/utils/supabaseClient'; // Assuming you have this helper
// Remove direct supabase import if using Edge Functions via fetch

// Placeholder function to simulate finding a matching itinerary
// Replace with actual fetch call to your Supabase Edge Function
export const findMatchingItinerary = async (answers: QuestionnaireAnswers): Promise<ItineraryPreview[] | null> => { // Return array or null
  console.log("Attempting to invoke Supabase Edge Function 'findMatchingItinerary'...");

  const { data: user } = await supabase.auth.getUser(); // Get user session info if needed for RLS later

  const functionName = 'findMatchingItinerary';

  // --- Log the object just before sending ---
  console.log("Invoking function with this data object:", answers);

  const { data: previews, error } = await supabase.functions.invoke(functionName, {
    method: 'POST', // Keep explicitly stating POST for clarity
    // --- Let supabase-js handle Content-Type header when body is an object ---
    // headers: {
    //   'Content-Type': 'application/json',
    // },
    // --- EDITED: Pass the raw object, not the stringified version ---
    body: answers,
  });

  if (error) {
    console.error(`Error invoking Supabase function '${functionName}':`, error);
    // Provide a more specific error message based on the type
    let errorMessage = `Failed to find matching itinerary: ${error.message}`;
    if (error instanceof Error && error.name === 'FunctionsHttpError') {
        errorMessage = `Failed to find matching itinerary: Edge Function returned status ${error.context.status} (${error.context.statusText})`;
    } else if (error instanceof Error && error.name === 'FunctionsRelayError') {
        errorMessage = `Failed to find matching itinerary: Network error relaying request.`;
    } else if (error instanceof Error && error.name === 'FunctionsFetchError') {
        errorMessage = `Failed to find matching itinerary: Could not reach Edge Function.`;
    }
     throw new Error(errorMessage);
  }

  if (!previews) {
       console.log("No matching previews returned from the edge function.");
       return null;
   }

  console.log("Received previews:", previews);
  // --- Important: Ensure the response is correctly parsed ---
  // If the edge function returns JSON string in 'data', you might need:
  // return JSON.parse(previews) as ItineraryPreview[];
  // But typically invoke handles parsing if the function returns JSON correctly.
  // Let's assume it returns the parsed array directly for now.
  return previews as ItineraryPreview[];
};

// Placeholder function to simulate payment intent creation (if needed server-side)
// Replace with actual fetch call to your Supabase Function if using Stripe backend integration
export const createPaymentIntent = async (itineraryId: string): Promise<{ clientSecret: string } | null> => {
   console.log("Calling mock createPaymentIntent for:", itineraryId);
   // --- Replace with actual API call to backend ---
   await new Promise(resolve => setTimeout(resolve, 500));
   // Simulate returning a Stripe client secret
   return { clientSecret: 'pi_123_secret_456' };
};


// Placeholder function to simulate getting the full itinerary after payment confirmation
// Replace with actual fetch call to your Supabase Function
export const getUnlockedItinerary = async (itineraryId: string): Promise<FullItinerary | null> => {
  console.log("Calling mock getUnlockedItinerary for:", itineraryId);
   // --- Replace with actual fetch API call ---
   // const response = await fetch(`/api/ai-planner/get-itinerary/${itineraryId}`); // Example API route
   // if (!response.ok) throw new Error('Failed to fetch full itinerary');
   // const data = await response.json();
   // return data as FullItinerary;
   // --- End Replace ---

   // Simulate network delay
   await new Promise(resolve => setTimeout(resolve, 1000));

   // Simulate returning full data based on ID
   if (itineraryId === 'pregen-italy-123') {
      return {
         id: 'pregen-italy-123',
         title: 'Romantic Italian Escape',
         summary: 'Discover the charm of Venice, Florence, and Rome. Perfect for couples seeking romance and culture.',
         featured_image: 'https://images.unsplash.com/photo-1515859005217-8a1f08870f59?w=800&q=80',
         guide_price: 7500,
         daily_schedule: [
            { day: 1, title: 'Arrival in Venice', description: 'Arrive at Venice Marco Polo Airport, transfer to your hotel. Gondola ride in the evening.', activities: ['Gondola Ride'], accommodation: 'Hotel Danieli (Example)' },
            { day: 2, title: 'Venice Exploration', description: 'Visit St. Mark\'s Square, Doge\'s Palace, and Rialto Bridge.', activities: ['Walking Tour', 'Museum Visit'], accommodation: 'Hotel Danieli (Example)' },
            { day: 3, title: 'Travel to Florence', description: 'Take a high-speed train to Florence. Check into your hotel and explore the Oltrarno district.', activities: ['Train Journey', 'Explore Oltrarno'], accommodation: 'Hotel Lungarno (Example)' },
            // Add more days...
         ],
         similarity: 0.95 // Added example
      };
   } else {
      return null;
   }
}; 