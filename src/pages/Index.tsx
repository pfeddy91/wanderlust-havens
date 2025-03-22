
import React from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Explore from '@/components/Explore';
import Featured from '@/components/Featured';
import Vibes from '@/components/Vibes';
import AiPlanner from '@/components/AiPlanner';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Explore />
      <Featured />
      <Vibes />
      <AiPlanner />
      <Footer />
    </div>
  );
};

export default Index;
