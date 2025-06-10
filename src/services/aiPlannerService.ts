import { QuestionnaireAnswers, ItineraryPreview, FullItinerary } from '@/types/aiPlanner'; // Adjust path
import { supabase } from '@/utils/supabaseClient'; // Assuming you have this helper
// Remove direct supabase import if using Edge Functions via fetch

// NEW: Progressive Relaxation + AI Fallback system
export const findMatchingItineraryWithGemini = async (answers: QuestionnaireAnswers): Promise<ItineraryPreview[] | null> => {
  console.log("Using 3-step progressive relaxation system with answers:", answers);

  try {
    // --- STEP 1: SQL Pre-filtering (Relaxed) ---
    console.log("STEP 1: SQL Pre-filtering...");
    const preFilteredTours = await performRelaxedSqlFiltering(answers);
    
    if (preFilteredTours.length === 0) {
      console.warn("Step 1 returned 0 tours. This should be very rare with relaxed filtering.");
    }
    
    console.log(`Step 1 completed: ${preFilteredTours.length} tours after pre-filtering`);

    // --- STEP 2: AI Recommendation on Pre-filtered Tours ---
    console.log("STEP 2: AI Recommendation on pre-filtered tours...");
    let aiRecommendations: string[] = [];
    
    if (preFilteredTours.length > 0) {
      aiRecommendations = await callAiForMainRecommendation(answers, preFilteredTours);
      console.log(`Step 2 completed: ${aiRecommendations.length} AI recommendations`);
    }

    // --- STEP 3: AI Fallback (if needed) ---
    if (aiRecommendations.length < 3) {
      console.log("STEP 3: AI Fallback - insufficient recommendations, querying all tours...");
      
      // Fetch all tours for fallback
      const { data: allTours, error: allToursError } = await supabase
        .from('tours')
        .select(`
          id, title, summary, duration, guide_price, collection, 
          activity, pace, callouts, best_season, geo_region, theme_tags,
          slug, countries, featured_image, recommendation_metric
        `);

      if (allToursError) throw allToursError;
      
      const neededCount = 3 - aiRecommendations.length;
      const fallbackRecommendations = await callAiForFallbackRecommendation(answers, allTours || [], neededCount, aiRecommendations);
      
      // Combine recommendations, prioritizing Step 2 results
      const combinedRecommendations = [
        ...aiRecommendations,
        ...fallbackRecommendations.filter(id => !aiRecommendations.includes(id))
      ].slice(0, 3);
      
      aiRecommendations = combinedRecommendations;
      console.log(`Step 3 completed: ${aiRecommendations.length} total recommendations after fallback`);
    }

    if (aiRecommendations.length === 0) {
      console.error("All steps failed to generate recommendations. Falling back to hardcoded logic.");
      return await findMatchingItinerary(answers); // Ultimate fallback
    }
    
    // --- STEP 4: Fetch Details & Construct Previews ---
    return await constructItineraryPreviews(aiRecommendations);

  } catch (error) {
    console.error("Error in progressive relaxation system:", error);
    return await findMatchingItinerary(answers); // Ultimate fallback
  }
};

// STEP 1: Relaxed SQL Pre-filtering
const performRelaxedSqlFiltering = async (answers: QuestionnaireAnswers) => {
    let toursQuery = supabase
      .from('tours')
      .select(`
        id, title, summary, duration, guide_price, collection, 
        activity, pace, callouts, best_season, geo_region, theme_tags,
      slug, countries, featured_image, recommendation_metric
      `);

  // Duration Filter (±3 days - unchanged)
    if (answers.duration) {
      toursQuery = toursQuery.gte('duration', answers.duration - 3);
      toursQuery = toursQuery.lte('duration', answers.duration + 3);
    }
    
  // Budget Filter (upper limit only, +25% relaxation)
  if (answers.budget_range && typeof answers.budget_range === 'number') {
    const relaxedMaxBudget = answers.budget_range * 1.25; // Increase upper bound by 25%
    toursQuery = toursQuery.lte('guide_price', relaxedMaxBudget);
  }
  
  // Pace Filter (±1 pace level)
  if (answers.pace && typeof answers.pace === 'string') {
    const paceOptions = getPaceOptions(answers.pace);
    toursQuery = toursQuery.in('pace', paceOptions);
  }

  // Timing Filter (±1 season)
  if (answers.timing && answers.timing.length > 0) {
    const expandedSeasons = getExpandedSeasons(answers.timing);
    // Build OR conditions for seasons
    const seasonConditions = expandedSeasons.map(season => `best_season->>${season}.eq.1`).join(',');
    toursQuery = toursQuery.or(seasonConditions);
  }
  
  // Region Filter (exact match for multiple regions, handle "unsure")
    if (answers.regions && answers.regions.length > 0 && !answers.regions.includes('no_preference')) {
      const regionMappings: { [key: string]: string } = {
        'europe': 'Europe', 'asia': 'Asia', 'africa': 'Africa', 
        'indian_ocean': 'Caribbean & Central America', 'north_america': 'North America & Hawaii',
        'latin_america_caribbean': 'South America', 'oceania': 'Oceania & Pacific'
      };
    
    const mappedRegions = answers.regions
      .filter(r => r !== 'unsure') // Filter out "unsure"
      .map(r => regionMappings[r])
      .filter(Boolean);
      
      if (mappedRegions.length > 0) {
        toursQuery = toursQuery.in('geo_region', mappedRegions);
      }
    }

    const { data: filteredTours, error: toursError } = await toursQuery;

    if (toursError) {
    console.error("Error during relaxed SQL filtering:", toursError);
      throw toursError;
    }

  return filteredTours || [];
};

// Helper: Get pace options with ±1 flexibility
const getPaceOptions = (selectedPace: string): string[] => {
  const paceMap: { [key: string]: string[] } = {
    'relaxed': ['relaxed', 'balanced'],
    'balanced': ['relaxed', 'balanced', 'active'],
    'active': ['balanced', 'active']
  };
  
  return paceMap[selectedPace] || [selectedPace];
};

// Helper: Get expanded seasons with ±1 flexibility
const getExpandedSeasons = (selectedSeasons: string[]): string[] => {
  const seasonOrder = ['winter', 'spring', 'summer', 'autumn'];
  const expandedSeasons = new Set<string>();
  
  selectedSeasons.forEach(season => {
    const index = seasonOrder.indexOf(season);
    if (index !== -1) {
      // Add the selected season
      expandedSeasons.add(season);
      // Add previous season
      const prevIndex = (index - 1 + seasonOrder.length) % seasonOrder.length;
      expandedSeasons.add(seasonOrder[prevIndex]);
      // Add next season
      const nextIndex = (index + 1) % seasonOrder.length;
      expandedSeasons.add(seasonOrder[nextIndex]);
    }
  });
  
  return Array.from(expandedSeasons);
};

// STEP 2: AI Recommendation on Pre-filtered Tours
const callAiForMainRecommendation = async (answers: QuestionnaireAnswers, tours: any[]): Promise<string[]> => {
  const prompt = buildMainRecommendationPrompt(answers, tours);
  
  try {
    console.log(`Calling Gemini for main recommendation with ${tours.length} pre-filtered tours...`);
    const apiKey = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, topK: 1, topP: 1 },
      })
    });
    
    if (!response.ok) throw new Error(`Gemini main recommendation error: ${response.status}`);
    const data = await response.json();
    const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!geminiResponse) throw new Error('No response text from Gemini for main recommendation');
    
    return parseGeminiResponse(geminiResponse);
  } catch (error) {
    console.error("Error in callAiForMainRecommendation:", error);
    return [];
  }
};

// STEP 3: AI Fallback Recommendation
const callAiForFallbackRecommendation = async (answers: QuestionnaireAnswers, allTours: any[], neededCount: number, excludeIds: string[]): Promise<string[]> => {
  const prompt = buildFallbackRecommendationPrompt(answers, allTours, neededCount, excludeIds);
  
  try {
    console.log(`Calling Gemini for fallback recommendation with all ${allTours.length} tours...`);
    const apiKey = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, topK: 1, topP: 1 }, // Slightly higher temperature for creativity
      })
    });
    
    if (!response.ok) throw new Error(`Gemini fallback recommendation error: ${response.status}`);
    const data = await response.json();
    const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!geminiResponse) throw new Error('No response text from Gemini for fallback recommendation');
    
    return parseGeminiResponse(geminiResponse);
  } catch (error) {
    console.error("Error in callAiForFallbackRecommendation:", error);
    return [];
  }
};

// Prompt builder for Step 2 (Main Recommendation)
const buildMainRecommendationPrompt = (answers: QuestionnaireAnswers, tours: any[]): string => {
  const budgetRangeText = answers.budget_range && typeof answers.budget_range === 'number'
    ? `Up to £${answers.budget_range.toLocaleString()}`
    : 'No budget specified';

  return `You are a luxury honeymoon travel expert. From the pre-filtered tours below, select the top 3 that best match this couple's preferences.

COUPLE'S PREFERENCES:
- Vibe/Themes: ${answers.vibe?.join(', ') || 'Not specified'}
- Interests/Activities: ${answers.interests?.join(', ') || 'Not specified'}
- Duration: ~${answers.duration} days
- Budget Range: ${budgetRangeText}
- Regions: ${answers.regions?.join(', ') || 'Not specified'}
- Pace: ${answers.pace || 'Not specified'}
- Timing/Season: ${answers.timing?.join(', ') || 'Not specified'}
- Things to Avoid: ${answers.avoids?.join(', ') || 'None specified'}
- Open-ended notes: ${answers.openEndedQuery || 'None'}

PRE-FILTERED TOURS (${tours.length} options):
${tours.map(tour => `
- ID: ${tour.id}
  Title: ${tour.title}
  Summary: ${tour.summary}
  Duration: ${tour.duration} days
  Guide Price: £${tour.guide_price?.toLocaleString() || 'Not specified'}
  Region: ${tour.geo_region}
  Pace: ${tour.pace}
  Recommendation Score: ${tour.recommendation_metric || 'N/A'}
  Theme Tags: ${JSON.stringify(tour.theme_tags)}
  Best Season: ${JSON.stringify(tour.best_season)}
  Activities: ${JSON.stringify(tour.activity)}
  Callouts: ${JSON.stringify(tour.callouts)}
`).join('\n')}

INSTRUCTIONS:
Consider all preference factors, especially vibe/themes, interests, and things to avoid. Prioritize tours with higher recommendation scores. Ensure variety in your selections unless the couple has very specific requirements.

Return ONLY the 3 tour IDs in order of best match, separated by commas.
Example: tour-id-1,tour-id-2,tour-id-3
Your recommendations:`;
};

// Prompt builder for Step 3 (Fallback Recommendation)
const buildFallbackRecommendationPrompt = (answers: QuestionnaireAnswers, allTours: any[], neededCount: number, excludeIds: string[]): string => {
  const budgetRangeText = answers.budget_range && typeof answers.budget_range === 'number'
    ? `Up to £${answers.budget_range.toLocaleString()}`
    : 'No budget specified';

  const excludeText = excludeIds.length > 0 
    ? `\n\nIMPORTANT: You must NOT recommend any of these tours that were already suggested: ${excludeIds.join(', ')}`
    : '';

  return `You are a luxury honeymoon travel expert. The couple's preferences didn't match our pre-filtered tours perfectly, so please select the ${neededCount} best options from our ENTIRE catalog that most closely match their needs.${excludeText}

COUPLE'S PREFERENCES:
- Vibe/Themes: ${answers.vibe?.join(', ') || 'Not specified'}
- Interests/Activities: ${answers.interests?.join(', ') || 'Not specified'}
- Duration: ~${answers.duration} days
- Budget Range: ${budgetRangeText}
- Regions: ${answers.regions?.join(', ') || 'Not specified'}
- Pace: ${answers.pace || 'Not specified'}
- Timing/Season: ${answers.timing?.join(', ') || 'Not specified'}
- Things to Avoid: ${answers.avoids?.join(', ') || 'None specified'}
- Open-ended notes: ${answers.openEndedQuery || 'None'}

ALL AVAILABLE TOURS (${allTours.length} total):
${allTours.slice(0, 50).map(tour => `
- ID: ${tour.id}
  Title: ${tour.title}
  Summary: ${tour.summary}
  Duration: ${tour.duration} days
  Guide Price: £${tour.guide_price?.toLocaleString() || 'Not specified'}
  Region: ${tour.geo_region}
  Pace: ${tour.pace}
  Recommendation Score: ${tour.recommendation_metric || 'N/A'}
  Theme Tags: ${JSON.stringify(tour.theme_tags)}
`).join('\n')}
[... and ${allTours.length - 50} more tours with similar details]

INSTRUCTIONS:
This is a fallback search, so be more flexible with requirements. Focus on the most important preferences (vibe, interests, major deal-breakers from "things to avoid"). 
${excludeIds.length > 0 ? 'Ensure all your recommendations are different from the excluded tours above AND different from each other.' : 'Ensure all your recommendations are different from each other.'}
It's better to recommend good alternatives than no recommendations.

Return ONLY the ${neededCount} tour IDs in order of best match, separated by commas.
Example: tour-id-1,tour-id-2,tour-id-3
Your recommendations:`;
};

// Helper to construct final itinerary previews
const constructItineraryPreviews = async (tourIds: string[]): Promise<ItineraryPreview[]> => {
  if (tourIds.length === 0) return [];

  // Fetch tour details
    const { data: finalTourData, error: finalTourError } = await supabase
        .from('tours')
    .select('*')
    .in('id', tourIds);

  if (finalTourError) throw finalTourError;
  if (!finalTourData) return [];

    // Extract all unique country UUIDs from the results
    const allCountryUUIDs = Array.from(new Set(
      finalTourData.flatMap(tour => tour.countries || [])
    ));

  // Fetch country names
    let countryNamesMap = new Map<string, string>();
    if (allCountryUUIDs.length > 0) {
      const { data: countriesData } = await supabase
        .from('countries')
        .select('id, name')
        .in('id', allCountryUUIDs);
      if (countriesData) {
        countriesData.forEach(c => countryNamesMap.set(c.id, c.name));
      }
    }
    
  // Construct previews in the order of recommended IDs
  const previews: ItineraryPreview[] = tourIds.map(tourId => {
    const tour = finalTourData.find(t => t.id === tourId);
    if (!tour) return null;
    
    const currentTourCountryNames = (tour.countries || [])
      .map(uuid => countryNamesMap.get(uuid))
      .filter(Boolean) as string[];
      
      return {
        id: tour.id,
      title: tour.title || `Honeymoon Special`,
        summary: tour.summary || `An unforgettable journey.`,
      featured_image: tour.featured_image || 'default_image_url',
        duration: tour.duration || 7,
        countries: currentTourCountryNames.length > 0 ? currentTourCountryNames : ['Various Locations'],
      slug: tour.slug || `tour-slug`,
        guide_price: tour.guide_price ? Number(tour.guide_price) : undefined,
      };
  }).filter(Boolean) as ItineraryPreview[];
    
  console.log("Returning progressive relaxation previews:", previews);
    return previews;
};

// NEW: Helper function for AI-powered exclusion
const getAiExclusions = async (openEndedQuery: string): Promise<{ countriesToAvoid: string[] }> => {
    const prompt = `Based on the user's text below, identify any specific countries they want to AVOID for their travel.
User's text: "${openEndedQuery}"
Respond ONLY with a JSON object like this: {"countries_to_avoid": ["Country1", "Country2"]}. If no countries are mentioned to avoid, return {"countries_to_avoid": []}.`;
    
    try {
        console.log("Calling Gemini for AI Exclusions...");
        const apiKey = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc'; // Replace with env var in production
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.0, response_mime_type: "application/json" },
            }),
        });
        if (!response.ok) throw new Error(`Gemini exclusion error: ${response.status}`);
        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(responseText);
        return { countriesToAvoid: parsed.countries_to_avoid || [] };
    } catch (error) {
        console.error("Error in getAiExclusions:", error);
        return { countriesToAvoid: [] };
    }
};

// NEW: Renamed helper function for the final AI ranking call
const callGeminiForRanking = async (survey: QuestionnaireAnswers, tours: any[]): Promise<string[]> => {
  const prompt = buildGeminiRankingPrompt(survey, tours); // We will create this new prompt builder
  try {
    console.log(`Calling Gemini for Ranking with ${tours.length} tours...`);
    const apiKey = 'AIzaSyBHQrWXW6ix1Me5ufjfc70b01W20hbgZKc';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, topK: 1, topP: 1 },
      })
    });
    if (!response.ok) throw new Error(`Gemini ranking error: ${response.status}`);
    const data = await response.json();
    const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!geminiResponse) throw new Error('No response text from Gemini for ranking');
    return parseGeminiResponse(geminiResponse);
  } catch (error) {
    console.error("Error in callGeminiForRanking:", error);
    return tours.slice(0, 3).map(t => t.id); // Fallback
  }
};

// NEW: Prompt builder for the final ranking step
const buildGeminiRankingPrompt = (survey: QuestionnaireAnswers, tours: any[]): string => {
  const budgetRangeText = survey.budget_range && typeof survey.budget_range === 'number'
    ? `Up to £${survey.budget_range.toLocaleString()}`
    : 'No budget specified';

  return `You are a honeymoon travel expert. From the pre-filtered list of tours below, select the top 3 that best match the couple's preferences.

COUPLE'S PREFERENCES:
- Vibe/Themes: ${survey.vibe.join(', ')}
- Duration: ~${survey.duration} days
- Budget Range: ${budgetRangeText}
- Regions: ${survey.regions.join(', ')}
- Interests: ${survey.interests.join(', ')}
- Pace: ${survey.pace?.join?.(', ') || survey.pace || 'Any'}
- Open-ended notes: ${survey.openEndedQuery || 'None'}

PRE-FILTERED TOURS:
${tours.map(tour => `
- ID: ${tour.id}
  Title: ${tour.title}
  Summary: ${tour.summary}
  Duration: ${tour.duration} days
  Guide Price: £${tour.guide_price?.toLocaleString() || 'Not specified'}
  Pace: ${tour.pace}
  Recommended: ${tour.recommendation_metric}
  Activity: ${tour.activity}
  Theme_tags: ${tour.theme_tags}
  `).join('\n')}

INSTRUCTIONS:
In selecting your top 3, please consider the following:
- Try to have some variety in the types of tours you recommend. For example, unless the couple asks for Greece, don't have 2 Greek tours. On the other side for bigger destinations like Italy, you can have 2 or 3 tours.
- Keep in mind the recommended metric (highest rating the better)
- Ensure tours fit within their budget limit
- Based on your judgement, try to recommend tours that are a good fit for the couple's preferences.
Return ONLY the 3 tour IDs in order of best match, separated by commas.
Example: tour-id-1,tour-id-2,tour-id-3
Your recommendations:`;
};

// Parse Gemini response to extract tour IDs
const parseGeminiResponse = (response: string): string[] => {
  try {
    // Clean up the response and extract tour IDs
    const cleanResponse = response.trim().replace(/['"`]/g, '');
    const tourIds = cleanResponse.split(',').map(id => id.trim());
    
    // Quick validation for UUID-like format (doesn't have to be perfect)
    const validIds = tourIds.filter(id => id.length > 10 && id.includes('-'));
    
    return validIds;
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    return [];
  }
};

// Helper function to call Gemini API (to be replaced by callGeminiForRanking)
const callGeminiForMatching = async (survey: QuestionnaireAnswers, tours: any[]): Promise<string[]> => {
  // This function is now DEPRECATED and will be replaced by callGeminiForRanking
  console.warn("callGeminiForMatching is deprecated. Use callGeminiForRanking.");
  return callGeminiForRanking(survey, tours);
};

// Build comprehensive matching prompt for Gemini (to be replaced by buildGeminiRankingPrompt)
const buildGeminiMatchingPrompt = (survey: QuestionnaireAnswers, tours: any[]): string => {
    // This function is now DEPRECATED and will be replaced by buildGeminiRankingPrompt
    console.warn("buildGeminiMatchingPrompt is deprecated. Use buildGeminiRankingPrompt.");
    return buildGeminiRankingPrompt(survey, tours);
};

// EXISTING HARDCODED FUNCTION (kept as fallback)
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
         duration: 10,
         countries: ['Italy'],
         slug: 'romantic-italian-escape',
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