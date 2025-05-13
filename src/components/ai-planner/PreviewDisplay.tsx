import React from 'react';
import { ItineraryPreview } from '@/types/aiPlanner'; // Adjust path
// Removed Button and Card imports as we're using custom divs

interface PreviewDisplayProps {
  itineraryPreview: ItineraryPreview & {
    // Tentatively add expected props, will be undefined if not returned by backend
    duration?: number;
    country_name?: string;
    guide_price?: number;
  };
  onUnlock: () => void; // Function to call when unlock is clicked
}

// Style definitions matching DestinationTours (can be customized)
const borderThickness = 8;
const borderColor = "#333"; // Darker border
const borderStyle = "solid";

const PreviewDisplay: React.FC<PreviewDisplayProps> = ({ itineraryPreview, onUnlock }) => {
  // Use potentially available data or fallbacks
  const imageUrl = itineraryPreview.featured_image || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80'; // Fallback image
  const duration = itineraryPreview.duration; // Will be undefined if not passed
  const countryName = itineraryPreview.country_name || 'Destination'; // Placeholder
  const guidePrice = itineraryPreview.guide_price; // Use guide_price directly if added to type

  return (
    <div
      className="block h-[550px] md:h-[600px] relative overflow-hidden group cursor-pointer transition-shadow duration-300 hover:shadow-xl" // Adjusted height slightly for preview context
      style={{
        border: `${borderThickness}px ${borderStyle} ${borderColor}`,
        // Removed boxShadow here, grid parent adds spacing/visual separation
      }}
      onClick={onUnlock} // Make the whole card clickable to unlock
    >
      {/* Duration Overlay */}
      {duration && (
         <div className="absolute top-4 right-6 z-10 text-white font-serif tracking-wider text-base md:text-lg bg-black/30 px-2 py-1 rounded"> {/* Added subtle background */}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent flex flex-col justify-end"> {/* Adjusted gradient */}
          <div className="p-6 md:p-8 text-white"> {/* Standardized padding */}
            {/* Country Name */}
            <p className="uppercase text-xs md:text-sm tracking-wider mb-1 md:mb-2 font-sans">{countryName}</p>

            {/* Title */}
            <h3 className="text-xl md:text-2xl font-bold uppercase font-serif tracking-wide mb-2 md:mb-3 line-clamp-2"> {/* Limited title lines */}
                {itineraryPreview.title}
            </h3>

             {/* Summary (Clamped) */}
             <p className="text-sm text-gray-200 mb-3 md:mb-4 font-serif line-clamp-3"> {/* Clamped to 3 lines */}
                {itineraryPreview.summary}
             </p>

            {/* Guide Price */}
            {typeof guidePrice === 'number' && guidePrice > 0 && (
              <p className="text-sm md:text-base mb-4 md:mb-6 font-serif">
                From £{guidePrice.toLocaleString()} per person
              </p>
            )}

            {/* Unlock Button (Styled Div) */}
            <div
              className="inline-block border border-white px-6 py-2.5 md:px-8 md:py-3 uppercase tracking-wider text-xs md:text-sm font-sans backdrop-blur-sm bg-white/10 transition-colors group-hover:bg-white/25"
              // onClick={(e) => { e.stopPropagation(); onUnlock(); }} // If you only want the button to trigger unlock, not the whole card
            >
              Unlock Details
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewDisplay; 