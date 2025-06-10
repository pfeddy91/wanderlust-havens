import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlannerPhase, QuestionnaireAnswers } from '@/types/aiPlanner';
import QuestionnaireForm from './QuestionnaireForm';
import AiPlannerLoadingAnimation from './AiPlannerLoadingAnimation';
import { findMatchingItineraryWithGemini } from '@/services/aiPlannerService';
import { savePlannerSession } from '@/utils/plannerSessionStorage';
import { ArrowLeft } from 'lucide-react';

const AIPlannerOrchestrator = () => {
  const [currentPhase, setCurrentPhase] = useState<PlannerPhase>(PlannerPhase.QUESTIONNAIRE);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // --- Handler Functions ---

  const handleQuestionnaireSubmit = useCallback(async (answers: QuestionnaireAnswers) => {
    console.log("Questionnaire Submitted:", answers);
    setCurrentPhase(PlannerPhase.LOADING_PREVIEW);
    setError(null);
    
    try {
      const previewResult = await findMatchingItineraryWithGemini(answers);
      
      if (previewResult && previewResult.length > 0) {
        // Save to session storage
        savePlannerSession(previewResult, answers);
        
        // Navigate to results page
        navigate('/planner/results');
      } else {
        console.log("No matching previews returned or result was empty.");
        setError("We couldn't find a suitable match based on your preferences. Please try adjusting your answers.");
        setCurrentPhase(PlannerPhase.ERROR);
      }
    } catch (err: any) {
      console.error("Error finding matching itinerary:", err);
      setError(err.message || "An error occurred while searching for itineraries.");
      setCurrentPhase(PlannerPhase.ERROR);
    }
  }, [navigate]);

  const handleStartOver = () => {
    setError(null);
    setCurrentPhase(PlannerPhase.QUESTIONNAIRE);
  };

  // --- Render Logic ---

  const renderCurrentPhase = () => {
    switch (currentPhase) {
      case PlannerPhase.QUESTIONNAIRE:
        return <QuestionnaireForm onSubmit={handleQuestionnaireSubmit} />;

      case PlannerPhase.LOADING_PREVIEW:
        return (
          <div className="min-h-screen bg-background">
            <AiPlannerLoadingAnimation message="Finding your perfect honeymoon..." />
          </div>
        );

      case PlannerPhase.ERROR:
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="container mx-auto px-4 py-16 text-center max-w-md">
              <h2 className="text-2xl font-semibold text-destructive mb-4">Something went wrong</h2>
              <p className="text-destructive mb-6">{error || "An unexpected error occurred."}</p>
              <div className="space-y-3">
                <button
                  onClick={handleStartOver}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="container mx-auto px-4 py-8">
              <p>Unknown planner phase.</p>
            </div>
          </div>
        );
    }
  };

  return renderCurrentPhase();
};

export default AIPlannerOrchestrator; 