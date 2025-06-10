import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient'; // Assuming this path is correct
import { Carousel, Card, CardType as AppleCardDataType } from '@/components/ui/apple-cards-carousel'; // Import new carousel
import { Button } from '@/components/ui/button'; // For a "View Itinerary" button
import { optimizeImageUrl, ImagePresets } from '@/utils/imageOptimization';

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
}

// Component to display detailed content when a card is opened
const TourDetailContent = ({ tour, onNavigate }: { tour: Tour; onNavigate: (slug: string) => void; }) => {
  return (
    <div className="space-y-4 text-neutral-700 dark:text-neutral-300">
      <p className="text-lg">
        Embark on a {tour.duration}-night journey through {tour.country_names.join(' & ')}.
      </p>
      {/* You can add more tour details here, e.g., tour.description */}
      {tour.description && <p>{tour.description}</p>}
      <p>Discover breathtaking landscapes and create unforgettable memories.</p>
      <Button 
        onClick={() => onNavigate(tour.slug)}
        className="mt-6 w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white" // Example styling
      >
        View Full Itinerary
      </Button>
    </div>
  );
};


const FeaturedV2 = () => {
  const [originalTours, setOriginalTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
            description 
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

  const handleNavigateToTour = (slug: string) => {
    navigate(`/tours/${slug}`);
  };

  const formatCountryNameForCard = (tour: Tour) => {
    const names = tour.country_names;
    if (!names || names.length === 0) return 'Multiple Destinations';
    if (names.length === 1) return names[0];
    return `${names[0]} & More`; // Keep it concise for card category
  };

  // Map your tour data to the structure expected by AppleCardsCarousel
  const carouselCards = originalTours.map((tour, index) => {
    const cardData: AppleCardDataType = {
      src: tour.featured_image || optimizeImageUrl('https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80', ImagePresets.cardLarge), // Ensure fallback with optimization
      title: tour.title,
      category: formatCountryNameForCard(tour),
      content: <TourDetailContent tour={tour} onNavigate={handleNavigateToTour} />,
      slug: tour.slug,
    };
    return <Card key={`${tour.id}-${index}`} card={cardData} index={index} layout={true} />;
  });

  const TitleSection = () => {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4 lg:mb-4">
          <div className="max-w-[60%] mx-auto">
            <span className="font-serif text-3xl md:text-3xl font-semibold mb-2 block" style={{ color: '#161618' }}>
              Explore Our Moons
            </span>
            <p className="text-xl md:text-xl font-sans mt-2 leading-tight" style={{ color: '#161618' }}>
            These are not just destinations; they are intimate encounters with the world's most breathtaking and secluded wonders, curated with passion and unparalleled care for the first, most magical chapter of your life together.
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <section className="py-12 bg-white dark:bg-travel-charcoal text-neutral-800 dark:text-white overflow-hidden px-8">
        <TitleSection />
        <div className="flex space-x-4 overflow-hidden py-8 md:py-14 justify-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-[17rem] md:w-[22rem] h-[26rem] md:h-[39rem] bg-gray-200 dark:bg-neutral-800 animate-pulse rounded-xl flex-shrink-0"></div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-white dark:bg-travel-charcoal text-neutral-800 dark:text-white px-8">
        <TitleSection />
        <div className="text-center py-8 bg-red-100 dark:bg-red-900/20 rounded border border-red-300 dark:border-red-700 max-w-md mx-auto mt-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </section>
    );
  }

  if (carouselCards.length === 0) {
    return (
      <section className="py-16 bg-white dark:bg-travel-charcoal text-neutral-800 dark:text-white px-8">
        <TitleSection />
        <div className="text-center py-8 text-neutral-600 dark:text-neutral-400 mt-4">
          <p>No featured tours available at the moment.</p>
        </div>
      </section>
    );
  }

  return (
<section className="py-8 md:py-16 bg-white dark:bg-neutral-950 text-neutral-800 dark:text-white overflow-x-hidden px-8">      <TitleSection />
      <Carousel items={carouselCards} />
    </section>
  );
};

export default FeaturedV2;