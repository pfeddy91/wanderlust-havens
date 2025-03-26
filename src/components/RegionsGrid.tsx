import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCountries } from '@/services/honeymoonService';
import RegionCard from './RegionCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const RegionsGrid = () => {
  const navigate = useNavigate();
  const [favoriteCountries, setFavoriteCountries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchFavoriteCountries = async () => {
      setIsLoading(true);
      try {
        // Get all countries
        const countriesData = await getCountries();
        
        // Filter to only include favorite destinations
        const favorites = countriesData.filter(
          (country: any) => country.favourite_destination === true
        );
        
        console.log('Favorite countries:', favorites);
        setFavoriteCountries(favorites);
      } catch (error) {
        console.error('Failed to fetch favorite countries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavoriteCountries();
  }, []);

  const handleCountryClick = (country: any) => {
    // Navigate directly to the country page
    navigate(`/destinations/${country.slug}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-60 bg-gray-200 animate-pulse rounded-md"></div>
          ))}
        </div>
      </div>
    );
  }

  // If no favorite countries are found
  if (favoriteCountries.length === 0) {
    return (
      <div className="container mx-auto p-12">
        <h2 className="text-5xl md:text-5xl font-serif font-bold text-center mb-12">Our Favourite Destinations</h2>
        <p className="text-center text-gray-600">No favorite destinations found. Please mark some countries as favorites.</p>
      </div>
    );
  }

  return (
    <section className="py-8 bg-travel-cream"> 
      <div className="container mx-auto p-4">
        <h2 className="text-4xl md:text-4xl font-serif font-bold text-center mb-8">Our Favourite Destinations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteCountries.map((country) => (
            <div 
              key={country.id}
              onClick={() => handleCountryClick(country)}
              className="cursor-pointer group"
            >
              <div className="relative overflow-hidden rounded-lg shadow-md h-64">
                {country.featured_image ? (
                  <img 
                    src={country.featured_image} 
                    alt={country.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No image available</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                  <h3 className="text-white text-2xl font-serif font-medium p-6 w-full">
                    {country.name}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RegionsGrid;
