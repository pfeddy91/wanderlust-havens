import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming you use shadcn/ui Button
import { TourImage } from '@/types/tour'; // Assuming this is your tour image type
import { optimizeImageUrl, ImagePresets } from '@/utils/imageOptimization';

interface TourImageGalleryProps {
  images: TourImage[];
  title?: string; // Optional title like "Experience the Journey"
}

const TourImageGallery: React.FC<TourImageGalleryProps> = ({ images, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  if (!images || images.length === 0) {
    return <div className="text-center py-8">No images to display.</div>;
  }

  const numImages = images.length;

  const goToPrevious = () => {
    if (isTransitioning) return; // Prevent rapid clicks
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + numImages) % numImages);
    setTimeout(() => setIsTransitioning(false), 600); // Match transition duration
  };

  const goToNext = () => {
    if (isTransitioning) return; // Prevent rapid clicks
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % numImages);
    setTimeout(() => setIsTransitioning(false), 600); // Match transition duration
  };

  // Function to get indices for display: previous, current, next
  const getDisplayIndices = () => {
    const prev = (currentIndex - 1 + numImages) % numImages;
    const current = currentIndex;
    const next = (currentIndex + 1) % numImages;
    return [prev, current, next];
  };

  const displayIndices = getDisplayIndices();

  // Handle cases with 1 or 2 images gracefully
  if (numImages === 1) {
    return (
      <section className="py-8 md:py-12 bg-slate-50">
        <div className="container mx-auto px-4">
          {title && <h2 className="text-2xl md:text-2xl font-serif mb-8 text-gray-700">{title}</h2>}
          <div className="flex justify-center items-center">
            <div className="w-full md:w-2/3 lg:w-1/2 aspect-[4/3] rounded-lg overflow-hidden shadow-xl">
              <img
                src={images[0].image_url}
                alt={images[0].alt_text || `Tour image 1`}
                className="w-full h-full object-cover transition-transform duration-500 ease-in-out"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Determine the aspect ratio for consistent height. Let's use 4/3 for the main image.
  // Side images will match this height.
  const centralImageAspectRatio = "aspect-[4/3]";

  return (
    <section className="py-8 md:py-12 bg-slate-50">
      <div className="container mx-auto px-4">
        {title && <h2 className="font-serif text-3xl font-bold uppercase tracking-wide mb-8">{title}</h2>}
        
        <div className="relative flex items-center justify-center space-x-2 overflow-hidden">
          {/* Previous Image (Partially Visible) */}
          {numImages > 1 && (
             <div className={`w-[27.5%] md:w-[27.5%] lg:w-[27.5%] ${centralImageAspectRatio} opacity-60 transform transition-all duration-700 ease-out rounded-lg overflow-hidden relative shadow-lg ${isTransitioning ? 'translate-x-2' : ''}`}>
                <img
                    src={optimizeImageUrl(images[displayIndices[0]].image_url, ImagePresets.galleryThumb)}
                    alt={images[displayIndices[0]].alt_text || `Tour image preview previous`}
                    className="absolute top-0 left-0 w-[200%] max-w-none h-full object-cover transform -translate-x-1/2 transition-transform duration-700 ease-out" 
                    loading="lazy"
                />
            </div>
          )}

          {/* Current (Main) Image */}
          <div className={`w-[45%] md:w-[45%] lg:w-[45%] ${centralImageAspectRatio} rounded-lg overflow-hidden shadow-2xl z-10 transform transition-all duration-700 ease-out ${isTransitioning ? 'scale-[1.02]' : 'scale-100'}`}>
            <img
              src={optimizeImageUrl(images[displayIndices[1]].image_url, ImagePresets.galleryMain)}
              alt={images[displayIndices[1]].alt_text || `Tour image ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-700 ease-out"
              loading="lazy"
            />
          </div>

          {/* Next Image (Partially Visible) */}
          {numImages > 1 && (
            <div className={`w-[27.5%] md:w-[27.5%] lg:w-[27.5%] ${centralImageAspectRatio} opacity-60 transform transition-all duration-700 ease-out rounded-lg overflow-hidden relative shadow-lg ${isTransitioning ? '-translate-x-2' : ''}`}>
                <img
                    src={optimizeImageUrl(images[displayIndices[2]].image_url, ImagePresets.galleryThumb)}
                    alt={images[displayIndices[2]].alt_text || `Tour image preview next`}
                    className="absolute top-0 right-0 w-[200%] max-w-none h-full object-cover transform translate-x-1/2 transition-transform duration-700 ease-out"
                    loading="lazy"
                />
            </div>
          )}
        </div>

        {/* Navigation Buttons - only if more than 1 image */}
        {numImages > 1 && (
            <div className="flex justify-center mt-8 space-x-4">
            <Button
                variant="outline"
                size="icon"
                onClick={goToPrevious}
                disabled={isTransitioning}
                className={`rounded-full bg-white hover:bg-gray-100 border-gray-300 shadow transition-opacity duration-300 ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Previous image"
            >
                <ChevronLeft className="h-6 w-6 text-gray-600" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                onClick={goToNext}
                disabled={isTransitioning}
                className={`rounded-full bg-white hover:bg-gray-100 border-gray-300 shadow transition-opacity duration-300 ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Next image"
            >
                <ChevronRight className="h-6 w-6 text-gray-600" />
            </Button>
            </div>
        )}
      </div>
    </section>
  );
};

export default TourImageGallery; 