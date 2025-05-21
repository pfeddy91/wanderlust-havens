import { QuestionnaireAnswers, ItineraryPreview, FullItinerary } from '@/types/aiPlanner'; // Adjust path
import { supabase } from '@/utils/supabaseClient'; // Assuming you have this helper
// Remove direct supabase import if using Edge Functions via fetch

// Placeholder function to simulate finding a matching itinerary
// Replace with actual fetch call to your Supabase Edge Function
export const findMatchingItinerary = async (answers: QuestionnaireAnswers): Promise<ItineraryPreview[] | null> => {
  console.log("HARDCODED: Fetching specific tour data for predefined itinerary previews.");
  console.log("Questionnaire answers received (but not used for this hardcoded version):", answers);

  const hardcodedTourIds = [
    "c2011e70-337e-4522-b1b4-ab94759dafce",
    "ea3cf3a4-46d2-4140-bef0-b14247f3d4da",
    "bb326573-344a-4d5f-9e6e-52006d532ac6"
  ];

  try {
    // 1. Fetch tour details for the hardcoded IDs - ADD 'slug' and 'countries' (the foreign key array)
    const { data: toursData, error: toursError } = await supabase
      .from('tours')
      .select('id, title, summary, duration, slug, countries') // ADDED slug and countries FK
      .in('id', hardcodedTourIds);

    if (toursError) {
      console.error("Error fetching hardcoded tour data:", toursError);
      throw toursError;
    }

    if (!toursData || toursData.length === 0) {
      console.log("No tour data found for the hardcoded IDs.");
      return null;
    }

    // 2. Fetch featured images for these tours
    // Assuming you have a way to identify the primary/featured image,
    // e.g., an 'is_featured' or 'is_primary' column in 'tour_images' table.
    // Or, if 'featured_image' is directly on the 'tours' table, this step can be simpler.
    // For this example, let's query tour_images.
    const { data: imagesData, error: imagesError } = await supabase
      .from('tour_images')
      .select('tour_id, image_url')
      .in('tour_id', hardcodedTourIds)
      .eq('is_featured', true); // Or .eq('is_primary', true) or order by display_order and pick first

    if (imagesError) {
      console.warn("Error fetching featured images for hardcoded tours, will use placeholders:", imagesError);
    }

    const imageMap = new Map<string, string>();
    if (imagesData) {
      imagesData.forEach(img => {
        if (img.tour_id && img.image_url && !imageMap.has(img.tour_id)) { // Take the first featured image found
          imageMap.set(img.tour_id, img.image_url);
        }
      });
    }

    // 2.5 (NEW) Fetch country names if needed for the preview card (OPTIONAL, but good practice for consistency)
    // Extract all unique country UUIDs from the fetched tours
    const allCountryUUIDs = Array.from(new Set(
      toursData.flatMap(tour => tour.countries || [])
    ));

    let countryNamesMap = new Map<string, string>();
    if (allCountryUUIDs.length > 0) {
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('id, name')
        .in('id', allCountryUUIDs);

      if (countriesError) {
        console.warn("Error fetching country names for previews:", countriesError);
      } else if (countriesData) {
        countriesData.forEach(c => countryNamesMap.set(c.id, c.name));
      }
    }

    // 3. Construct the ItineraryPreview objects
    const previews: ItineraryPreview[] = toursData.map((tour, index) => {
      const featuredImage = imageMap.get(tour.id) || 
                            `https://images.unsplash.com/photo-1500759285222-a95626b93416?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60`; // Fallback

      // Get actual country names for the tour
      const currentTourCountryNames = (tour.countries || []).map(uuid => countryNamesMap.get(uuid) || 'Unknown Country').filter(name => name !== 'Unknown Country');

      return {
        id: tour.id,
        title: tour.title || `Honeymoon Special ${index + 1}`,
        summary: tour.summary || `An unforgettable journey tailored for you. This is placeholder summary for tour ID: ${tour.id}.`,
        featured_image: featuredImage,
        duration: tour.duration || 7 + index,
        countries: currentTourCountryNames.length > 0 ? currentTourCountryNames : ['Various Locations'], // Use fetched names or a fallback
        slug: tour.slug || `tour-slug-${index + 1}`, // ADDED slug, with fallback
        similarity: 0.9 - (index * 0.05), // Example similarity
        // Add other ItineraryPreview fields if they exist in your type
      };
    });

    // Simulate a short network delay if desired
    // await new Promise(resolve => setTimeout(resolve, 300));

    console.log("Returning hardcoded previews with fetched data:", previews);
    return previews;

  } catch (error) {
    console.error("Failed to construct hardcoded previews with fetched data:", error);
    return null; // Or throw the error if you want the orchestrator to handle it
  }

  // --- Original Supabase function call is now bypassed ---
  /*
  console.log("Attempting to invoke Supabase Edge Function 'findMatchingItinerary'...");

  const { data: user } = await supabase.auth.getUser(); 

  const functionName = 'findMatchingItinerary';

  console.log("Invoking function with this data object:", answers);

  const { data: previewsData, error } = await supabase.functions.invoke(functionName, {
    method: 'POST', 
    body: answers,
  });

  if (error) {
    console.error(`Error invoking Supabase function '${functionName}':`, error);
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

  if (!previewsData) {
       console.log("No matching previews returned from the edge function.");
       return null;
   }

  console.log("Received previews:", previewsData);
  return previewsData as ItineraryPreview[];
  */
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