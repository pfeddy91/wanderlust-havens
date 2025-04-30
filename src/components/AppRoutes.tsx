import React, { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Layout from "./Layout"; // Import the new Layout component
import Index from "../pages/Index";
import Destination from "../pages/Destination";
import TourDetail from "../pages/TourDetail";
import NotFound from "../pages/NotFound";
import AllDestinationsPage from "../pages/AllDestinationsPage";
import CollectionsPage from "../pages/CollectionsPage";
import CollectionDetailPage from "../pages/CollectionDetailPage";
import RegionCountriesPage from "../pages/RegionCountriesPage";
import AiPlannerContainer from "./ai-planner/AiPlannerContainer";

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
          // Exclude links specifically meant to open in new tabs or external links
          if (link.target !== '_blank' && !href.startsWith('http')) {
            e.preventDefault();
            navigate(href);
          }
        }
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [navigate]);

  return (
    <>
      <ScrollRestoration />
      {/* Define Routes */}
      <Routes>
        {/* Routes WITH the main Layout (Header/Footer) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Index />} />
          <Route path="/destinations" element={<AllDestinationsPage />} />
          <Route path="/destinations/:slug" element={<Destination />} />
          <Route path="/tours/:slug" element={<TourDetail />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:slug" element={<CollectionDetailPage />} />
          <Route path="/about" element={<NotFound />} />
          <Route path="/destinations/regions/:slug" element={<RegionCountriesPage />} />
          {/* Catch-all for routes within Layout */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Routes WITHOUT the main Layout (Full Screen) */}
        <Route path="/planner/*" element={<AiPlannerContainer />} />

        {/* If you had other full-screen routes, they would go here */}
        {/* Example: <Route path="/login" element={<LoginPage />} /> */}

      </Routes>
    </>
  );
}; 