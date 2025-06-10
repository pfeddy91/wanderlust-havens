import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Carousel } from '@/components/ui/carousel'; // Assuming @ is src/
import ProgressiveImage from '@/components/ui/ProgressiveImage';
import { ImagePresets } from '@/utils/imageOptimization';

// Data adapted from Explore.tsx's featureData
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
    imageSrc: 'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', // Different image for variety
    imageAlt: 'Person writing in a planner with a map',
    navigationPath: '/planner',
  },
  {
    id: 'collections',
    title: 'Curated Collections',
    description: "Seeking adventure, relaxation, or cultural immersion? Find experiences that match your perfect honeymoon atmosphere.",
    imageSrc: 'https://images.pexels.com/photos/4107414/pexels-photo-4107414.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', // Different image for variety
    imageAlt: 'Wooden bridge leading to huts on a tropical island',
    navigationPath: '/collections',
  },
];

const ExploreV2 = () => {
  const navigate = useNavigate();
  const sectionBgColor = 'bg-white';
  const featuresTitleColor = 'text-travel-burgundy';
  const mainHeadingColor = 'text-zinc-800';

  // Transform featureData for the Carousel component
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

  // Find the index of the 'Bespoke Planner' to set it as the default
  const bespokePlannerIndex = featureDataForCarousel.findIndex(
    (feature) => feature.id === 'planner'
  );

  return (
    <section id="explore-v2" className={`py-16 md:py-20 ${sectionBgColor} px-8`}>
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