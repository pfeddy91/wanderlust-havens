import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AllCollections from '@/components/AllCollections';

const CollectionsPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <AllCollections />
      </main>
      <Footer />
    </div>
  );
};

export default CollectionsPage; 