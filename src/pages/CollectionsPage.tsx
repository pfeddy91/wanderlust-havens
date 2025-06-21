import React from 'react';
import AllCollections from '@/components/AllCollections';
import SEO from '@/components/SEO';

const CollectionsPage = () => {
  return (
    <main className="pt-20">
      <SEO 
        title="Honeymoon Collections"
        description="Explore our curated honeymoon collections, designed for every travel style. Find adventurous, romantic, and cultural immersion packages."
        keywords="Honeymoon collections, travel styles, adventure honeymoons, romantic getaways, cultural tours"
        canonicalUrl="/collections"
      />
      <AllCollections />
    </main>
  );
};

export default CollectionsPage; 