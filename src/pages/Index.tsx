
import React from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import RegionsGrid from '@/components/RegionsGrid';
import Explore from '@/components/Explore';
import Featured from '@/components/Featured';
import Vibes from '@/components/Vibes';
import AiPlanner from '@/components/AiPlanner';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen font-serif">
      <Header />
      <Hero />
      <div id="explore"> {/* Added id here for scrolling */}
        <RegionsGrid />
        <Explore />
        <Featured />
        <Vibes />
        <AiPlanner />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
