import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AIPlanner from '@/components/AIPlanner';

const PlannerPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <AIPlanner />
      </main>
      <Footer />
    </div>
  );
};

export default PlannerPage; 