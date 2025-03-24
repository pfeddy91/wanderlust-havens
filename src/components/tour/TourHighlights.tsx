
import React from 'react';
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
        { title: 'Enjoy breathtaking landscapes', description: 'Witness some of the most stunning natural scenery in the world.' }
      ];

  return (
    <div>
      <h2 className="mb-8 font-serif text-3xl font-bold uppercase tracking-wide">
        Tour Highlights
      </h2>
      
      <ul className="space-y-5">
        {highlights.map((highlight, index) => (
          <li key={highlight.id || index} className="flex items-start">
            <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
              •
            </div>
            <div>
              <p className="font-medium">{highlight.title}</p>
              {highlight.description && (
                <p className="text-gray-600">{highlight.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TourHighlights;
