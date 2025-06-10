import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ItineraryPreview } from '@/types/aiPlanner';
import { getPlannerSession } from '@/utils/plannerSessionStorage';
import PreviewDisplay from './PreviewDisplay';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HoneymoonInfo from '@/components/HoneymoonInfo';
import { ArrowLeft } from 'lucide-react';

const AIPlannerResults: React.FC = () => {
  const [recommendedTours, setRecommendedTours] = useState<ItineraryPreview[] | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const sessionData = getPlannerSession();
    
    if (!sessionData || !sessionData.recommendedTours || sessionData.recommendedTours.length === 0) {
      // No valid session data, redirect to questionnaire
      navigate('/planner/questionnaire', { replace: true });
      return;
    }
    
    setRecommendedTours(sessionData.recommendedTours);
    setLoading(false);
  }, [navigate]);

  const handleStartOver = () => {
    navigate('/planner/questionnaire');
  };

  const handleSpeakToExpert = () => {
    navigate('/contact');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your recommendations...</p>
        </div>
      </div>
    );
  }

  if (!recommendedTours || recommendedTours.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-semibold mb-4">No Recommendations Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find any matching tours. Please try the questionnaire again with different preferences.
          </p>
          <button
            onClick={handleStartOver}
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#fcfaf5' }}>
      <Header hideNavigation={true} />
      <div className="container mx-auto py-10 px-4 pt-28">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-serif">
            Your Perfect Honeymoon Matches
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Based on your preferences, we've found these exceptional experiences crafted just for you. Remember, our travel advisors will be able to fully customize any of these tours to your liking. 
          </p>
        </div>

        {/* Results Grid */}
        <div className="flex flex-wrap justify-center gap-6 xl:gap-8 mb-12">
          {recommendedTours.map((preview) => (
            <PreviewDisplay
              key={preview.id}
              itineraryPreview={preview}
            />
          ))}
        </div>
      </div>

      {/* Honeymoon Info Section */}
      <HoneymoonInfo />

      {/* Floating Actions - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex gap-3">
          <button
            onClick={handleStartOver}
            className="inline-flex items-center justify-center px-6 py-3 border border-muted-foreground text-muted-foreground bg-white rounded-lg hover:bg-muted transition-colors text-lg font-serif font-normal"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Start New Search
          </button>
          <button
            onClick={handleSpeakToExpert}
            className="inline-flex items-center justify-center px-6 py-3 text-white rounded-lg transition-colors text-lg font-serif font-normal hover:opacity-90"
            style={{ backgroundColor: '#00395c' }}
          >
            Speak to An Expert
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AIPlannerResults; 