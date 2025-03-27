import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { ChevronDown } from 'lucide-react';

interface Region {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  featured_image?: string;
}

const AllDestinations = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const { data: regionsData, error: regionsError } = await supabase
          .from('regions')
          .select('id, name, slug, description, featured_image')
          .order('name');

        if (regionsError) {
          console.error('Error fetching regions:', regionsError);
          return;
        }

        // Filter out any regions with null or undefined names
        const validRegions = regionsData?.filter(region => 
          region.name && region.name.trim() !== '' && region.name !== 'World Tour'
        ) || [];
        
        console.log('Fetched valid regions:', validRegions);
        setRegions(validRegions);
        
        if (validRegions.length > 0) {
          setSelectedRegion(validRegions[0]);
        }
      } catch (error) {
        console.error('Error in fetchRegions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRegions();
  }, []);

  const handleRegionSelect = (region: Region) => {
    setSelectedRegion(region);
    setDropdownOpen(false);
    
    // Add navigation to the region page when a region is selected from dropdown
    if (region.slug) {
      navigate(`/destinations/regions/${region.slug}`);
    }
  };

  const handleRegionClick = (region: Region) => {
    if (region.slug) {
      navigate(`/destinations/regions/${region.slug}`);
    }
  };

  // Define tile layout configuration
  const getTileConfig = (index: number, totalRegions: number) => {
    // Special case for the last two tiles - make them equal size
    if (index >= totalRegions - 2) {
      return { gridRow: "span 2", gridColumn: "span 2" }; // Standard size for last two
    }
    
    // Pattern for other tiles
    const patterns = [
      { gridRow: "span 2", gridColumn: "span 1" }, // Tall
      { gridRow: "span 1", gridColumn: "span 1" }, // Standard
      { gridRow: "span 1", gridColumn: "span 2" }, // Wide
      { gridRow: "span 2", gridColumn: "span 2" }, // Large
    ];
    
    return patterns[index % patterns.length];
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Hero section with region selector */}
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            Plan your honeymoon in{" "}
            <div className="relative inline-block text-travel-burgundy">
              <button
                className="flex items-center gap-1 border-b-2 border-travel-green focus:outline-none"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {selectedRegion?.name || "Every Region"}
                <ChevronDown className={`h-5 w-5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg py-1 left-1/2 transform -translate-x-1/2">
                  {regions.map((region) => (
                    <button
                      key={region.id}
                      className="block w-full text-left text-lg px-4 py-2 text-gray-800 hover:bg-gray-100 hover:text-travel-green transition-colors"
                      onClick={() => handleRegionSelect(region)}
                    >
                      {region.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </h2>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, index) => (
              <div 
                key={index} 
                className="animate-pulse bg-gray-200 rounded-lg aspect-[3/4]"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid-container">
            {/* Custom CSS Grid Layout */}
            <div className="hidden md:grid grid-cols-4 auto-rows-[200px] gap-4">
              {regions.map((region, index) => {
                const config = getTileConfig(index, regions.length);
                return (
                  <div
                    key={region.id}
                    className="relative overflow-hidden rounded-lg cursor-pointer group"
                    style={{ 
                      gridRow: config.gridRow, 
                      gridColumn: config.gridColumn 
                    }}
                    onClick={() => handleRegionClick(region)}
                  >
                    <img
                      src={region.featured_image || `https://source.unsplash.com/featured/?${region.name},landscape`}
                      alt={region.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
                      <h3 className="text-white font-serif text-2xl md:text-3xl font-medium">
                        {region.name}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Mobile Layout - 2x2 Grid with Same Size Tiles */}
            <div className="grid md:hidden grid-cols-2 gap-3">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className="relative overflow-hidden rounded-lg cursor-pointer aspect-square"
                  onClick={() => handleRegionClick(region)}
                >
                  <img
                    src={region.featured_image || `https://source.unsplash.com/featured/?${region.name},landscape`}
                    alt={region.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
                    <h3 className="text-white font-serif text-xl font-medium">
                      {region.name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AllDestinations; 