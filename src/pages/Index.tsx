import React from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import HoneymoonInfo from '@/components/HoneymoonInfo';
import RegionsGrid from '@/components/RegionsGrid';
import Explore from '@/components/Explore';
import Featured from '@/components/Featured';
import Footer from '@/components/Footer';
import AllDestinations from '@/components/AllDestinations';
import Collections from '@/components/Collections';
import AIPlanner from '@/components/AIPlanner';

const Index = () => {
  return (
    <div className="min-h-screen font-serif">
      <Header />
      <main>
        <Hero />
        <HoneymoonInfo />
        <div id="explore"> {/* Added id here for scrolling */}
          <RegionsGrid />
          <Explore />
          <Featured />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
