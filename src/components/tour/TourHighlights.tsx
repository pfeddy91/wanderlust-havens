
import React, { useEffect, useState } from 'react';
import { Tour } from '@/types/tour';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { useIsMobile } from '@/hooks/use-mobile';

interface TourHighlightsProps {
  tour: Tour;
}

const TourHighlights = ({ tour }: TourHighlightsProps) => {
  // Check if tour has highlights
  const hasHighlights = tour.tour_highlights && tour.tour_highlights.length > 0;
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // If no highlights, use dummy data
  const highlights = hasHighlights 
    ? tour.tour_highlights 
    : [
        { title: 'Explore vibrant markets', description: 'Immerse yourself in the colors and scents of local bazaars.' },
        { title: 'Stay in luxury accommodations', description: 'Unwind in handpicked, beautiful hotels and resorts.' },
        { title: 'Experience authentic culture', description: 'Connect with locals and discover traditional ways of life.' },
        { title: 'Enjoy breathtaking landscapes', description: 'Witness some of the most stunning natural scenery in the world.' },
        { title: 'Exclusive dining experiences', description: 'Savor the finest local cuisine in unique settings.' },
        { title: 'Private guided tours', description: 'Expert guides reveal hidden gems and local secrets.' }
      ];

  // Get tour images for carousel
  const tourImages = tour.tour_images || [];
  
  // Auto-rotate carousel every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (tourImages.length > 0) {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % tourImages.length);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [tourImages.length]);

  return (
    <div className="space-y-16">
      <div>
        <h2 className="mb-12 font-serif text-3xl font-bold uppercase tracking-wide">
          Tour Highlights
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
          {highlights.map((highlight, index) => (
            <div key={highlight.id || index} className="flex items-start">
              <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-primary font-medium">{index + 1}</span>
              </div>
              <div>
                <p className="font-serif font-medium text-lg">{highlight.title}</p>
                {highlight.description && (
                  <p className="text-gray-600 mt-1 font-serif">{highlight.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {tourImages.length > 0 && (
        <div className="mt-16">
          <h3 className="mb-8 font-serif text-2xl font-medium tracking-wide">
            Experience the Journey
          </h3>
          
          <Carousel className="w-full">
            <CarouselContent>
              {tourImages.map((image, index) => (
                <CarouselItem 
                  key={image.id} 
                  className={isMobile ? "basis-full" : "basis-1/2"}
                >
                  <div className="overflow-hidden rounded-lg">
                    <img 
                      src={image.image_url} 
                      alt={image.alt_text || `Tour highlight ${index + 1}`}
                      className="h-80 w-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-2 mt-4">
              <CarouselPrevious className="static transform-none mx-2" />
              <CarouselNext className="static transform-none mx-2" />
            </div>
          </Carousel>
        </div>
      )}
    </div>
  );
};

export default TourHighlights;
