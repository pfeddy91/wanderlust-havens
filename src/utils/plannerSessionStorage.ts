import { ItineraryPreview, QuestionnaireAnswers } from '@/types/aiPlanner';

interface PlannerSessionData {
  recommendedTours: ItineraryPreview[];
  timestamp: number;
  questionnaireAnswers?: QuestionnaireAnswers;
}

const STORAGE_KEY = 'ai_planner_session';
const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const savePlannerSession = (
  recommendedTours: ItineraryPreview[],
  questionnaireAnswers?: QuestionnaireAnswers
): void => {
  const sessionData: PlannerSessionData = {
    recommendedTours,
    timestamp: Date.now(),
    questionnaireAnswers
  };
  
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Failed to save planner session to storage:', error);
  }
};

export const getPlannerSession = (): PlannerSessionData | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const sessionData: PlannerSessionData = JSON.parse(stored);
    
    // Check if session has expired
    const now = Date.now();
    if (now - sessionData.timestamp > EXPIRY_TIME) {
      clearPlannerSession();
      return null;
    }
    
    return sessionData;
  } catch (error) {
    console.error('Failed to retrieve planner session from storage:', error);
    clearPlannerSession(); // Clear corrupted data
    return null;
  }
};

export const clearPlannerSession = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear planner session from storage:', error);
  }
};

export const hasValidPlannerSession = (): boolean => {
  const session = getPlannerSession();
  return session !== null && session.recommendedTours.length > 0;
}; 