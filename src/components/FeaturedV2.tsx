import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/utils/supabaseClient'; // Assuming this path is correct
import { Carousel } from '@/components/ui/apple-cards-carousel'; // Import carousel component
import { Button } from '@/components/ui/button'; // For a "View Itinerary" button
import { optimizeImageUrl, ImagePresets } from '@/utils/imageOptimization';
import ProgressiveImage from '@/components/ui/ProgressiveImage';
import { Link } from 'react-router-dom';

// Interface for your tour data from Supabase (as in Featured.tsx)
interface Tour {
  id: string;
  title: string;
  duration: number;
  slug: string;
  featured_image: string | null;
  countries: string[];
  country_names: string[];
  is_featured?: boolean;
  description?: string; // Add if you have descriptions
  guide_price?: number; // Add price field
}

// Custom Tour Card Component matching DestinationTours.tsx design
const CustomTourCard = ({ tour }: { tour: Tour }) => {
  return (
    <Link 
      to={`/tours/${tour.slug}`} 
      className="relative z-10 flex h-[26rem] w-[218px] flex-col items-start justify-between overflow-hidden rounded-xl bg-gray-100 shadow-lg transition-all hover:shadow-xl md:h-[39rem] md:w-[20.9rem] dark:bg-neutral-900"
    >
      {/* Top Gradient Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-2/3 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
      
      {/* Bottom Gradient Overlay - Made darker for better text visibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Top Content - Category and Title */}
      <div className="relative z-30 p-6">
        <p className="text-left font-sans text-xs font-medium uppercase tracking-wider text-white/80 md:text-sm">
          {tour.country_names.join(' & ') || 'Multiple Destinations'}
        </p>
        <p className="mt-1 max-w-xs text-left font-serif text-lg font-semibold [text-wrap:balance] text-white md:text-2xl">
          {tour.title}
        </p>
      </div>

      {/* Bottom Content - Price, Duration and Button */}
      <div className="relative z-30 p-6 space-y-3">
        <p className="text-left text-base font-bold text-white font-serif">
          {tour.guide_price ? `From £${tour.guide_price.toLocaleString()} per person | ` : ''}{tour.duration} Nights
        </p>
        <div className="inline-block border border-white/80 px-4 py-2 rounded-lg uppercase tracking-wider font-serif text-lg font-medium text-white backdrop-blur-sm bg-white/10 transition-all hover:bg-white/20 hover:border-white">
          Explore Moon
        </div>
      </div>

      {/* Background Image */}
      <div className="absolute inset-0 z-10">
        <ProgressiveImage
          src={tour.featured_image || optimizeImageUrl('https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80', ImagePresets.cardLarge)}
          alt={tour.title}
          className="w-full h-full"
          optimization={ImagePresets.destinationCard}
          placeholder="shimmer"
          loading="lazy"
        />
      </div>
    </Link>
  );
};

// Simple Mobile Carousel Component with smooth scrolling (matching DestinationTours.tsx)
const MobileCarousel = ({ tours }: { tours: Tour[] }) => {
  return (
    <div className="md:hidden">
      <div 
        className="flex gap-4 overflow-x-auto scrollbar-hide py-4 scroll-smooth px-4"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {tours.map((tour, index) => (
          <div key={`${tour.id}-${index}`} className="flex-shrink-0">
            <CustomTourCard tour={tour} />
          </div>
        ))}
      </div>
    </div>
  );
};

const FeaturedV2 = () => {
  const [originalTours, setOriginalTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchFeaturedToursAndCountries = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: toursData, error: toursError } = await supabase
          .from('tours')
          .select(`
            id,
            title,
            duration,
            slug,
            countries, 
            is_featured,
            description,
            guide_price
          `)
          .eq('is_featured', true)
          .limit(10);

        if (toursError) throw new Error(`Database error fetching tours: ${toursError.message}`);
        if (!toursData || toursData.length === 0) {
          setOriginalTours([]);
          setLoading(false);
          return;
        }

        const tourIds = toursData.map(t => t.id);
        const { data: imagesData, error: imagesError } = await supabase
          .from('tour_images')
          .select('tour_id, image_url')
          .in('tour_id', tourIds)
          .eq('is_featured', true);

        if (imagesError) console.warn("Error fetching featured images:", imagesError);

        const imageMap = new Map<string, string>();
        if (imagesData) {
            imagesData.forEach(img => {
                if (img.tour_id && !imageMap.has(img.tour_id) && img.image_url) {
                    imageMap.set(img.tour_id, img.image_url);
                }
            });
        }
        
        const countryIds = Array.from(new Set(toursData.flatMap(tour => tour.countries || [])));
        let countryMap = new Map<string, string>();
        if (countryIds.length > 0) {
          const { data: countriesData, error: countriesError } = await supabase
            .from('countries')
            .select('id, name')
            .in('id', countryIds);
          if (countriesError) console.warn(`Could not fetch country names: ${countriesError.message}`);
          else if (countriesData) countryMap = new Map(countriesData.map(c => [c.id, c.name]));
        }

        const toursWithDetails: Tour[] = toursData.map(tour => ({
          id: tour.id,
          title: tour.title,
          duration: tour.duration,
          slug: tour.slug,
          featured_image: optimizeImageUrl(
            imageMap.get(tour.id) || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
            ImagePresets.cardLarge
          ),
          countries: tour.countries || [],
          country_names: (tour.countries || []).map(id => countryMap.get(id) || 'Unknown').filter(name => name !== 'Unknown'),
          is_featured: tour.is_featured,
          description: tour.description || `Discover the magic of ${tour.title}, a curated experience designed for unforgettable memories.`, // Fallback description
          guide_price: tour.guide_price,
        }));

        setOriginalTours(toursWithDetails);
      } catch (err: any) {
        console.error('Error in fetchFeaturedToursAndCountries:', err);
        setError(err.message || "Failed to load featured tours");
        setOriginalTours([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedToursAndCountries();
  }, []);

  const TitleSection = () => {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4 lg:mb-4">
          <div className={`${isMobile ? 'max-w-[90%]' : 'max-w-[60%]'} mx-auto`}>
            <span className="font-serif text-2xl md:text-4xl font-semibold mb-2 block" style={{ color: '#161618' }}>
              Explore Our Moons
            </span>
            <p className={`${isMobile ? 'text-base' : 'text-base md:text-lg'} font-serif mt-2 leading-tight`} style={{ color: '#161618' }}>
            These are not just destinations; they are intimate encounters with the world's most breathtaking and secluded wonders, curated with passion and unparalleled care for the first, most magical chapter of your life together.
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  if (loading) {
    const paddingClass = isMobile ? 'px-4' : 'px-8';
    return (
      <section className={`py-12 bg-white dark:bg-travel-charcoal text-neutral-800 dark:text-white overflow-hidden ${paddingClass}`}>
        <TitleSection />
        <div className="flex space-x-4 overflow-hidden py-8 md:py-14 justify-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${isMobile ? 'w-64 h-[26rem]' : 'w-[20.9rem] h-[39rem]'} bg-gray-200 dark:bg-neutral-800 animate-pulse rounded-xl flex-shrink-0`}></div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    const paddingClass = isMobile ? 'px-4' : 'px-8';
    return (
      <section className={`py-16 bg-white dark:bg-travel-charcoal text-neutral-800 dark:text-white ${paddingClass}`}>
        <TitleSection />
        <div className="text-center py-8 bg-red-100 dark:bg-red-900/20 rounded border border-red-300 dark:border-red-700 max-w-md mx-auto mt-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </section>
    );
  }

  if (originalTours.length === 0) {
    const paddingClass = isMobile ? 'px-4' : 'px-8';
    return (
      <section className={`py-16 bg-white dark:bg-travel-charcoal text-neutral-800 dark:text-white ${paddingClass}`}>
        <TitleSection />
        <div className="text-center py-8 text-neutral-600 dark:text-neutral-400 mt-4">
          <p>No featured tours available at the moment.</p>
        </div>
      </section>
    );
  }

  const paddingClass = isMobile ? 'px-4' : 'px-8';

  if (isMobile) {
    // Mobile: Custom infinite carousel with new card design
    return (
      <section className={`py-8 md:py-16 bg-white dark:bg-neutral-950 text-neutral-800 dark:text-white overflow-x-hidden ${paddingClass}`}>
        <TitleSection />
        <MobileCarousel tours={originalTours} />
      </section>
    );
  }

  // Desktop: Custom carousel with new card design
  const customCards = originalTours.map((tour, index) => (
    <CustomTourCard key={`${tour.id}-${index}`} tour={tour} />
  ));

  return (
    <section className={`py-8 md:py-16 bg-white dark:bg-neutral-950 text-neutral-800 dark:text-white overflow-x-hidden ${paddingClass}`}>
      <TitleSection />
      <div className="w-full min-w-[1200px]">
        <Carousel items={customCards} />
      </div>
    </section>
  );
};

export default FeaturedV2;