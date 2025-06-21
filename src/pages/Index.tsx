import React from 'react';
import Hero from '@/components/Hero';
import HoneymoonInfo from '@/components/HoneymoonInfo';
import RegionsGrid from '@/components/RegionsGrid';
import Explore from '@/components/ExploreV2';
import Featured from '@/components/FeaturedV2';
import AllDestinations from '@/components/AllDestinations';
import Collections from '@/components/Collections';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

const Index = () => {
  return (
    <main>
      <SEO 
        title="Luxury Honeymoon Planner & Curated Travel"
        description="Design your unforgettable luxury honeymoon with Moons. Explore curated travel packages or use our AI-powered planner to create a bespoke romantic getaway."
        canonicalUrl="/"
      />
      <Hero />
      <HoneymoonInfo />
      <div id="explore">
        <Explore />
        <RegionsGrid />
        <Featured />
      </div>
    </main>
  );
};

export default Index;
