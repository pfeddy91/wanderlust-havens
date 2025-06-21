import React from 'react';
// import Header from '@/components/Header';
// import Footer from '@/components/Footer';
// import AIPlanner from '@/components/AIPlanner';
import { PlannerSEO } from '@/components/SEO';
import AiPlannerContainer from '@/components/ai-planner/AiPlannerContainer';

const PlannerPage = () => {
  return (
    <main className="pt-20">
      <PlannerSEO />
      <AiPlannerContainer />
    </main>
  );
};

export default PlannerPage; 