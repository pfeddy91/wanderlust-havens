import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';
import { formatCountryName } from '@/utils/formatters';

interface DestinationImagesProps {
  countryId: string;
  countryName: string;
}

interface DestinationImage {
  id: string;
  image_url: string;
  alt_text?: string;
}

const DestinationImages = ({ countryId, countryName }: DestinationImagesProps) => {
  const [destinationImages, setDestinationImages] = useState<DestinationImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imagesPerPage = 3; // Number of images to show at once

  // Fetch destination images
  useEffect(() => {
    const fetchDestinationImages = async () => {
      if (!countryId) return;
      
      try {
        console.log(`Fetching destination images for country ID: ${countryId}`);
        
        // Query the destination_images table - increased limit to 12
        const { data, error } = await supabase
          .from('destination_images')
          .select('id, image_url, alt_text')
          .eq('country_id', countryId)
          .limit(12);
        
        if (error) {
          console.error('Error fetching destination images:', error);
          return;
        }
        
        console.log(`Found ${data?.length || 0} destination images`);
        
        if (data && data.length > 0) {
          setDestinationImages(data);
        } else {
          // If no destination images, try falling back to tour images
          const { data: tourImgData } = await supabase
            .from('tour_images')
            .select('id, image_url')
            .eq('country_id', countryId)
            .limit(12);
            
          if (tourImgData && tourImgData.length > 0) {
            setDestinationImages(tourImgData.map(img => ({
              id: img.id,
              image_url: img.image_url,
              alt_text: `${countryName} tour image`
            })));
          }
        }
      } catch (error) {
        console.error('Error in destination images fetch:', error);
      }
    };

    fetchDestinationImages();
  }, [countryId, countryName]);

  // Navigation functions for image gallery
  const nextImages = () => {
    if (currentImageIndex + imagesPerPage < destinationImages.length) {
      setCurrentImageIndex(currentImageIndex + imagesPerPage);
    } else {
      // Loop back to the beginning
      setCurrentImageIndex(0);
    }
  };

  const prevImages = () => {
    if (currentImageIndex - imagesPerPage >= 0) {
      setCurrentImageIndex(currentImageIndex - imagesPerPage);
    } else {
      // Loop to the end
      setCurrentImageIndex(Math.max(0, Math.floor(destinationImages.length / imagesPerPage) * imagesPerPage));
    }
  };

  // Get current visible images
  const visibleImages = destinationImages.slice(
    currentImageIndex, 
    Math.min(currentImageIndex + imagesPerPage, destinationImages.length)
  );

  // Don't render anything if no images
  if (destinationImages.length === 0) {
    return null;
  }

  return (
    <div className="bg-white py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-serif font-bold mb-8 text-center">
          Discover the Beauty of {formatCountryName(countryName)}
        </h2>
        
        <div className="relative max-w-7xl mx-auto px-4">
          {/* Images container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleImages.map((image) => (
              <div 
                key={image.id} 
                className="h-64 md:h-96 overflow-hidden rounded-lg shadow-md transition-all duration-500"
              >
                <img
                  src={image.image_url}
                  alt={image.alt_text || `${countryName} landscape`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    console.error('Image failed to load:', image.image_url);
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Navigation arrows */}
          {destinationImages.length > imagesPerPage && (
            <>
              <button 
                onClick={prevImages}
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-md -ml-4 z-10 transition-all hover:scale-110"
                aria-label="Previous images"
              >
                <ChevronLeft className="text-gray-800" size={24} />
              </button>
              
              <button 
                onClick={nextImages}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-md -mr-4 z-10 transition-all hover:scale-110"
                aria-label="Next images"
              >
                <ChevronRight className="text-gray-800" size={24} />
              </button>
            </>
          )}
          
          {/* Image pagination indicators */}
          {destinationImages.length > imagesPerPage && (
            <div className="flex justify-center mt-8 space-x-2">
              {Array.from({ length: Math.ceil(destinationImages.length / imagesPerPage) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index * imagesPerPage)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === Math.floor(currentImageIndex / imagesPerPage) 
                      ? 'bg-gray-800 w-6' 
                      : 'bg-gray-300'
                  }`}
                  aria-label={`Go to image set ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DestinationImages; 