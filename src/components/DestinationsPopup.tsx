
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { getRegions, getCountries } from '@/services/honeymoonService';

interface DestinationsPopupProps {
  onClose: () => void;
}

const DestinationsPopup = ({ onClose }: DestinationsPopupProps) => {
  const navigate = useNavigate();
  const [regions, setRegions] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [regionsData, countriesData] = await Promise.all([
          getRegions(),
          getCountries()
        ]);
        setRegions(regionsData);
        setCountries(countriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
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

  // Get a few featured countries for "What's Hot" section
  const hotDestinations = countries.slice(0, 6);

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="destinations-popup bg-white w-full max-w-7xl shadow-lg mt-16 rounded-b-lg overflow-hidden">
        <div className="flex justify-end p-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
          {/* Regions Column */}
          <div>
            <h3 className="text-xl font-serif font-bold mb-4 text-travel-green">Regions</h3>
            <ul className="space-y-3">
              {loading ? (
                Array(8).fill(0).map((_, index) => (
                  <li key={index} className="h-6 bg-gray-200 animate-pulse rounded w-3/4"></li>
                ))
              ) : (
                regions.map((region) => (
                  <li key={region.id}>
                    <button 
                      onClick={() => handleNavigate(`/regions/${region.slug}`)}
                      className="font-serif text-lg uppercase font-medium hover:text-travel-coral flex items-center"
                    >
                      {region.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          
          {/* Countries Column */}
          <div>
            <h3 className="text-xl font-serif font-bold mb-4 text-travel-green">Countries</h3>
            <div className="grid grid-cols-2 gap-2">
              {loading ? (
                Array(12).fill(0).map((_, index) => (
                  <div key={index} className="h-6 bg-gray-200 animate-pulse rounded w-3/4"></div>
                ))
              ) : (
                countries.slice(0, 20).map((country) => (
                  <button 
                    key={country.id} 
                    onClick={() => handleNavigate(`/destinations/${country.slug}`)}
                    className="font-medium text-gray-700 hover:text-travel-coral flex items-center text-left"
                  >
                    {country.name}
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </button>
                ))
              )}
            </div>
            <button 
              onClick={() => handleNavigate('/destinations')}
              className="mt-4 inline-block font-medium text-travel-green hover:text-travel-coral"
            >
              View all countries
            </button>
          </div>
          
          {/* What's Hot Section */}
          <div>
            <h3 className="text-xl font-serif font-bold mb-4 text-travel-green">What's Hot</h3>
            <div className="grid grid-cols-2 gap-3">
              {loading ? (
                Array(6).fill(0).map((_, index) => (
                  <div key={index} className="h-24 bg-gray-200 animate-pulse rounded"></div>
                ))
              ) : (
                hotDestinations.map((destination) => (
                  <button 
                    key={destination.id}
                    onClick={() => handleNavigate(`/destinations/${destination.slug}`)}
                    className="relative overflow-hidden rounded-md group"
                  >
                    <div className="aspect-w-16 aspect-h-10 bg-gray-200">
                      {destination.featured_image ? (
                        <img 
                          src={destination.featured_image || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&q=80'} 
                          alt={destination.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-travel-light-brown"></div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <span className="text-white font-serif font-medium drop-shadow-md">
                          {destination.name}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationsPopup;
