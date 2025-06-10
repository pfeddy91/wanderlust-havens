import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import PlannerLandingPage from './PlannerLandingPage';
import AIPlannerOrchestrator from './AIPlannerOrchestrator';
import AIPlannerResults from './AIPlannerResults';
import { clearPlannerSession } from '@/utils/plannerSessionStorage';

const AiPlannerContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Function to start the questionnaire flow by navigating
  const handleStartPlanning = () => {
    // Clear any potentially stale session storage before starting fresh
    clearPlannerSession();
    sessionStorage.removeItem('questionnaireStep');
    sessionStorage.removeItem('questionnaireAnswers');
    navigate('/planner/questionnaire');
  };

  // Determine if we are on the base /planner route
  const isLandingPage = location.pathname === '/planner' || location.pathname === '/planner/';

  return (
    <>
      {isLandingPage ? (
        <PlannerLandingPage onStart={handleStartPlanning} />
      ) : (
        <Routes>
          <Route path="questionnaire" element={<AIPlannerOrchestrator />} />
          <Route path="results" element={<AIPlannerResults />} />
          {/* Add other potential sub-routes of /planner here if needed */}
        </Routes>
      )}
    </>
  );
};

export default AiPlannerContainer; 