import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTourBySlug } from '@/services/honeymoonService';
import { Loader2 } from 'lucide-react';
import TourHero from '@/components/tour/TourHero';
import TourItinerary from '@/components/tour/TourItinerary';
import TourHighlights from '@/components/tour/TourHighlights';
import TourHotels from '@/components/tour/TourHotels';
import TourImageGallery from '@/components/tour/TourImageGallery';
import FloatingBackButton from '@/components/FloatingBackButton';
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
          
          // Make sure the tour data is properly typed before setting state
          if (tourData) {
            // We know it meets the Tour interface because we've updated our types
            setTour(tourData as Tour);
          }
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
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.20))]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.20))] pt-20">
        <h1 className="text-2xl font-bold">Tour not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn't find the tour you're looking for.</p>
        <a href="/" className="mt-4 text-primary hover:underline">Go back home</a>
      </div>
    );
  }

  return (
    <main className="pb-16">
      <TourHero tour={tour} />
      
      <Separator />
      
      <section id="highlights" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <TourHighlights tour={tour} />
        </div>
      </section>
      
      {tour.tour_images && tour.tour_images.length > 0 && (
        <>
          <Separator />
          <TourImageGallery images={tour.tour_images} title="Experience the Journey" />
        </>
      )}

      <Separator />
      
      <section id="itinerary" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <TourItinerary tour={tour} />
        </div>
      </section>

      {tour.hotels && tour.hotels.length > 0 && (
        <>
          <Separator />
          <TourHotels hotels={tour.hotels} />
        </>
      )}

      {/* Floating Back Button (conditional) */}
      <FloatingBackButton />
    </main>
  );
};

export default TourDetail;
