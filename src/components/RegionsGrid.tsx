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

  const handleRegionClick = (slug: string) => {
    navigate(`/destinations/regions/${slug}`);
  };

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
  
  // Ensure we have at least 6 countries, otherwise pad with duplicates or empty items
  let displayCountries = [...favoriteCountries];
  while (displayCountries.length < 6 && favoriteCountries.length > 0) {
    displayCountries.push(favoriteCountries[displayCountries.length % favoriteCountries.length]);
  }
  displayCountries = displayCountries.slice(0, 6); // Take exactly 6

  return (
    <section className="py-8 bg-travel-cream"> 
    <div className="container mx-auto p-4">
        <h2 className="text-4xl md:text-4xl font-serif font-bold text-center mb-8">Our Favourite Destinations</h2>
        
        {/* Desktop layout - 3 columns */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Mobile Mosaic Layout - based on the screenshot with inverted top section */}
        <div className="md:hidden flex flex-col gap-3">
          {/* Top section: two stacked on left, tall right (INVERTED) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left column with two square tiles (MOVED from right) */}
            <div className="flex flex-col gap-3">
              {/* Top left square (Italy) */}
              <div 
                onClick={() => handleCountryClick(displayCountries[1])}
                className="cursor-pointer"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg shadow-md">
                  <img 
                    src={displayCountries[1]?.featured_image || 'https://via.placeholder.com/300'}
                    alt={displayCountries[1]?.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                    <h3 className="text-white text-lg font-serif font-medium p-3 w-full">
                      {displayCountries[1]?.name}
                    </h3>
                  </div>
                </div>
              </div>
              
              {/* Bottom left square (Japan) */}
              <div 
                onClick={() => handleCountryClick(displayCountries[2])}
                className="cursor-pointer"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg shadow-md">
                  <img 
                    src={displayCountries[2]?.featured_image || 'https://via.placeholder.com/300'}
                    alt={displayCountries[2]?.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                    <h3 className="text-white text-lg font-serif font-medium p-3 w-full">
                      {displayCountries[2]?.name}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right tall tile (French Polynesia - MOVED from left) */}
            <div 
              onClick={() => handleCountryClick(displayCountries[0])}
              className="cursor-pointer"
            >
              <div className="relative aspect-[1/2] h-full overflow-hidden rounded-lg shadow-md">
                <img 
                  src={displayCountries[0]?.featured_image || 'https://via.placeholder.com/300x600'}
                  alt={displayCountries[0]?.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                  <h3 className="text-white text-lg font-serif font-medium p-3 w-full">
                    {displayCountries[0]?.name}
                  </h3>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom section: tall left, two stacked on right (NO CHANGE) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left tall tile (Mexico) */}
            <div 
              onClick={() => handleCountryClick(displayCountries[3])}
              className="cursor-pointer"
            >
              <div className="relative aspect-[1/2] h-full overflow-hidden rounded-lg shadow-md">
                <img 
                  src={displayCountries[3]?.featured_image || 'https://via.placeholder.com/300x600'}
                  alt={displayCountries[3]?.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                  <h3 className="text-white text-lg font-serif font-medium p-3 w-full">
                    {displayCountries[3]?.name}
                  </h3>
                </div>
              </div>
            </div>
            
            {/* Right column with two square tiles */}
            <div className="flex flex-col gap-3">
              {/* Top right square (Namibia) */}
              <div 
                onClick={() => handleCountryClick(displayCountries[4])}
                className="cursor-pointer"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg shadow-md">
                  <img 
                    src={displayCountries[4]?.featured_image || 'https://via.placeholder.com/300'}
                    alt={displayCountries[4]?.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                    <h3 className="text-white text-lg font-serif font-medium p-3 w-full">
                      {displayCountries[4]?.name}
                    </h3>
                  </div>
                </div>
              </div>
              
              {/* Bottom right square (Thailand) */}
              <div 
                onClick={() => handleCountryClick(displayCountries[5])}
                className="cursor-pointer"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg shadow-md">
                  <img 
                    src={displayCountries[5]?.featured_image || 'https://via.placeholder.com/300'}
                    alt={displayCountries[5]?.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                    <h3 className="text-white text-lg font-serif font-medium p-3 w-full">
                      {displayCountries[5]?.name}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
    </section>
  );
};

export default RegionsGrid;
