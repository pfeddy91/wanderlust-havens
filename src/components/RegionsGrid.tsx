
import React, { useEffect, useState } from 'react';
import { getRegions } from '@/services/honeymoonService';
import RegionCard from './RegionCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const RegionsGrid = () => {
  const [regions, setRegions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchRegions = async () => {
      setIsLoading(true);
      try {
        const regionsData = await getRegions();
        setRegions(regionsData);
      } catch (error) {
        console.error('Failed to fetch regions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegions();
  }, []);

  const handleRegionClick = (region: any) => {
    setSelectedRegion(region);
    setOpenDialog(true);
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

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Explore Regions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regions.map((region) => (
          <RegionCard 
            key={region.id} 
            region={region} 
            onClick={() => handleRegionClick(region)}
          />
        ))}
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-4xl">
          {selectedRegion && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRegion.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {selectedRegion.featured_image && (
                  <img 
                    src={selectedRegion.featured_image} 
                    alt={selectedRegion.name} 
                    className="w-full h-64 object-cover rounded-md mb-4"
                  />
                )}
                <p className="text-muted-foreground">
                  {selectedRegion.description || `Explore the beautiful region of ${selectedRegion.name}`}
                </p>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Countries in this region</h3>
                  <p className="text-sm text-muted-foreground">
                    Coming soon: List of countries in {selectedRegion.name}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegionsGrid;
