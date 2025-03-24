
import React, { useState } from 'react';
import { Tour } from '@/types/tour';

interface TourHeroProps {
  tour: Tour;
  countryNames: string[];
}

const TourHero = ({ tour, countryNames }: TourHeroProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Get the best images for the hero
  const heroImages = tour.tour_images && tour.tour_images.length > 0
    ? [...tour.tour_images].sort((a, b) => {
        // Prioritize primary images first
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        
        // Then featured images
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        
        // Then by display_order
        return a.display_order - b.display_order;
      })
    : [];
  
  // Fallback to featured_image if no tour_images
  const images = heroImages.length > 0 
    ? heroImages.map(img => img.image_url) 
    : tour.featured_image 
      ? [tour.featured_image] 
      : ['https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80'];

  // Country string (e.g., "MOROCCO" or "MOROCCO & ALGERIA")
  const countryString = countryNames.length > 0 
    ? countryNames.join(' & ').toUpperCase() 
    : 'DESTINATION';

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative h-[85vh] w-full">
      {/* Background image with gradient overlay */}
      <div className="absolute inset-0 z-0 bg-black">
        <div className="relative h-full w-full">
          {images.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image}
                alt={tour.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Image navigation buttons */}
      {images.length > 1 && (
        <div className="absolute bottom-10 right-10 z-20 flex space-x-2">
          <button
            onClick={prevImage}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30"
            aria-label="Previous image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={nextImage}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30"
            aria-label="Next image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* Hero content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center text-white">
        <div className="max-w-5xl">
          <p className="mb-6 font-sans text-sm uppercase tracking-wider sm:text-base">
            {countryString}
          </p>
          <h1 className="font-serif text-5xl font-bold uppercase tracking-wide sm:text-6xl md:text-7xl lg:text-8xl">
            {tour.name}
          </h1>
        </div>
      </div>
    </div>
  );
};

export default TourHero;
