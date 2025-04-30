import React from 'react';
import Header from '@/components/Header'; // Adjust path if needed
import Footer from '@/components/Footer'; // Adjust path if needed
import AllCollections from '@/components/AllCollections'; // Import the new component

const AllCollectionsPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20"> {/* Adjust padding if needed */}
        <AllCollections />
      </main>
      <Footer />
    </div>
  );
};

export default AllCollectionsPage; 