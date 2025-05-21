import React from 'react';
import Hero from '@/components/Hero';
import HoneymoonInfo from '@/components/HoneymoonInfo';
import RegionsGrid from '@/components/RegionsGrid';
import Explore from '@/components/ExploreV2';
import Featured from '@/components/FeaturedV2';
import AllDestinations from '@/components/AllDestinations';
import Collections from '@/components/Collections';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <main>
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
