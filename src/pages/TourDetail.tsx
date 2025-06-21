import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { TourSEO } from '@/components/SEO';
import TourHero from '@/components/tour/TourHero';
import TourImageGallery from '@/components/tour/TourImageGallery';
import TourHighlights from '@/components/tour/TourHighlights';
import TourItinerary from '@/components/tour/TourItinerary';
import TourMap from '@/components/tour/TourMap';
import { Tour } from '@/types/tour';
import { Separator } from '@/components/ui/separator';
import FloatingBackButton from '@/components/FloatingBackButton';

const TourDetail = () => {
  const { tourSlug } = useParams<{ tourSlug: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTour = async () => {
      if (!tourSlug) return;

      try {
        setLoading(true);
        setError(null);

        const { data: tourData, error: tourError } = await supabase
          .from('tours')
          .select(`
            *,
            tour_images (
              id,
              image_url,
              alt_text,
              is_primary,
              is_featured,
              display_order
            ),
            tour_highlights (
              id,
              title,
              description,
              order
            ),
            tour_itineraries (
              id,
              day_range,
              title,
              content,
              order_index
            ),
            tour_locations (
              id,
              name,
              latitude,
              longitude,
              description,
              order_index
            )
          `)
          .eq('slug', tourSlug)
          .single();

        if (tourError) {
          throw new Error(`Tour not found: ${tourError.message}`);
        }

        setTour(tourData);
      } catch (err) {
        console.error('Error fetching tour:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTour();
  }, [tourSlug]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error || !tour) {
    return <div className="flex justify-center items-center h-screen text-red-600">Error: {error || 'Tour not found'}</div>;
  }

  // Create tour object for SEO component with proper mapping
  const tourForSEO = {
    title: tour.name, // Map 'name' to 'title' for SEO component
    slug: tour.slug,
    summary: tour.summary,
    description: tour.description,
    guide_price: tour.guide_price,
    duration: tour.duration,
    countries: tour.country_details?.map(c => c.name) || [],
    featured_image: tour.featured_image || undefined
  };

  return (
    <main className="pb-16">
      <TourSEO tour={tourForSEO} />
      <TourHero tour={tour} />
      
      <Separator />
      
      <section id="highlights" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <TourHighlights tour={tour} />
        </div>
      </section>
      
      {tour.tour_images && tour.tour_images.length > 0 && (
        <>
          <Separator />
          <TourImageGallery 
            images={tour.tour_images} 
            title={`${tour.name} Gallery`} 
          />
        </>
      )}

      <Separator />
      
      <section id="itinerary" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <TourItinerary tour={tour} />
        </div>
      </section>

      <Separator />
      
      <section id="map" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <TourMap tour={tour} />
        </div>
      </section>

      {/* Floating Back Button (conditional) */}
      <FloatingBackButton />
    </main>
  );
};

export default TourDetail;
