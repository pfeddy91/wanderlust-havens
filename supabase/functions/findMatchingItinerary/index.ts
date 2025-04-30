// supabase/functions/findMatchingItinerary/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3' // Use specific version
import { corsHeaders } from '../_shared/cors.ts' // Assuming you have a shared CORS setup

// Define the expected structure of the incoming questionnaire data
// Mirror the type defined in your frontend (QuestionnaireFormData)
interface QuestionnaireData {
  vibe: string; // Single selected vibe value
  regions: string[]; // Array of selected region values e.g., ['europe', 'asia']
  interests: string[]; // Array of selected interest values
  duration: number; // Single target duration number
  pace: string;         // Re-added
  budget_tier: string;  // Re-added
  timing: string;       // Re-added
  avoids: string[];     // Re-added
  // REMOVED: accommodation, timing, avoids as they aren't in the form output
}

// Define the structure of the data returned by the SQL function
interface ItineraryPreview {
  id: string; // uuid
  title: string;
  summary: string;
  featured_image: string | null;
  similarity: number;
}

// --- Main Function Handler ---
serve(async (req) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Ensure it's a POST request
    if (req.method !== 'POST') {
      throw new Error('Method Not Allowed: Only POST requests are accepted.');
    }

    // 3. Parse incoming JSON data
    const userData: QuestionnaireData = await req.json();
    console.log('Received user data:', userData); // Log received data (optional)

    // 4. Securely get environment variables
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!geminiApiKey || !supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required environment variables (GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)');
    }

    // 5. Initialize Gemini Client
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004"}); // Use the correct model name

    // 6. Construct Input Text for Embedding
    // Combine user answers into a descriptive string. Be descriptive!
    // Example - adjust based on how you want to weight different factors:
    const inputText = `
      Honeymoon Vibe: ${userData.vibe}.
      Preferred Regions: ${userData.regions.join(', ') || 'Any'}.
      Key Interests: ${userData.interests.join(', ') || 'None specified'}.
      Desired Pace: ${userData.pace || 'Balanced'}.
      Preferred Travel Time: ${userData.timing || 'Any'}.
      Things to Avoid: ${userData.avoids.join(', ') || 'None'}.
      Approximate Duration: ${userData.duration} days.
    `.trim().replace(/\s+/g, ' '); // Clean up whitespace
    // Note: Budget tier is less useful for semantic meaning, better used as a filter.

    console.log('Input text for embedding:', inputText); // Log text (optional)

    // 7. Generate Query Embedding using Gemini API
    const embeddingResult = await model.embedContent(inputText);
    const queryEmbedding = embeddingResult.embedding.values;
    // console.log('Generated query embedding:', queryEmbedding); // Careful logging vectors

    if (!queryEmbedding || queryEmbedding.length !== 768) {
        throw new Error(`Failed to generate valid embedding (expected 768 dimensions, got ${queryEmbedding?.length})`);
    }

    // 8. Prepare other filter parameters
    const target_duration = userData.duration;
    const preferred_regions = userData.regions.length > 0 ? userData.regions : null; // Pass null if empty

    // --- EDITED: Re-introduce Budget Tier to Max Price translation ---
    let max_price: number;
    switch (userData.budget_tier) {
      case 'tier1': // Premium (~$5k - $8k pp -> $10k - $16k total approx)
        max_price = 16000; // Set max for the tier
        break;
      case 'tier2': // Luxury (~$8k - $12k pp -> $16k - $24k total approx)
        max_price = 24000; // Set max for the tier
        break;
      case 'tier3': // Ultimate ($12k+ pp -> $24k+ total approx)
        max_price = 100000; // Set high limit as requested
        break;
      default:
        max_price = 100000; // Default to high limit if tier is unrecognized/missing
        console.warn(`Unrecognized or missing budget tier: '${userData.budget_tier}'. Defaulting to max price ${max_price}.`);
    }
    console.log(`Budget tier '${userData.budget_tier}' translated to max_price: ${max_price}`);

    console.log('Filter parameters:', { target_duration, preferred_regions, max_price });

    // 9. Create Supabase Client (Handles Auth by forwarding header)
    // IMPORTANT: Forward the Authorization header from the original request
    // This allows RLS policies based on the user to work correctly.
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 10. Call the Database RPC Function
    console.log('Calling RPC match_itineraries_filtered with params:', {
        // query_embedding: '[Vector data - not logged for brevity]', // Avoid logging full vector
        match_count: 3, // Request top 3 matches
        max_price: max_price,
        target_duration: target_duration,
        preferred_regions: preferred_regions
    });

    // Handle the case where no regions are preferred
    // If your SQL function requires a non-null array, you might need to adjust
    // or perhaps skip the region filter if preferred_regions is null/empty.
    // Here, we assume the SQL function can handle ANY(NULL) or you adjust the call.
    // A safer approach might be to only add the region filter if preferred_regions is not empty.
    // This example calls it regardless, assuming the SQL handles it or you adjust SQL.

    if (!preferred_regions || preferred_regions.length === 0) {
       console.warn("No preferred regions selected by user. Region filter might not apply depending on SQL function logic.");
       // If your SQL function *requires* a non-empty array, you might need to fetch ALL tours
       // or handle this case differently (e.g., return an error, or modify the RPC call).
       // For now, we proceed assuming the SQL function handles `ANY(NULL)` gracefully or you adjust it.
       // Or, fetch all regions if none selected? Depends on desired UX.
    }


    const { data: matches, error: rpcError } = await supabase
      .rpc('match_itineraries_filtered', {
        query_embedding: queryEmbedding,
        match_count: 3, // How many results to return
        max_price: max_price,
        target_duration: target_duration,
        // Pass null if no regions selected, assuming SQL function handles it
        // Or pass an array containing all possible regions if that's desired behaviour
        preferred_regions: preferred_regions
      });

    if (rpcError) {
      console.error('Supabase RPC Error:', rpcError);
      throw new Error(`Database query failed: ${rpcError.message}`);
    }

    console.log('RPC returned matches:', matches); // Log results (optional)

    // 11. Return the results
    return new Response(
      JSON.stringify(matches || []), // Return matches or empty array if null
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    // 12. Handle errors gracefully
    console.error('Function Error:', error);
    return new Response(
      JSON.stringify({
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          // Optionally include stack trace in development
          // stack: Deno.env.get('ENVIRONMENT') === 'development' ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Method Not Allowed') ? 405 : 500,
      }
    )
  }
})

/*
Helper function/file for CORS headers (e.g., supabase/functions/_shared/cors.ts)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust for production!
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
*/
