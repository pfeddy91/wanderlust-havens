import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/utils/supabaseClient';
import { ArrowLeft } from 'lucide-react';
import ProgressiveImage from '@/components/ui/ProgressiveImage';
import { ImagePresets } from '@/utils/imageOptimization';

interface Region {
  id: string;
  name: string;
  slug: string;
  description?: string;
  featured_image?: string;
}

interface Country {
  id: string;
  name: string;
  slug: string;
  description?: string;
  featured_image?: string;
  mobile_image_url?: string;
  region_id: string;
}

const RegionCountries = () => {
  const { slug } = useParams<{ slug: string }>();
  const [region, setRegion] = useState<Region | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchRegionAndCountries = async () => {
      try {
        // Fetch region details
        const { data: regionData, error: regionError } = await supabase
          .from('regions')
          .select('id, name, slug, description, featured_image')
          .eq('slug', slug)
          .single();

        if (regionError) {
          console.error('Error fetching region:', regionError);
          return;
        }

        setRegion(regionData);

        // Fetch countries in this region
        const { data: countriesData, error: countriesError } = await supabase
          .from('countries')
          .select('id, name, slug, description, featured_image, mobile_image_url, region_id')
          .eq('region_id', regionData.id)
          .order('name');

        if (countriesError) {
          console.error('Error fetching countries:', countriesError);
          return;
        }

        // Filter out any invalid countries
        const validCountries = countriesData?.filter(country => 
          country.name && country.name.trim() !== ''
        ) || [];

        console.log('Fetched valid countries:', validCountries);
        setCountries(validCountries);
      } catch (error) {
        console.error('Error in fetchRegionAndCountries:', error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchRegionAndCountries();
    }
  }, [slug]);

  // Completely revised URL construction logic
  const handleCountryClick = (country: Country) => {
    if (!region || !country) return;
    
    // Debug logging to see what we're working with
    console.log("Original region slug:", region.slug);
    console.log("Original country slug:", country.slug);
    
    // Extract the base region name (without any prefixes)
    // First, remove any "honeymoon-" prefix
    let baseRegionSlug = region.slug.replace(/^honeymoon-/, '');
    
    // Extract the base country name (without any region prefixes)
    let baseCountrySlug = country.slug;
    
    // Check if country slug starts with region slug and remove it
    if (baseCountrySlug.startsWith(`${baseRegionSlug}-`)) {
      baseCountrySlug = baseCountrySlug.substring(baseRegionSlug.length + 1);
    }
    
    // Check if country slug starts with "honeymoon-region-" pattern
    const honeymoonRegionPrefix = `honeymoon-${baseRegionSlug}-`;
    if (baseCountrySlug.startsWith(honeymoonRegionPrefix)) {
      baseCountrySlug = baseCountrySlug.substring(honeymoonRegionPrefix.length);
    }
    
    // Construct the final URL with the correct format
    const destinationUrl = `/destinations/honeymoon-${baseRegionSlug}-${baseCountrySlug}`;
    
    console.log("Clean region slug:", baseRegionSlug);
    console.log("Clean country slug:", baseCountrySlug);
    console.log("Final destination URL:", destinationUrl);
    
    navigate(destinationUrl);
  };

  return (
    <section className="py-16 bg-white">
      <div className={`container mx-auto ${isMobile ? 'px-4' : 'px-4'}`}>
        {/* Back button */}
        <Link 
          to="/destinations" 
          className="inline-flex items-center text-gray-600 hover:text-travel-green mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to All Regions
        </Link>

        {loading ? (
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-12"></div>
            {isMobile ? (
              // Mobile loading: rectangular tile skeletons
              <div className="space-y-2">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-40 w-full bg-gray-200 animate-pulse"></div>
                ))}
              </div>
            ) : (
              // Desktop loading: existing grid
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-80 bg-gray-200 rounded"></div>
                ))}
              </div>
            )}
          </div>
        ) : region ? (
          <>
            <div className="mb-12 text-center">
              <h1 className="text-4xl font-serif font-bold mb-4">Destinations in {region.name}</h1>
              {region.description && (
                <p className="text-gray-600 max-w-3xl mx-auto text-lg">{region.description}</p>
              )}
            </div>

            {countries.length > 0 ? (
              <div className="grid-container">
                {/* Desktop layout - Keep existing 2 columns */}
                <div className="hidden md:grid grid-cols-2 gap-5">
                  {countries.map((country) => (
                    <div
                      key={country.id}
                      className="relative overflow-hidden rounded-lg cursor-pointer group aspect-[4/3]"
                      onClick={() => handleCountryClick(country)}
                    >
                      <ProgressiveImage
                        src={country.featured_image || `https://source.unsplash.com/featured/?${country.name},travel`}
                        alt={country.name}
                        className="w-full h-full"
                        optimization={ImagePresets.cardLarge}
                        placeholder="shimmer"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center group-hover:from-black/50 transition-all duration-700">
                        <h3 className="text-white font-serif text-3xl font-medium text-center px-4 group-hover:scale-105 transition-transform duration-700">
                          {country.name}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Mobile Layout - New Rectangular Tiles */}
                <div className="md:hidden space-y-2">
                  {countries.map((country) => (
                    <div
                      key={country.id}
                      className="relative w-full h-40 cursor-pointer overflow-hidden"
                      onClick={() => handleCountryClick(country)}
                    >
                      {/* Background Image */}
                      <img
                        src={country.mobile_image_url || country.featured_image || `https://source.unsplash.com/featured/?${country.name},travel`}
                        alt={country.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Dark Overlay */}
                      <div className="absolute inset-0 bg-black/20" />
                      
                      {/* Text Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <h3 className="text-white text-2xl font-serif font-semibold tracking-wide">
                          {country.name}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No destinations found for this region.</p>
                <Link 
                  to="/destinations" 
                  className="inline-block bg-travel-green text-white px-6 py-2 rounded-md hover:bg-travel-dark-green transition-colors"
                >
                  Explore Other Regions
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-serif font-bold mb-4">Region Not Found</h2>
            <p className="text-gray-600 mb-4">The region you're looking for doesn't exist.</p>
            <Link 
              to="/destinations" 
              className="inline-block bg-travel-green text-white px-6 py-2 rounded-md hover:bg-travel-dark-green transition-colors"
            >
              View All Destinations
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default RegionCountries; 