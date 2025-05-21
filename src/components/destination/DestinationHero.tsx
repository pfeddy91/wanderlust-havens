import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DestinationHeroProps {
  country: {
    name: string;
    featured_image: string | null;
    id: string;
    description?: string | null;
    rationale?: string | null;
    region_id?: string | null;
    best_period?: string | null;
    distance?: string | null;
    comfort?: string | null;
  };
}

interface Region {
  id: string;
  name: string;
  slug: string;
}

interface TourImage {
  id: string;
  image_url: string;
  tour_id: string;
  is_primary: boolean;
  is_featured: boolean;
  display_order: number;
}


const DestinationHero = ({ country }: DestinationHeroProps) => {
  const [region, setRegion] = useState<Region | null>(null);
  const [tourImages, setTourImages] = useState<TourImage[]>([]);
  const [imageIndex, setImageIndex] = useState(0);

  // Format country name for title case
  const formatCountryName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Fetch region data and tour images
  useEffect(() => {
    // Fetch data from your API or service
    const fetchData = async () => {
      try {
        // Example URL - replace with your actual API endpoints
        if (country.region_id) {
          const regionResponse = await fetch(`/api/regions/${country.region_id}`);
          if (regionResponse.ok) {
            try {
              const regionData = await regionResponse.json();
              setRegion(regionData);
            } catch (jsonError) {
              console.error("Error parsing region data JSON:", jsonError);
              // Continue execution even if this fails
            }
          } else {
            console.log(`Region API returned status: ${regionResponse.status}`);
          }
        }

        // Create placeholder tour images until API is fixed
        setTourImages(
          PLACEHOLDER_IMAGES.map((url, index) => ({
            id: `placeholder-${index}`,
            image_url: url,
            tour_id: `tour-${index}`,
            is_primary: index === 0,
            is_featured: index < 2,
            display_order: index
          }))
        );

        // Commented out failing API call - for reference
        /* 
        const tourImagesResponse = await fetch(`/api/countries/${country.id}/tour-images`);
        if (tourImagesResponse.ok) {
          const images = await tourImagesResponse.json();
          setTourImages(images);
        }
        */
      } catch (error) {
        console.error("Error in DestinationHero fetchData:", error);
        // Continue with default values - don't let this error block rendering
      }
    };

    fetchData();
  }, [country.id, country.region_id]);

  // Default description if none is provided
  const defaultDescription = `${formatCountryName(country.name)} offers an unforgettable experience for luxury travelers seeking unique adventures and cultural immersion. From breathtaking landscapes to exquisite cuisine, this destination promises memories that will last a lifetime.`;
  
  // Default rationale if none is provided
  const defaultRationale = `Our curated experiences showcase the best this beautiful country has to offer, from hidden gems to iconic landmarks. Immerse yourself in local culture, savor authentic cuisine, and relax in handpicked luxury accommodations that reflect the unique character of ${formatCountryName(country.name)}.`;

  // Use provided description or default
  const description = country.description || defaultDescription;
  
  // Use provided rationale or default
  const rationale = country.rationale || defaultRationale;

  // Background image
  const backgroundImage = country.featured_image || 
    'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1500&q=80';

  // Default values for travel metrics
  const bestPeriod = country.best_period || "March to June / Sept to Nov";
  const distance = country.distance || "3.5-4 hour flight from Europe";
  const comfort = country.comfort || "High comfort, excellent infrastructure";

  // Handle image gallery navigation
  const nextImages = () => {
    if (imageIndex + 3 < tourImages.length) {
      setImageIndex(imageIndex + 3);
    }
  };

  const prevImages = () => {
    if (imageIndex - 3 >= 0) {
      setImageIndex(imageIndex - 3);
    }
  };

  const visibleImages = tourImages.slice(imageIndex, imageIndex + 3);
  const hasNextImages = imageIndex + 3 < tourImages.length;
  const hasPrevImages = imageIndex > 0;

  return (
    <div className="flex flex-col md:flex-row md:h-screen">
      {/* Left Box - Photo and Title */}
      <div className="relative w-full md:w-1/2 h-[50vh] md:h-full">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        </div>
        
        <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4">
          <h1 className="text-4xl md:text-6xl font-serif text-white tracking-wider mb-0 font-normal">
            Luxury Honeymoon
            <br />
            <span className="text-3xl md:text-5xl mt-2 block">
              In {formatCountryName(country.name)}
            </span>
          </h1>
        </div>
      </div>
      
      {/* Right Box - Panel with Navigation, Description, and Travel Info */}
      <div className="w-full md:w-1/2 bg-white p-8 md:p-12 md:h-full md:overflow-y-auto">
        {/* Navigation */}
        <div className="flex items-center text-gray-400 text-sm mb-8">
          <Link to="/" className="hover:text-gray-600 transition-colors">
            <Home size={14} />
          </Link>
          <ChevronRight size={14} className="mx-2" />
          <Link to="/destinations" className="hover:text-gray-600 transition-colors">
            Destinations
          </Link>
          {region && (
            <>
              <ChevronRight size={14} className="mx-2" />
              <Link to={`/regions/${region.slug}`} className="hover:text-gray-600 transition-colors">
                {region.name}
              </Link>
            </>
          )}
          <ChevronRight size={14} className="mx-2" />
          <span className="text-gray-800">{formatCountryName(country.name)}</span>
        </div>
        
        {/* Description - Now in two distinct blocks */}
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold mb-6">
            Discover {formatCountryName(country.name)}
          </h2>
          
          <div className="flex flex-col gap-6">
            {/* Block 1: Main description (countries.description) - now sans-serif */}
            <p className="text-lg leading-relaxed text-gray-700">{description}</p>
            
            {/* Block 2: Rationale (countries.rationale) - already sans-serif by default */}
            <p className="text-lg leading-relaxed text-gray-700">{rationale}</p>
          </div>
        </div>
        
        {/* Shorter divider between description and travel metrics - only length of DISTANCE */}
        <div className="flex justify-center mb-8">
          <div className="border-t border-gray-200 w-28"></div>
        </div>
        
        {/* Travel Metrics Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            {/* When */}
            <div className="flex-1 text-center">
              <h3 className="text-xl font-sans font-bold mb-2" style={{ color: "#063737" }}>
                WHEN
              </h3>
              <p className="text-lg font-light">{bestPeriod}</p>
            </div>
            
            {/* Distance */}
            <div className="flex-1 text-center">
              <h3 className="text-xl font-sans font-bold mb-2" style={{ color: "#A25524" }}>
                DISTANCE
              </h3>
              <p className="text-lg font-light">{distance}</p>
            </div>
            
            {/* Comfort */}
            <div className="flex-1 text-center">
              <h3 className="text-xl font-sans font-bold mb-2" style={{ color: "#808000" }}>
                COMFORT
              </h3>
              <p className="text-lg font-light">{comfort}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationHero;
