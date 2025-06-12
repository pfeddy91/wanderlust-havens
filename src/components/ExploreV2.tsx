import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Carousel } from '@/components/ui/carousel';

// Desktop carousel data (original)
const featureDataForCarousel = [
  {
    id: 'destinations',
    title: 'Destinations',
    imageSrc: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    description: "Explore our handpicked collection of romantic destinations around the world, from secluded islands to cultural capitals.",
    imageAlt: 'Hot air balloons flying over a valley',
    navigationPath: '/destinations',
  },
  {
    id: 'planner',
    title: 'Bespoke Planner',
    description: "Let our intelligent assistant design a customized honeymoon itinerary based on your preferences, budget, and dream experiences.",
    imageSrc: 'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    imageAlt: 'Person writing in a planner with a map',
    navigationPath: '/planner',
  },
  {
    id: 'collections',
    title: 'Curated Collections',
    description: "Seeking adventure, relaxation, or cultural immersion? Find experiences that match your perfect honeymoon atmosphere.",
    imageSrc: 'https://images.pexels.com/photos/4107414/pexels-photo-4107414.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    imageAlt: 'Wooden bridge leading to huts on a tropical island',
    navigationPath: '/collections',
  },
];

// Mobile-optimized tile data
const tileData = [
  {
    id: 'planner',
    title: 'Bespoke Planner',
    imageSrc: 'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    imageAlt: 'Person writing in a planner with a map',
    navigationPath: '/planner',
  },
  {
    id: 'destinations',
    title: 'Destinations',
    imageSrc: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    imageAlt: 'Hot air balloons flying over a valley',
    navigationPath: '/destinations',
  },
  {
    id: 'collections',
    title: 'Collections',
    imageSrc: 'https://images.pexels.com/photos/4107414/pexels-photo-4107414.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    imageAlt: 'Wooden bridge leading to huts on a tropical island',
    navigationPath: '/collections',
  },
];

const ExploreV2 = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
      src: feature.imageSrc,
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
      <section id="explore-v2" className="py-16 md:py-20 bg-white px-4">
        {/* Header Section - Mobile */}
        <div className="max-w-4xl mx-auto text-center mb-8">
          <span className="text-3xl font-serif font-semibold mb-2 block" style={{ color: '#161618' }}>
            Choosing Your Honeymoon
          </span>
          <h2 className="text-lg font-sans mt-2 leading-tight" style={{ color: '#161618' }}>
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
              {/* Background Image */}
              <img
                src={tile.imageSrc}
                alt={tile.imageAlt}
                className="w-full h-full object-cover"
              />
              
              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-black/20" />
              
              {/* Text Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="text-white text-2xl font-serif font-semibold tracking-wide">
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
            <span className="text-3xl md:text-3xl font-serif font-semibold mb-2 block" style={{ color: '#161618' }}>
              Choosing Your Honeymoon
            </span>
            <h2 className="text-xl md:text-xl font-sans mt-2 leading-tight" style={{ color: '#161618' }}>
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