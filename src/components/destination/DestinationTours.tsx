import React from 'react';
import { Link } from 'react-router-dom';
import { Tour, TourImage } from '@/types/tour';
import { Carousel, Card, CardType as AppleCardDataType } from '@/components/ui/apple-cards-carousel';
import { Button } from '@/components/ui/button';
import { optimizeImageUrl, ImagePresets } from '@/utils/imageOptimization';
import ProgressiveImage from '@/components/ui/ProgressiveImage';

interface DestinationToursProps {
  tours: Tour[];
  country: {
    name: string;
  };
}

// Component to display detailed content when a card is opened
const TourDetailContent = ({ tour, country, onNavigate }: { 
  tour: Tour; 
  country: { name: string }; 
  onNavigate: (slug: string) => void; 
}) => {
  return (
    <div className="space-y-4 text-neutral-700 dark:text-neutral-300">
      <p className="text-lg">
        Embark on a {tour.duration}-night journey through {country.name}.
      </p>
      <p>Experience luxury and create unforgettable memories in this carefully curated destination.</p>
      <p className="text-base font-medium">
        From £{tour.guide_price?.toLocaleString()} per person
      </p>
      <Button 
        onClick={() => onNavigate(tour.slug)}
        className="mt-6 w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
      >
        View Full Itinerary
      </Button>
    </div>
  );
};

const DestinationTours = ({ tours, country }: DestinationToursProps) => {
  // Function to get the best image for a tour
  const getTourImage = (tour: Tour) => {
    let imageUrl = '';
    
    // Try to get featured image from tour_images
    if (tour.tour_images && tour.tour_images.length > 0) {
      // First check for a primary image
      const primaryImage = tour.tour_images.find((img) => img.is_primary);
      if (primaryImage) imageUrl = primaryImage.image_url;
      
      // Then look for a featured image
      if (!imageUrl) {
        const featuredImage = tour.tour_images.find((img) => img.is_featured);
        if (featuredImage) imageUrl = featuredImage.image_url;
      }
      
      // If no featured image, use the first one by display_order
      if (!imageUrl) {
        const sortedImages = [...tour.tour_images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        if (sortedImages.length > 0) imageUrl = sortedImages[0].image_url;
      }
    }
    
    // Fallback to tour's featured_image or a generic placeholder
    if (!imageUrl) {
      imageUrl = tour.featured_image || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';
    }
    
    // Return original URL (optimization will be handled by ProgressiveImage)
    return imageUrl;
  };

  const handleNavigateToTour = (slug: string) => {
    // Navigate to tour detail page
    window.location.href = `/tours/${slug}`;
  };

  // Map tours to carousel cards
  const carouselCards = tours.map((tour, index) => {
    const cardData: AppleCardDataType = {
      src: getTourImage(tour),
      title: (tour as any).title || `Tour ${index + 1}`, // Using 'title' field from Supabase
      category: country.name,
      content: <TourDetailContent tour={tour} country={country} onNavigate={handleNavigateToTour} />,
      slug: tour.slug,
    };
    return <Card key={`${tour.id}-${index}`} card={cardData} index={index} layout={true} />;
  });

  // Custom card component for the carousel that matches our design
  const CustomTourCard = ({ tour }: { tour: Tour }) => {
    return (
      <Link 
        to={`/tours/${tour.slug}`} 
        className="relative z-10 flex h-[26rem] w-64 flex-col items-start justify-between overflow-hidden rounded-xl bg-gray-100 shadow-lg transition-all hover:shadow-xl md:h-[39rem] md:w-[20.9rem] dark:bg-neutral-900"
      >
        {/* Top Gradient Overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-2/3 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
        
        {/* Bottom Gradient Overlay - Made darker for better text visibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Top Content - Category and Title */}
        <div className="relative z-30 p-6">
          <p className="text-left font-sans text-xs font-medium uppercase tracking-wider text-white/80 md:text-sm">
            {country.name}
          </p>
          <p className="mt-1 max-w-xs text-left font-serif text-lg font-semibold [text-wrap:balance] text-white md:text-2xl">
            {(tour as any).title || 'Luxury Honeymoon'}
          </p>
        </div>

        {/* Bottom Content - Price, Duration and Button */}
        <div className="relative z-30 p-6 space-y-3">
          <p className="text-left text-base font-bold text-white font-serif">
            From £{tour.guide_price?.toLocaleString()} per person | {tour.duration} Nights
          </p>
          <div className="inline-block border border-white/80 px-4 py-2 rounded-lg uppercase tracking-wider font-serif text-lg font-medium text-white backdrop-blur-sm bg-white/10 transition-all hover:bg-white/20 hover:border-white">
            Explore Moon
          </div>
        </div>

        {/* Background Image */}
        <div className="absolute inset-0 z-10">
          <ProgressiveImage
            src={getTourImage(tour)}
            alt={(tour as any).title || 'Tour image'}
            className="w-full h-full"
            optimization={ImagePresets.destinationCard}
            placeholder="shimmer"
            loading="lazy"
          />
        </div>
      </Link>
    );
  };

  // Create custom cards for our specific design
  const customCards = tours.map((tour, index) => (
    <CustomTourCard key={`${tour.id}-${index}`} tour={tour} />
  ));

  return (
    <div className="pt-16 pb-0" style={{ backgroundColor: '#E4EDF3' }}>
      <div className="max-w-7l p-8 md:ml-14 md:mr-auto md:p-0">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          <div className="lg:col-span-1">
            <h2 className="text-3xl font-serif font-bold mb-4 uppercase">
              EXAMPLE<br/>{country.name.toUpperCase()} HONEYMOONS
            </h2>
            <p className="text-base text-gray-700 mb-6 font-serif">
              These luxury {country.name} honeymoons are simply suggestions for the kind of holiday you might have. 
              Yours will be tailored, altered, and refined until it matches you completely.
            </p>
          </div>
          
          <div className="lg:col-span-3 -mt-10 md:-mt-20">
            {tours && tours.length > 0 ? (
              <div className="w-full min-w-[1200px]">
                <Carousel items={customCards} />
              </div>
            ) : (
              <div className="text-center text-gray-600 font-serif col-span-full">
                No specific honeymoon suggestions currently available for {country.name}. Please contact us for tailored options.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationTours;
