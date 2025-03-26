import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { getRegions, getCountries, getFeaturedCountries } from '@/services/honeymoonService';

// Cache objects outside component to persist between renders
let cachedRegions: any[] = [];
let cachedCountries: any[] = [];
let cachedFeaturedCountries: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface DestinationsPopupProps {
  onClose: () => void;
}

const DestinationsPopup = ({ onClose }: DestinationsPopupProps) => {
  const navigate = useNavigate();
  const [regions, setRegions] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [featuredCountries, setFeaturedCountries] = useState<any[]>([]);
  const [activeRegion, setActiveRegion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Check if cache is valid (not expired)
      const now = Date.now();
      const isCacheValid = lastFetchTime > 0 && (now - lastFetchTime) < CACHE_DURATION;
      
      // Use cache if valid and not empty
      if (isCacheValid && cachedRegions.length && cachedCountries.length) {
        setRegions(cachedRegions);
        setCountries(cachedCountries);
        setFeaturedCountries(cachedFeaturedCountries);
        setLoading(false);
      } else {
        // Fetch fresh data if cache is invalid or empty
        try {
          const [regionsData, countriesData, featuredData] = await Promise.all([
            getRegions(),
            getCountries(),
            getFeaturedCountries()
          ]);
          
          console.log('Featured countries:', featuredData);
          
          // Update state
          setRegions(regionsData);
          setCountries(countriesData);
          setFeaturedCountries(featuredData);
          
          // Update cache
          cachedRegions = regionsData;
          cachedCountries = countriesData;
          cachedFeaturedCountries = featuredData;
          lastFetchTime = now;
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Add event listener to close when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.destinations-popup') && !target.closest('button')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Force cache refresh on component mount
  useEffect(() => {
    lastFetchTime = 0; // Reset cache timestamp
  }, []);

  // Get countries for a specific region
  const getCountriesForRegion = (regionId: string) => {
    return countries.filter(country => country.region_id === regionId);
  };

  // Get a few featured countries for "What's Hot" section
  const hotDestinations = countries.slice(0, 6);

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleRegionHover = (region: any) => {
    setActiveRegion(region);
  };

  console.log('Component state:', {
    loading,
    regionsCount: regions.length,
    countriesCount: countries.length,
    featuredCountriesCount: featuredCountries.length,
    featuredCountries: featuredCountries
  });

  useEffect(() => {
    console.log('featuredCountries state updated:', featuredCountries);
  }, [featuredCountries]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="destinations-popup bg-white w-full max-w-7xl shadow-lg mt-16 rounded-b-lg overflow-hidden">
        <div className="flex justify-end p-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex">
          {/* Left Panel - Regions (1/3 width) */}
          <div className="w-1/3 border-r border-gray-200 p-8">
            <h3 className="text-xl font-serif font-bold mb-6 text-travel-green">Regions</h3>
            <ul className="space-y-4">
              {loading ? (
                Array(8).fill(0).map((_, index) => (
                  <li key={index} className="h-6 bg-gray-200 animate-pulse rounded w-3/4"></li>
                ))
              ) : (
                regions.map((region) => (
                  <li key={region.id}>
                    <button 
                      onMouseEnter={() => handleRegionHover(region)}
                      onClick={() => handleNavigate(`/regions/${region.slug}`)}
                      className={`font-serif text-lg uppercase font-medium hover:text-travel-coral flex items-center ${
                        activeRegion?.id === region.id ? 'text-travel-coral' : ''
                      }`}
                    >
                      {region.name}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-8">
              <button 
                onClick={() => handleNavigate('/destinations')}
                className="font-medium text-travel-green hover:text-travel-coral"
              >
                View all destinations
              </button>
            </div>
          </div>
          
          {/* Right Panel - Countries or What's Hot (2/3 width) */}
          <div className="w-2/3 p-8">
            {activeRegion ? (
              // Show countries for the active region
              <>
                <h3 className="text-xl font-serif font-bold mb-6 text-travel-green">
                  {activeRegion.name} Destinations
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {getCountriesForRegion(activeRegion.id).map((country) => (
                    <button 
                      key={country.id} 
                      onClick={() => handleNavigate(`/destinations/${country.slug}`)}
                      className="group"
                    >
                      <div className="relative overflow-hidden rounded-md mb-2 aspect-w-16 aspect-h-10">
                        {country.featured_image ? (
                          <img 
                            src={country.featured_image} 
                            alt={country.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200"></div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-20 transition-opacity group-hover:bg-opacity-10"></div>
                      </div>
                      <h4 className="font-serif font-medium text-lg group-hover:text-travel-coral transition-colors">
                        {country.name}
                      </h4>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              // Show What's Hot section by default
              <>
                <h3 className="text-xl font-serif font-bold mb-6 text-travel-green">
                  What's Hot ({featuredCountries.length} countries)
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {loading ? (
                    Array(6).fill(0).map((_, index) => (
                      <div key={index} className="h-40 bg-gray-200 animate-pulse rounded"></div>
                    ))
                  ) : (
                    hotDestinations.map((destination) => (
                      <button 
                        key={destination.id}
                        onClick={() => handleNavigate(`/destinations/${destination.slug}`)}
                        className="group"
                      >
                        <div className="relative overflow-hidden rounded-md mb-2 aspect-w-16 aspect-h-10">
                          {destination.featured_image ? (
                            <img 
                              src={destination.featured_image} 
                              alt={destination.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200"></div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-20 transition-opacity group-hover:bg-opacity-10"></div>
                        </div>
                        <h4 className="font-serif font-medium text-lg group-hover:text-travel-coral transition-colors">
                          {destination.name}
                        </h4>
                      </button>
                    ))
                  )}
                </div>
                {!loading && featuredCountries.length === 0 && (
                  <p>No featured countries found. Please mark some countries as featured.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationsPopup;
