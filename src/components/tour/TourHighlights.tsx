import React, { useEffect, useState } from 'react';
import { Tour } from '@/types/tour';

interface TourHighlightsProps {
  tour: Tour;
}

const TourHighlights = ({ tour }: TourHighlightsProps) => {
  // Check if tour has highlights
  const hasHighlights = tour.tour_highlights && tour.tour_highlights.length > 0;
  
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
    </div>
  );
};

export default TourHighlights;