import React, { useEffect, useState } from 'react';
import { Tour, Country as TourCountry } from '@/types/tour'; // Assuming Country type is also in tour.ts or imported there
import { Link } from 'react-router-dom';
import { ChevronRight, Home, Calendar, Clock, PoundSterling } from 'lucide-react';
import { Button } from '@/components/ui/button'; // For Enquire Now button
// Assuming a type for Region, if not already in your types
interface Region {
  id: string;
  name: string;
  slug: string;
}

interface TourHeroProps {
  tour: Tour;
  // countryNames is still useful for a quick display if detailed objects aren't fully there
  // but we'll try to use tour.country_details for richer breadcrumb data.
}

const TourHero = ({ tour }: TourHeroProps) => {
  const [primaryCountry, setPrimaryCountry] = useState<TourCountry | null>(null);
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    if (tour.country_details && tour.country_details.length > 0) {
      const firstCountry = tour.country_details[0];
      setPrimaryCountry(firstCountry as any); // Cast if structure is slightly different from TourCountry type

      // Assuming region data might be nested or needs a separate fetch based on country.
      // For simplicity, let's assume region info is on the firstCountry object
      // or you'd fetch it here.
      if ((firstCountry as any).region) { // Example: if region is nested in country_details
        setRegion((firstCountry as any).region as Region);
      } else if ((firstCountry as any).region_id) {
        // Placeholder: Fetch region by firstCountry.region_id if necessary
        // fetchRegionById((firstCountry as any).region_id).then(setRegion);
        console.warn("Region ID found, but fetching region by ID is not implemented in this example.");
      }
    }
  }, [tour.country_details]);

  const heroImageUrl = 
    (tour.tour_images?.find(img => img.is_primary)?.image_url) ||
    (tour.tour_images?.find(img => img.is_featured)?.image_url) ||
    (tour.tour_images?.[0]?.image_url) ||
    tour.featured_image ||
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1500&q=80'; // Absolute fallback

  const formatTourTitle = (title?: string | null): string => {
    // Example: "A Week In Paradise" -> "A Week in Paradise"
    // This is a simple title case, adjust as needed
    if (!title || typeof title !== 'string' || title.length === 0) {
      return 'Untitled Tour'; // Or an empty string, or handle as an error
    }
    return title.charAt(0).toUpperCase() + title.slice(1);
  };
  
  const formattedPrice = tour.guide_price_usd?.toLocaleString() || tour.guide_price?.toLocaleString();


  return (
    <div className="flex flex-col md:flex-row md:min-h-[85vh] lg:min-h-[90vh] bg-slate-50"> {/* Ensure overall container takes height */}
      {/* Left Column - Image */}
      <div className="relative w-full md:w-1/2 h-[50vh] md:h-auto"> {/* md:h-auto to fill parent height */}
        <img
          src={heroImageUrl}
          alt={tour.title || 'Tour hero image'}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Optional: Subtle overlay if needed for text contrast, but title is now on the right */}
        {/* <div className="absolute inset-0 bg-black bg-opacity-10"></div> */}
      </div>

      {/* Right Column - Details Panel */}
      <div className="w-full md:w-1/2 bg-white p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center"> {/* Added flex flex-col justify-center */}
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center text-gray-500 text-sm mb-4 md:mb-6 font-serif"> {/* Changed sm:text-base to text-sm */}
          <Link to="/" className="hover:text-primary transition-colors pr-1"> {/* Added pr-1 */}
            <Home size={14} /> {/* Adjusted icon size to match typical text-sm */}
          </Link>
          <ChevronRight size={14} className="mx-2" /> {/* Changed to mx-2 */}
          <Link to="/destinations" className="hover:text-primary transition-colors px-1"> {/* Added px-1 */}
            Destinations
          </Link>
          {region && primaryCountry && ( // Ensure primaryCountry exists for region link
            <>
              <ChevronRight size={14} className="mx-2" /> {/* Changed to mx-2 */}
              <Link to={`/regions/${region.slug}`} className="hover:text-primary transition-colors px-1"> {/* Added px-1 */}
                {region.name}
              </Link>
            </>
          )}
          {primaryCountry && (
            <>
              <ChevronRight size={14} className="mx-2" /> {/* Changed to mx-2 */}
              <Link 
                to={`/destinations/${(primaryCountry as any).slug}`}  // Use slug from primaryCountry
                className="hover:text-primary transition-colors px-1" // Added px-1
              >
                {primaryCountry.name}
              </Link>
            </>
          )}
          <ChevronRight size={14} className="mx-2" /> {/* Changed to mx-2 */}
          <span className="text-gray-800 font-medium pl-1">{tour.title || 'Tour'}</span> {/* Added pl-1 */}
        </nav>

        {/* Tour Title */}
        <h1 className="font-serif text-3xl font-bold text-gray-800 mb-6 md:mb-8 tracking-wide">
          {formatTourTitle(tour.title)}
        </h1>

        {/* Tour Summary/Description */}
        {tour.summary && (
          <div className="font-sans text-lg text-gray-700 mb-8 md:mb-10 leading-relaxed">
            <p>{tour.summary}</p>
          </div>
        )}
        
        {/* Divider */}
        <div className="my-4 md:my-6">
            <div className="border-t border-gray-200 w-28 mx-auto md:mx-0"></div>
        </div>

        {/* Tour Details (Metrics) */}
        {(tour.duration || tour.best_time_to_travel || formattedPrice) && (
          <div className="mb-8 md:mb-10">
            <ul className="space-y-5">
              {tour.duration && (
                <li className="flex items-center">
                  <Clock className="h-6 w-6 text-primary mr-3 shrink-0" />
                  <div>
                    <h3 className="text-base font-serif font-semibold uppercase text-gray-500 mb-0.5 tracking-wider">Duration</h3>
                    <p className="font-sans text-lg font-light text-gray-800">{tour.duration} {Number(tour.duration) > 1 ? 'days' : 'day'}</p>
                  </div>
                </li>
              )}
              {tour.best_time_to_travel && (
                <li className="flex items-center">
                  <Calendar className="h-6 w-6 text-primary mr-3 shrink-0" />
                  <div>
                    <h3 className="text-base font-serif font-semibold uppercase text-gray-500 mb-0.5 tracking-wider">Best time to travel</h3>
                    <p className="font-sans text-lg font-light text-gray-800">{tour.best_time_to_travel}</p>
                  </div>
                </li>
              )}
              {formattedPrice && (
                 <li className="flex items-center">
                  <PoundSterling className="h-6 w-6 text-primary mr-3 shrink-0" />
                  <div>
                    <h3 className="text-base font-serif font-semibold uppercase text-gray-500 mb-0.5 tracking-wider">Guide Price from</h3>
                    <p className="font-sans text-lg font-light text-gray-800">
                      £{formattedPrice} <span className="text-sm text-gray-600">pp</span>
                    </p>
                  </div>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TourHero;
