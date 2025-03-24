
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTourBySlug } from '@/services/honeymoonService';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import TourHero from '@/components/tour/TourHero';
import TourSummary from '@/components/tour/TourSummary';
import TourItinerary from '@/components/tour/TourItinerary';
import TourHighlights from '@/components/tour/TourHighlights';
import { Tour } from '@/types/tour';
import { Separator } from '@/components/ui/separator';

const TourDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTour = async () => {
      setLoading(true);
      
      if (slug) {
        try {
          const tourData = await getTourBySlug(slug);
          console.log("Fetched tour data:", tourData);
          setTour(tourData);
        } catch (error) {
          console.error('Error fetching tour data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTour();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold">Tour not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn't find the tour you're looking for.</p>
        <a href="/" className="mt-4 text-primary hover:underline">Go back home</a>
      </div>
    );
  }

  // Extract country names from tour_countries
  const countryNames = tour.tour_countries
    ? tour.tour_countries.map(tc => tc.countries?.name).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <TourHero tour={tour} countryNames={countryNames} />
        
        {/* Summary Section */}
        <section id="overview" className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <TourSummary tour={tour} />
          </div>
        </section>

        <Separator />
        
        {/* Highlights Section */}
        <section id="highlights" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <TourHighlights tour={tour} />
          </div>
        </section>

        <Separator />
        
        {/* Itinerary Section */}
        <section id="itinerary" className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <TourItinerary tour={tour} />
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default TourDetail;
