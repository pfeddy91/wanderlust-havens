import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Index from '@/pages/Index';
import Destination from '@/pages/Destination';
import TourDetail from '@/pages/TourDetail';
import CollectionDetailPage from '@/pages/CollectionDetailPage';
import ContactUs from '@/pages/ContactUs';
import PlannerPage from '@/pages/PlannerPage';
import AllDestinationsPage from '@/pages/AllDestinationsPage';
import CollectionsPage from '@/pages/CollectionsPage';
import CountryPage from '@/pages/CountryPage';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/destinations" element={<AllDestinationsPage />} />
        <Route path="/destinations/:countrySlug" element={<CountryPage />} />
        <Route path="/tours/:tourSlug" element={<TourDetail />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:collectionSlug" element={<CollectionDetailPage />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/planner" element={<PlannerPage />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
