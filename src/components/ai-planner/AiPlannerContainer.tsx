import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import PlannerLandingPage from './PlannerLandingPage';
import AIPlannerOrchestrator from './AIPlannerOrchestrator';

const AiPlannerContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Function to start the questionnaire flow by navigating
  const handleStartPlanning = () => {
    // Clear any potentially stale session storage before starting fresh
    sessionStorage.removeItem('questionnaireStep');
    sessionStorage.removeItem('questionnaireAnswers');
    navigate('/planner/questionnaire'); // Navigate to the dedicated route
  };

  // Determine if we are on the base /planner route
  const isLandingPage = location.pathname === '/planner' || location.pathname === '/planner/';

  return (
    <>
      {isLandingPage ? (
        <PlannerLandingPage onStart={handleStartPlanning} />
      ) : (
        // Use Routes to render the orchestrator only on the questionnaire path
        <Routes>
             <Route path="questionnaire" element={<AIPlannerOrchestrator />} />
             {/* Add other potential sub-routes of /planner here if needed */}
        </Routes>
      )}
    </>
  );
};

export default AiPlannerContainer; 