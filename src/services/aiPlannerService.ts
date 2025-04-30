import { QuestionnaireAnswers, ItineraryPreview, FullItinerary } from '@/types/aiPlanner'; // Adjust path
import { supabase } from '@/utils/supabaseClient'; // Assuming you have this helper
// Remove direct supabase import if using Edge Functions via fetch

// Placeholder function to simulate finding a matching itinerary
// Replace with actual fetch call to your Supabase Edge Function
export const findMatchingItinerary = async (answers: QuestionnaireAnswers): Promise<ItineraryPreview[] | null> => { // Return array or null
  console.log("Calling Supabase Edge Function 'findMatchingItinerary' with:", answers);

  const { data: user } = await supabase.auth.getUser(); // Get user session for auth header

  // Use the Function name defined in Supabase
  const functionName = 'findMatchingItinerary';

  const { data: previews, error } = await supabase.functions.invoke(functionName, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Auth header might be handled automatically by supabase-js v2 when calling invoke
      // If not, manually add: Authorization: `Bearer ${user?.session?.access_token}`
    },
    body: JSON.stringify(answers),
  });

  if (error) {
    console.error(`Error invoking Supabase function '${functionName}':`, error);
    // Consider more specific error handling based on error type/message
    throw new Error(`Failed to find matching itinerary: ${error.message}`);
  }

  if (!previews) {
    console.log("No matching previews returned from the edge function.");
    return null; // Return null if the function returns nothing or an empty array explicitly means null
  }

  // Assuming the edge function returns an array of previews directly
  console.log("Received previews:", previews);
  return previews as ItineraryPreview[]; // Cast to the expected type (array)
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
         // Add other FullItinerary fields
      };
   } else {
      return null;
   }
}; 