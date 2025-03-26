import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AllDestinations from '@/components/AllDestinations';

const AllDestinationsPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <AllDestinations />
      </main>
      <Footer />
    </div>
  );
};

export default AllDestinationsPage; 