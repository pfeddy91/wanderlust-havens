import React from 'react';
// import Header from '@/components/Header';
// import Footer from '@/components/Footer';
// import AIPlanner from '@/components/AIPlanner';
import AiPlannerContainer from '@/components/ai-planner/AiPlannerContainer';
import SEO from '@/components/SEO';

const PlannerPage = () => {
  return (
    <>
      <SEO
        title="AI Honeymoon Planner"
        description="Use our AI-powered bespoke planner to design your perfect honeymoon. Answer a few questions and get a personalized itinerary in minutes."
        keywords="AI honeymoon planner, bespoke travel planner, personalized honeymoon, custom itinerary, AI travel"
        canonicalUrl="/planner"
      />
      <AiPlannerContainer />
    </>
  );
};

export default PlannerPage; 