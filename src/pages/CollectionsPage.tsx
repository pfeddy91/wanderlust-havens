import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Collections from '@/components/Collections';

const CollectionsPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <Collections />
      </main>
      <Footer />
    </div>
  );
};

export default CollectionsPage; 