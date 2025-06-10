import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { hasValidPlannerSession } from '@/utils/plannerSessionStorage';

const FloatingBackButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if we came from planner and have valid session
    const fromPlanner = searchParams.get('from') === 'planner';
    const hasSession = hasValidPlannerSession();
    
    setIsVisible(fromPlanner && hasSession);
  }, [searchParams]);

  const handleBackToRecommendations = () => {
    navigate('/planner/results');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {/* Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-black text-white text-sm rounded-lg whitespace-nowrap shadow-lg">
            Head Back to Recommendations
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black"></div>
          </div>
        )}
        
        {/* Button */}
        <button
          onClick={handleBackToRecommendations}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center group"
          aria-label="Back to recommendations"
        >
          <ArrowLeft className="w-6 h-6 transition-transform group-hover:-translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};

export default FloatingBackButton; 