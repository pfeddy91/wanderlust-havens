import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AllDestinations from '@/components/AllDestinations';
import SEO from '@/components/SEO';

const AllDestinationsPage = () => {
  return (
    <div className="min-h-screen">
      <SEO 
        title="All Honeymoon Destinations"
        description="Explore all our luxury honeymoon destinations. From tropical paradises to cultural landmarks, find the perfect setting for your romantic getaway."
        keywords="All honeymoon destinations, luxury travel, honeymoon locations, romantic destinations"
        canonicalUrl="/destinations"
      />
      <Header />
      <main className="pt-20">
        <AllDestinations />
      </main>
      <Footer />
    </div>
  );
};

export default AllDestinationsPage; 