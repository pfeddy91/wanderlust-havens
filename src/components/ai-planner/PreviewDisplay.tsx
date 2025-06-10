import React from 'react';
import { ItineraryPreview } from '@/types/aiPlanner';
import { useNavigate } from 'react-router-dom';

interface PreviewDisplayProps {
  itineraryPreview: ItineraryPreview & {
    duration?: number;
    guide_price?: number;
    slug?: string;
  };
}

const PreviewDisplay: React.FC<PreviewDisplayProps> = ({ itineraryPreview }) => {
  const navigate = useNavigate();

  const imageUrl = itineraryPreview.featured_image || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';

  const handleNavigateToTour = () => {
    if (itineraryPreview.slug) {
      navigate(`/tours/${itineraryPreview.slug}?from=planner`);
    } else {
      console.warn("Preview item is missing a slug, cannot navigate:", itineraryPreview.title);
    }
  };

  const formatCountriesForCategory = () => {
    if (!itineraryPreview.countries || itineraryPreview.countries.length === 0) {
      return 'Multiple Destinations';
    }
    if (itineraryPreview.countries.length === 1) {
      return itineraryPreview.countries[0];
    }
    return itineraryPreview.countries.join(' & ');
  };

  return (
    <button
      onClick={handleNavigateToTour}
      className="relative z-10 flex h-[23rem] w-64 flex-col items-start justify-between overflow-hidden rounded-xl bg-gray-100 p-6 shadow-lg transition-all hover:shadow-xl md:h-[35rem] md:w-[20.9rem] dark:bg-neutral-900"
    >
      {/* Top Gradient Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-2/3 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
      
      {/* Bottom Gradient Overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1/3 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      {/* Top Content - Category and Title */}
      <div className="relative z-30">
        <p className="text-left font-sans text-xs font-medium uppercase tracking-wider text-white/80 md:text-sm">
          {formatCountriesForCategory()}
        </p>
        <p className="mt-1 max-w-xs text-left font-serif text-lg [text-wrap:balance] text-white md:text-2xl">
          {itineraryPreview.title}
        </p>
      </div>

      {/* Bottom Content - View Moon Button */}
      <div className="relative z-30">
        <div className="inline-block border border-white/80 px-4 py-2 rounded-lg tracking-wider font-serif text-lg font-medium text-white backdrop-blur-sm bg-white/10 transition-all hover:bg-white/20 hover:border-white">
          Explore Moon
        </div>
      </div>

      {/* Background Image */}
      <img
        src={imageUrl}
        alt={itineraryPreview.title}
        className="absolute inset-0 z-10 h-full w-full object-cover"
        loading="lazy"
      />
    </button>
  );
};

export default PreviewDisplay; 