import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Destination from "./pages/Destination";
import TourDetail from "./pages/TourDetail";
import NotFound from "./pages/NotFound";
import AllDestinationsPage from "./pages/AllDestinationsPage";
import CollectionsPage from "./pages/CollectionsPage";
import CollectionDetailPage from "./pages/CollectionDetailPage";
import PlannerPage from "./pages/PlannerPage";
import RegionCountriesPage from "./pages/RegionCountriesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
