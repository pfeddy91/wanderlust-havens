import React from 'react';
import Header from '@/components/Header'; // Adjust path if needed
import Footer from '@/components/Footer'; // Adjust path if needed
import AllCollections from '@/components/AllCollections'; // Import the new component
import SEO from '@/components/SEO';

const AllCollectionsPage = () => {
  return (
    <div className="min-h-screen">
      <SEO 
        title="All Honeymoon Collections"
        description="Browse all our curated honeymoon collections. Whether you seek adventure, romance, or relaxation, find a travel style that's perfect for you."
        keywords="Honeymoon collections, travel styles, adventure honeymoons, romantic getaways, cultural tours, all collections"
        canonicalUrl="/collections"
      />
      <Header />
      <main className="pt-20"> {/* Adjust padding if needed */}
        <AllCollections />
      </main>
      <Footer />
    </div>
  );
};

export default AllCollectionsPage; 