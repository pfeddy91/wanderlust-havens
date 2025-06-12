import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Carousel } from '@/components/ui/carousel';
import { optimizeImageUrl, ImagePresets } from '@/utils/imageOptimization';
import { TYPOGRAPHY } from '@/utils/typography';

// Desktop carousel data with optimized URLs
const featureDataForCarousel = [
  {
    id: 'destinations',
    title: 'Destinations',
    imageSrc: 'https://images.unsplash.com/photo-1643925690746-9eb744dae41b?q=80&w=3629&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    description: "Explore our handpicked collection of romantic destinations around the world, from secluded islands to cultural capitals.",
    imageAlt: 'Beautiful romantic destination',
    navigationPath: '/destinations',
  },
  {
    id: 'planner',
    title: 'Bespoke Planner',
    description: "Let our intelligent assistant design a customized honeymoon itinerary based on your preferences, budget, and dream experiences.",
    imageSrc: 'https://images.unsplash.com/photo-1580842985328-713c009ba577?q=80&w=2878&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    imageAlt: 'Travel planning and consultation',
    navigationPath: '/planner',
  },
  {
    id: 'collections',
    title: 'Curated Collections',
    description: "Seeking adventure, relaxation, or cultural immersion? Find experiences that match your perfect honeymoon atmosphere.",
    imageSrc: 'https://cdn.mos.cms.futurecdn.net/r2UTnDqnW9PSG33QvQdJGm.jpg',
    imageAlt: 'Luxury travel destination',
    navigationPath: '/collections',
  },
];

// Mobile-optimized tile data (updated URLs)
const tileData = [
  {
    id: 'planner',
    title: 'Bespoke Planner',
    imageSrc: 'https://images.unsplash.com/photo-1580842985328-713c009ba577?q=80&w=2878&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    imageAlt: 'Travel planning and consultation',
    navigationPath: '/planner',
  },
  {
    id: 'destinations',
    title: 'Destinations',
    imageSrc: 'https://images.unsplash.com/photo-1643925690746-9eb744dae41b?q=80&w=3629&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    imageAlt: 'Beautiful romantic destination',
    navigationPath: '/destinations',
  },
  {
    id: 'collections',
    title: 'Collections',
    imageSrc: 'https://cdn.mos.cms.futurecdn.net/r2UTnDqnW9PSG33QvQdJGm.jpg',
    imageAlt: 'Luxury travel destination',
    navigationPath: '/collections',
  },
];

const ExploreV2 = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Get optimized image URL with appropriate preset
  const getOptimizedImageUrl = (imagePath: string) => {
    // For external URLs (Pexels, etc.), return as-is since they're already optimized
    if (imagePath.startsWith('http') && !imagePath.includes('supabase.co')) {
      return imagePath;
    }
    
    // For Supabase Storage URLs, apply optimization
    return optimizeImageUrl(
      imagePath, 
      isMobile ? ImagePresets.cardMobile : ImagePresets.cardLarge
    );
  };

  // Desktop carousel setup (original logic)
  const slideData = featureDataForCarousel.map(feature => {
    let buttonText = '';
    if (feature.id === 'destinations' || feature.id === 'collections') {
      buttonText = `Browse ${feature.title}`;
    } else if (feature.id === 'planner') {
      buttonText = `Try Our ${feature.title}`;
    } else {
      buttonText = `Explore ${feature.title}`;
    }

    return {
      title: feature.title,
      button: buttonText,
      src: getOptimizedImageUrl(feature.imageSrc),
      onButtonClick: () => navigate(feature.navigationPath),
      navigationPath: feature.navigationPath
    };
  });

  const bespokePlannerIndex = featureDataForCarousel.findIndex(
    (feature) => feature.id === 'planner'
  );

  if (isMobile) {
    // Mobile: Simple tile layout
    return (
      <section id="explore-v2" className="pt-4 pb-16 md:py-20 bg-white px-4">
        {/* Header Section - Mobile */}
        <div className="max-w-4xl mx-auto text-center mb-8">
          <span className={`${TYPOGRAPHY.h2} mb-2 block`} style={{ color: '#161618' }}>
            Choosing Your Honeymoon
          </span>
          <h2 className={`${TYPOGRAPHY.body} mt-2 leading-tight`} style={{ color: '#161618' }}>
            The first step: find your perfect itinerary
          </h2>
        </div>

        {/* Mobile Tiles */}
        <div className="space-y-2">
          {tileData.map((tile) => (
            <div
              key={tile.id}
              className="relative w-full h-40 cursor-pointer overflow-hidden"
              onClick={() => navigate(tile.navigationPath)}
            >
              {/* Background Image with Optimization */}
              <img
                src={getOptimizedImageUrl(tile.imageSrc)}
                alt={tile.imageAlt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-black/20" />
              
              {/* Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className={`${TYPOGRAPHY.h3} text-white tracking-wide`}>
                  {tile.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Desktop: Original carousel layout
  return (
    <section id="explore-v2" className="py-16 md:py-20 bg-white px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <div className="max-w-[60%] mx-auto">
            <span className={`${TYPOGRAPHY.h2} mb-2 block`} style={{ color: '#161618' }}>
              Choosing Your Honeymoon
            </span>
            <h2 className={`${TYPOGRAPHY.lead} mt-2 leading-tight`} style={{ color: '#161618' }}>
              Through a curated list of destination and collections, as well as through our bespoke planner, we make it easy to create a honeymoon that is truly unique and tailored to your dreams.
            </h2>
          </div>
        </div>
      </div>

      <div className="relative w-full mt-8 pb-16">
        <Carousel 
          slides={slideData} 
          startIndex={bespokePlannerIndex > -1 ? bespokePlannerIndex : 0} 
        />
      </div>
    </section>
  );
};

export default ExploreV2; 