// supabase/functions/findMatchingItinerary/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3'; // Or your chosen version
import { corsHeaders } from '../_shared/cors.ts';

const MY_DEPLOY_VERSION = "findMatchingItinerary_v3.0_fresh_deploy_test_XYZ"; // Make this unique!
console.log(`[VERSION CHECK] Function Loaded: ${MY_DEPLOY_VERSION}`);

// --- Define types based on your questionnaire output and SQL return ---
interface UserData {
  vibe?: string[];         // e.g., ['active'] -> p_vibe
  regions?: string[];      // e.g., ['oceania'] -> p_regions
  interests?: string[];    // e.g., ['luxury_spa'] -> p_interests
  pace?: string[];         // e.g., ['balanced'] -> p_pace (will take first element)
  timing?: string[];       // e.g., ['summer', 'spring'] -> p_travel_seasons
  avoids?: string[];       // e.g., ['avoid_hiking'] -> p_avoid_tags
  duration?: number;       // e.g., 13 -> p_target_duration
  budget_tier?: 'tier1' | 'tier2' | 'tier3'; // -> p_max_price
  openEndedQuery?: string; // For Phase 2 vector search
}

interface TourFromSQL {
  id: string;
  title: string;
  summary: string;
  featured_image: string;
  embedding: number[]; // SQL returns vector(3072) as number[]
  activity: string[] | null; // Assuming jsonb stores an array of strings
  theme_tags: string[] | null; // Assuming jsonb stores an array of strings
  callouts?: string[] | null;       // e.g., ['avoid_hiking'] -> p_avoid_tags
  recommendation_metric: number | null;
  guide_price: number;
  duration: number;
}

interface ScoredTour extends TourFromSQL {
  sql_match_strength_score: number;
  vector_similarity_score: number;
  curated_score: number;
  final_weighted_score: number;
}

// --- Helper: Normalize scores (0-1 range) ---
function normalize(value: number, min: number, max: number): number {
  if (max === min) return value === min ? 0 : 1; // Handle single-point scale or avoid division by zero
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method Not Allowed: Only POST requests are accepted.');
    }

    const userData = (await req.json()) as UserData;
    console.log('Parsed user data:', userData);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!geminiApiKey || !supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    // --- Phase 1: Structured Filtering ---
    // Prepare parameters for the SQL RPC call
    let p_max_price;
    switch (userData.budget_tier) {
      case 'tier1': p_max_price = 16000; break;
      case 'tier2': p_max_price = 24000; break;
      case 'tier3': p_max_price = 100000; break; // Or a very high number
      default: p_max_price = 1000000; // Default to a high limit if tier is missing/unrecognized
    }

    const p_target_duration = userData.duration ?? 10; // Default duration if not provided

    // Pace: SQL expects a single text value. Take the first if array, else null.
    const p_pace = userData.pace && userData.pace.length > 0 ? userData.pace[0] : null;

    const rpcParams = {
      p_max_price: p_max_price,
      p_target_duration: p_target_duration,
      p_regions: userData.regions && userData.regions.length > 0 ? userData.regions : null,
      p_interests: userData.interests && userData.interests.length > 0 ? userData.interests : null,
      p_vibe: userData.vibe && userData.vibe.length > 0 ? userData.vibe : null,
      p_pace: p_pace,
      p_avoid_tags: userData.avoids && userData.avoids.length > 0 ? userData.avoids : null,
      p_travel_seasons: userData.timing && userData.timing.length > 0 ? userData.timing : null,
    };
    console.log("Calling RPC 'get_candidate_tours_by_structured_filters' with params:", rpcParams);

    const { data: candidateTours, error: rpcError } = await supabase.rpc(
      'get_candidate_tours_by_structured_filters', // Use the name from CREATE OR REPLACE
      rpcParams
    ) as { data: TourFromSQL[] | null; error: any };

    if (rpcError) {
      console.error('Supabase RPC Error (get_candidate_tours_by_structured_filters):', rpcError);
      throw new Error(`Database query failed: ${rpcError.message} (Details: ${rpcError.details})`);
    }

    if (!candidateTours || candidateTours.length === 0) {
      console.log('No tours found matching structured criteria.');
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }
    console.log(`Found ${candidateTours.length} candidates after Phase 1 filtering.`);


    // --- Phase 2: Open-Ended Refinement (Vector Search) ---
    let queryEmbedding: number[] = [];
    // !!! CRITICAL WARNING FOR EMBEDDING DIMENSIONS !!!
    // Your SQL function expects/returns tour embeddings of 3072 dimensions.
    // The 'text-embedding-004' model produces 768 dimensions.
    // These MUST MATCH for cosine similarity to be valid.
    // You either need to:
    //   1. Change your tour.embedding in DB and SQL function to vector(768).
    //   2. Use a Gemini model for queryEmbedding that produces 3072 dimensions.
    // The following code ASSUMES dimensions will match.
    const EXPECTED_EMBEDDING_DIMENSION = 3072; // Change this if your DB/SQL uses 768

    if (userData.openEndedQuery && userData.openEndedQuery.trim() !== "") {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      // Ensure you use a model that outputs EXPECTED_EMBEDDING_DIMENSION
      // "text-embedding-004" is 768. If you need 3072, you'll need a different model or approach.
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" }); // This is 768-dim
      try {
        const embeddingResult = await model.embedContent(userData.openEndedQuery);
        queryEmbedding = embeddingResult.embedding.values;
        if (!queryEmbedding || queryEmbedding.length !== 768) { // Check against actual model output
            console.warn(`Generated query embedding has ${queryEmbedding?.length} dimensions, but 'text-embedding-004' should be 768. Vector search might be unreliable if dimensions don't match tour embeddings (${EXPECTED_EMBEDDING_DIMENSION}).`);
            // If you absolutely must proceed and tour embeddings are different, this similarity score will be meaningless.
            // Consider padding or truncation if desperate, but it's not ideal. Best to match dimensions.
             queryEmbedding = Array(EXPECTED_EMBEDDING_DIMENSION).fill(0); // Fallback, but this makes similarity 0
        }
         // If text-embedding-004 (768) is used and DB is 3072, this is a PROBLEM.
         // For now, let's assume if a query embedding IS generated, we try to use it,
         // but highlight that the cosine similarity step will be flawed if dimensions mismatch.
      } catch (e) {
        console.error("Error generating query embedding:", e);
        queryEmbedding = Array(EXPECTED_EMBEDDING_DIMENSION).fill(0); // Fallback
      }
    } else {
      console.log("No openEndedQuery provided, vector similarity will be effectively neutral (0 or low).");
      queryEmbedding = Array(EXPECTED_EMBEDDING_DIMENSION).fill(0);
    }
    // Temporary check for dimension mismatch - REMOVE OR ADJUST
    if (queryEmbedding.length > 0 && queryEmbedding.length !== EXPECTED_EMBEDDING_DIMENSION) {
        console.warn(`CRITICAL: Query embedding dimension (${queryEmbedding.length}) does not match expected tour embedding dimension (${EXPECTED_EMB}); vector similarity will be incorrect.`);
        // To prevent errors in dot product, but this makes scores meaningless:
        // queryEmbedding = Array(EXPECTED_EMBEDDING_DIMENSION).fill(0);
    }


    const scoredTours: ScoredTour[] = [];

    for (const tour of candidateTours) {
      // Calculate vector similarity (cosine similarity)
      let vectorSimilarity = 0;
      if (queryEmbedding.length === EXPECTED_EMBEDDING_DIMENSION && tour.embedding && tour.embedding.length === EXPECTED_EMBEDDING_DIMENSION) {
          let dotProduct = 0;
          let normA = 0;
          let normB = 0;
          for (let i = 0; i < queryEmbedding.length; i++) {
              dotProduct += (queryEmbedding[i] || 0) * (tour.embedding[i] || 0);
              normA += (queryEmbedding[i] || 0) * (queryEmbedding[i] || 0);
              normB += (tour.embedding[i] || 0) * (tour.embedding[i] || 0);
          }
          if (normA === 0 || normB === 0) {
            vectorSimilarity = 0;
          } else {
            vectorSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
          }
          vectorSimilarity = Math.max(0, Math.min(1, vectorSimilarity)); // Clamp
      } else if (queryEmbedding.length > 0) { // Only log if there was an attempt to get a query embedding
          console.warn(`Skipping vector similarity for tour ${tour.id} due to dimension mismatch or missing embeddings. Query: ${queryEmbedding.length}, Tour: ${tour.embedding?.length}, Expected: ${EXPECTED_EMBEDDING_DIMENSION}`);
      }


      // --- Phase 3: Weighted Scoring and Ranking ---
      // 3a. Calculate SQL Match Strength
      let matchedInterests = 0;
      if (userData.interests && tour.activity) { // tour.activity is jsonb, assumed string[]
        userData.interests.forEach(interest => {
          if ((tour.activity as string[]).includes(interest)) matchedInterests++;
        });
      }
      let matchedVibes = 0;
      if (userData.vibe && tour.theme_tags) { // tour.theme_tags is jsonb, assumed string[]
        userData.vibe.forEach(vibe => {
          if ((tour.theme_tags as string[]).includes(vibe)) matchedVibes++;
        });
      }
      const totalPossibleUserTags = (userData.interests?.length || 0) + (userData.vibe?.length || 0);
      const sqlMatchStrengthScore = totalPossibleUserTags > 0 ?
        normalize(matchedInterests + matchedVibes, 0, totalPossibleUserTags) : 0.5; // 0.5 if no preference

      // 3b. Normalize Curated Recommendation Metric (1-5 to 0-1)
      const curatedScore = tour.recommendation_metric ? normalize(tour.recommendation_metric, 1, 5) : 0.5; // Neutral if no metric

      // 3c. Define Weights (Tune these based on importance)
      const w_sql_strength = 0.4;
      const w_vector_similarity = (userData.openEndedQuery && userData.openEndedQuery.trim() !== "") ? 0.3 : 0; // Only weight if query exists
      const w_curated = 0.3 + ((userData.openEndedQuery && userData.openEndedQuery.trim() !== "") ? 0 : 0.3); // Boost curated if no vector search

      // 3d. Calculate Final Weighted Score
      const finalWeightedScore =
        (w_sql_strength * sqlMatchStrengthScore) +
        (w_vector_similarity * vectorSimilarity) +
        (w_curated * curatedScore);

      scoredTours.push({
        ...tour,
        sql_match_strength_score: sqlMatchStrengthScore,
        vector_similarity_score: vectorSimilarity,
        curated_score: curatedScore,
        final_weighted_score: finalWeightedScore,
      });
    }

    // Sort by final weighted score in descending order
    scoredTours.sort((a, b) => b.final_weighted_score - a.final_weighted_score);

    // Return the top N matches (e.g., top 3)
    const topNMatches = 3;
    const finalResults = scoredTours.slice(0, topNMatches);

    console.log(`Returning ${finalResults.length} top matches.`);
    return new Response(JSON.stringify(finalResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('Function Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    // Include more details if available, e.g., from rpcError
    const errorDetails = error.details || (error.cause as any)?.details;
    const fullMessage = errorDetails ? `${errorMessage} (Details: ${errorDetails})` : errorMessage;

    return new Response(
      JSON.stringify({ message: fullMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error.message.includes('Method Not Allowed') ? 405 : 500 }
    );
  }
});