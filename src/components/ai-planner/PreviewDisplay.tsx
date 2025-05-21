import React from 'react';
import { ItineraryPreview } from '@/types/aiPlanner';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

interface PreviewDisplayProps {
  itineraryPreview: ItineraryPreview & {
    duration?: number;
    // country_name is removed as per requirement to remove 'Destination'
    guide_price?: number;
    slug?: string; // Ensure slug is part of the type and data
  };
  // onUnlock prop is removed as navigation is handled directly
}

// Style definitions matching DestinationTours (can be customized)
const borderThickness = 8;
const borderColor = "#333"; // Darker border
const borderStyle = "solid";

const PreviewDisplay: React.FC<PreviewDisplayProps> = ({ itineraryPreview }) => {
  const navigate = useNavigate(); // Initialize useNavigate

  const imageUrl = itineraryPreview.featured_image || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';
  const duration = itineraryPreview.duration;
  const guidePrice = itineraryPreview.guide_price;

  const handleNavigateToTour = () => {
    if (itineraryPreview.slug) {
      navigate(`/tours/${itineraryPreview.slug}`);
    } else {
      console.warn("Preview item is missing a slug, cannot navigate:", itineraryPreview.title);
      // Optionally, you could disable the card/button or show a message
    }
  };

  return (
    <div
      className="block h-[550px] md:h-[600px] relative overflow-hidden group cursor-pointer transition-shadow duration-300 hover:shadow-xl"
      style={{
        border: `${borderThickness}px ${borderStyle} ${borderColor}`,
      }}
      onClick={handleNavigateToTour} // MODIFIED: Whole card navigates
    >
      {/* Duration Overlay */}
      {duration && (
         <div className="absolute top-4 right-6 z-10 text-white font-serif tracking-wider text-base md:text-lg bg-black/30 px-2 py-1 rounded">
           {duration} NIGHTS
         </div>
      )}

      {/* Image Background */}
      <div className="w-full h-full relative">
        <img
          src={imageUrl}
          alt={itineraryPreview.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient Overlay and Text Content */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent flex flex-col justify-end">
          <div className="p-6 md:p-8 text-white">
            {/* REMOVED: Country Name / Destination display
            <p className="uppercase text-xs md:text-sm tracking-wider mb-1 md:mb-2 font-sans">{countryName}</p> 
            */}

            {/* Title */}
            <h3 className="text-xl md:text-2xl font-bold uppercase font-serif tracking-wide mb-2 md:mb-3 line-clamp-2">
                {itineraryPreview.title}
            </h3>

             {/* Summary (Clamped) */}
             <p className="text-sm text-gray-200 mb-3 md:mb-4 font-serif line-clamp-3">
                {itineraryPreview.summary}
             </p>

            {/* Guide Price */}
            {typeof guidePrice === 'number' && guidePrice > 0 && (
              <p className="text-sm md:text-base mb-4 md:mb-6 font-serif">
                From £{guidePrice.toLocaleString()} per person
              </p>
            )}

            {/* "View Moons" Element (Styled Div) */}
            <div
              className="inline-block border border-white px-6 py-2.5 md:px-8 md:py-3 uppercase tracking-wider text-xs md:text-sm font-sans backdrop-blur-sm bg-white/10 transition-colors group-hover:bg-white/25"
              // onClick is now handled by the parent div, but if you wanted only this button to navigate:
              // onClick={(e) => { e.stopPropagation(); handleNavigateToTour(); }}
            >
              View Moons {/* MODIFIED: Text changed */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewDisplay; 