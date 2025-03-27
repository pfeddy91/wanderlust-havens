import React, { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Index from "../pages/Index";
import Destination from "../pages/Destination";
import TourDetail from "../pages/TourDetail";
import NotFound from "../pages/NotFound";
import AllDestinationsPage from "../pages/AllDestinationsPage";
import CollectionsPage from "../pages/CollectionsPage";
import CollectionDetailPage from "../pages/CollectionDetailPage";
import PlannerPage from "../pages/PlannerPage";
import RegionCountriesPage from "../pages/RegionCountriesPage";

// Simple scroll restoration function
function ScrollRestoration() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

export const AppRoutes = () => {
  const navigate = useNavigate(); // This is now inside Router context

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // If it's an internal link, ensure it doesn't open in a new tab
      if (e.target && (e.target as HTMLElement).closest('a')) {
        const link = (e.target as HTMLElement).closest('a');
        const href = link?.getAttribute('href');
        
        // Only handle internal links (those starting with / or #)
        if (href && (href.startsWith('/') || href.startsWith('#'))) {
          e.preventDefault();
          navigate(href);
        }
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [navigate]);

  return (
    <>
      <ScrollRestoration />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/destinations" element={<AllDestinationsPage />} />
        <Route path="/destinations/:slug" element={<Destination />} />
        <Route path="/tours/:slug" element={<TourDetail />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:slug" element={<CollectionDetailPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/about" element={<NotFound />} />
        <Route path="/destinations/regions/:slug" element={<RegionCountriesPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}; 