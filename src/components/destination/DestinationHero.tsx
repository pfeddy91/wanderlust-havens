
import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getToursByCountry } from '@/services/honeymoonService';
import { Tour, TourImage } from '@/types/tour';

interface DestinationHeroProps {
  country: {
    name: string;
    featured_image: string | null;
    id: string;
  };
}

const DestinationHero = ({ country }: DestinationHeroProps) => {
  const [heroImage, setHeroImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchHeroImages = async () => {
      if (!country.id) return;
      
      try {
        // Get tours for the country
        const countryTours = await getToursByCountry(country.id);
        
        if (countryTours.length > 0) {
          // Check for tour images
          for (const tour of countryTours as Tour[]) {
            if (tour.tour_images && tour.tour_images.length > 0) {
              // First, try to find a primary image
              const primaryImage = tour.tour_images.find((img) => img.is_primary);
              if (primaryImage) {
                setHeroImage(primaryImage.image_url);
                return;
              }
              
              // Next, try to find a featured image
              const featuredImage = tour.tour_images.find((img) => img.is_featured);
              if (featuredImage) {
                setHeroImage(featuredImage.image_url);
                return;
              }
              
              // If no featured image, use the first one based on display_order
              const sortedImages = [...tour.tour_images].sort((a, b) => a.display_order - b.display_order);
              if (sortedImages.length > 0) {
                setHeroImage(sortedImages[0].image_url);
                return;
              }
            }
          }
        }
        
        // Fallback to country's featured image
        setHeroImage(country.featured_image);
      } catch (error) {
        console.error("Error fetching tour images:", error);
        setHeroImage(country.featured_image);
      }
    };
    
    fetchHeroImages();
  }, [country.id, country.featured_image]);

  const scrollToOverview = () => {
    document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' });
  };

  const backgroundImage = heroImage || country.featured_image || 
    'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1500&q=80';

  return (
    <div className="relative h-screen min-h-[600px] w-full">
      {/* Hero Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>
      
      {/* Hero Content */}
      <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4">
        <h1 className="text-4xl md:text-6xl font-serif text-white font-bold tracking-wider mb-6">
          HIGH-END HONEYMOONS IN {country.name.toUpperCase()}
        </h1>
        
        {/* Scroll Down Indicator */}
        <button 
          onClick={scrollToOverview}
          className="absolute bottom-10 flex flex-col items-center text-white hover:text-gray-200 transition-colors animate-bounce"
          aria-label="Scroll down"
        >
          <span className="text-sm mb-2">Scroll Down</span>
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default DestinationHero;
