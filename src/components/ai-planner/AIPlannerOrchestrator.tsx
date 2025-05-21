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
  const [previewData, setPreviewData] = useState<ItineraryPreview[] | null>(null);
  const [fullItineraryData, setFullItineraryData] = useState<FullItinerary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Handler Functions ---

  const handleQuestionnaireSubmit = useCallback(async (answers: QuestionnaireAnswers) => {
    console.log("Questionnaire Submitted:", answers);
    setQuestionnaireData(answers);
    setCurrentPhase(PlannerPhase.LOADING_PREVIEW);
    setError(null);
    try {
      const previewResult = await findMatchingItinerary(answers); // Call the service
      if (previewResult && previewResult.length > 0) {
        setPreviewData(previewResult);
        setCurrentPhase(PlannerPhase.PREVIEW);
      } else {
        console.log("No matching previews returned or result was empty.");
        setError("We couldn't find a suitable match based on your preferences. Please try adjusting your answers.");
        setCurrentPhase(PlannerPhase.ERROR);
      }
    } catch (err: any) {
      console.error("Error finding matching itinerary:", err);
      setError(err.message || "An error occurred while searching for itineraries.");
      setCurrentPhase(PlannerPhase.ERROR); // Go to error state
    }
  }, []);

  // The handleUnlockItinerary might be deprecated or changed if PreviewDisplay handles navigation directly.
  // For now, let's keep it but it won't be called by PreviewDisplay in the new setup.
  const handleUnlockItinerary_DEPRECATED = useCallback(async (itineraryId: string) => {
    console.log("Unlock Itinerary Requested for:", itineraryId);
    if (!itineraryId) return;
    console.log("Simulating successful payment...");
    setCurrentPhase(PlannerPhase.LOADING_FULL);
    setError(null);
    try {
      const fullResult = await getUnlockedItinerary(itineraryId);
      if (fullResult) {
        setFullItineraryData(fullResult);
        setCurrentPhase(PlannerPhase.FULL_ITINERARY);
      } else {
        throw new Error("Could not retrieve the full itinerary after payment.");
      }
    } catch (err: any) {
      console.error("Error fetching full itinerary:", err);
      setError(err.message || "An error occurred while retrieving the full itinerary.");
      setCurrentPhase(PlannerPhase.ERROR);
    }
  }, []);

  // --- Render Logic ---

  const renderCurrentPhase = () => {
    switch (currentPhase) {
      case PlannerPhase.QUESTIONNAIRE:
        return <QuestionnaireForm onSubmit={handleQuestionnaireSubmit} />;

      case PlannerPhase.LOADING_PREVIEW:
      case PlannerPhase.LOADING_FULL:
        return (
          <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              {currentPhase === PlannerPhase.LOADING_PREVIEW
                ? "Finding your perfect honeymoon..."
                : "Unlocking your itinerary..."}
            </p>
          </div>
        );

      case PlannerPhase.PREVIEW:
        if (!previewData || previewData.length === 0) {
          return <div className="container mx-auto px-4 py-8"><p>Error: Preview data missing or empty.</p></div>;
        }
        return (
          <div className="container mx-auto py-10 px-4">
            <h2 className="text-3xl font-semibold text-center mb-8 font-serif">We found these top matches for you:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
              {previewData.map((preview) => (
                <PreviewDisplay
                  key={preview.id}
                  itineraryPreview={preview}
                />
              ))}
            </div>
          </div>
        );

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
                    onClick={() => {
                        setError(null);
                        setCurrentPhase(PlannerPhase.QUESTIONNAIRE);
                    }}
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