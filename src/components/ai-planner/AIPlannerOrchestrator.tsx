import React, { useState, useCallback } from 'react';
import { PlannerPhase, QuestionnaireAnswers, ItineraryPreview, FullItinerary } from '@/types/aiPlanner'; // Adjust path
import QuestionnaireForm from './QuestionnaireForm';
import PreviewDisplay from './PreviewDisplay';
import FullItineraryDisplay from './FullItineraryDisplay';
import { Loader2 } from 'lucide-react'; // Using lucide for loading spinner

// Import the service functions (placeholders for now)
import { findMatchingItinerary, getUnlockedItinerary } from '@/services/aiPlannerService'; // Adjust path

const AIPlannerOrchestrator = () => {
  const [currentPhase, setCurrentPhase] = useState<PlannerPhase>(PlannerPhase.QUESTIONNAIRE);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireAnswers | null>(null);
  const [previewData, setPreviewData] = useState<ItineraryPreview | null>(null);
  const [fullItineraryData, setFullItineraryData] = useState<FullItinerary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Handler Functions ---

  const handleQuestionnaireSubmit = useCallback(async (answers: QuestionnaireAnswers) => {
    console.log("Questionnaire Submitted:", answers);
    setQuestionnaireData(answers);
    setCurrentPhase(PlannerPhase.LOADING_PREVIEW);
    setError(null);
    try {
      // TODO: Implement actual API call to findMatchingItinerary (Supabase Edge Function)
      const previewResult = await findMatchingItinerary(answers); // Call the service
      if (previewResult) {
        setPreviewData(previewResult);
        setCurrentPhase(PlannerPhase.PREVIEW);
      } else {
        throw new Error("Could not find a matching itinerary.");
      }
    } catch (err: any) {
      console.error("Error finding matching itinerary:", err);
      setError(err.message || "An error occurred while searching for itineraries.");
      setCurrentPhase(PlannerPhase.ERROR); // Go to error state
    }
  }, []);

  const handleUnlockItinerary = useCallback(async () => {
    console.log("Unlock Itinerary Requested for:", previewData?.id);
    if (!previewData) return;

    // TODO: Implement payment flow here (Steps 5-9 from ai-planner.mdc)
    // This likely involves calling a createPaymentIntent function,
    // using Stripe.js, and handling the webhook confirmation.
    // For now, we'll simulate success and fetch the full itinerary.

    console.log("Simulating successful payment...");
    setCurrentPhase(PlannerPhase.LOADING_FULL);
    setError(null);

    try {
      // TODO: Implement actual API call to getUnlockedItinerary (Supabase Function)
      // This function should verify payment status in DB before returning data.
      const fullResult = await getUnlockedItinerary(previewData.id); // Call the service
      if (fullResult) {
        setFullItineraryData(fullResult);
        setCurrentPhase(PlannerPhase.FULL_ITINERARY);
      } else {
        throw new Error("Could not retrieve the full itinerary after payment.");
      }
    } catch (err: any) {
      console.error("Error fetching full itinerary:", err);
      setError(err.message || "An error occurred while retrieving the full itinerary.");
      setCurrentPhase(PlannerPhase.ERROR); // Go back to error state
    }
  }, [previewData]);

  // --- Render Logic ---

  const renderCurrentPhase = () => {
    switch (currentPhase) {
      case PlannerPhase.QUESTIONNAIRE:
        return <QuestionnaireForm onSubmit={handleQuestionnaireSubmit} />;

      case PlannerPhase.LOADING_PREVIEW:
      case PlannerPhase.LOADING_FULL:
        return (
          <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center h-[80vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              {currentPhase === PlannerPhase.LOADING_PREVIEW
                ? "Finding your perfect honeymoon..."
                : "Unlocking your itinerary..."}
            </p>
          </div>
        );

      case PlannerPhase.PREVIEW:
        if (!previewData) return <div className="container mx-auto px-4 py-8"><p>Error: Preview data missing.</p></div>;
        return <PreviewDisplay itineraryPreview={previewData} onUnlock={handleUnlockItinerary} />;

      case PlannerPhase.FULL_ITINERARY:
        if (!fullItineraryData) return <div className="container mx-auto px-4 py-8"><p>Error: Full itinerary data missing.</p></div>;
        // TODO: Add export functionality later
        return <FullItineraryDisplay fullItinerary={fullItineraryData} />;

      case PlannerPhase.ERROR:
         return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-semibold text-destructive mb-4">Something went wrong</h2>
                <p className="text-destructive mb-6">{error || "An unexpected error occurred."}</p>
                <button
                    onClick={() => setCurrentPhase(PlannerPhase.QUESTIONNAIRE)} // Option to retry
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    Start Over
                </button>
            </div>
        );

      // TODO: Add cases for PAYMENT, EXPORT phases later
      default:
        return <div className="container mx-auto px-4 py-8"><p>Unknown planner phase.</p></div>;
    }
  };

  return renderCurrentPhase();
};

export default AIPlannerOrchestrator; 