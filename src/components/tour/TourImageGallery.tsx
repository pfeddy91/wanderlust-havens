import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming you use shadcn/ui Button
import { TourImage } from '@/types/tour'; // Assuming this is your tour image type

interface TourImageGalleryProps {
  images: TourImage[];
  title?: string; // Optional title like "Experience the Journey"
}

const TourImageGallery: React.FC<TourImageGalleryProps> = ({ images, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return <div className="text-center py-8">No images to display.</div>;
  }

  const numImages = images.length;

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + numImages) % numImages);
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % numImages);
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
        {title && <h2 className="text-3xl md:text-4xl font-serif mb-8 text-gray-700">{title}</h2>}
        
        <div className="relative flex items-center justify-center space-x-1 sm:space-x-2 overflow-hidden"> {/* Reduced space for tighter packing */}
          {/* Previous Image (Partially Visible) */}
          {numImages > 1 && (
             <div className={`w-1/4 md:w-1/5 lg:w-1/4 ${centralImageAspectRatio} opacity-75 transform scale-95 transition-all duration-500 ease-in-out rounded-lg overflow-hidden relative shadow-md`}>
                <img
                    src={images[displayIndices[0]].image_url}
                    alt={images[displayIndices[0]].alt_text || `Tour image preview previous`}
                    className="absolute top-0 left-0 w-[200%] max-w-none h-full object-cover transform -translate-x-1/2" 
                    // Image is 200% width of its container, then shifted left by 50% of ITS OWN width
                    // effectively showing its right half within the container.
                />
            </div>
          )}

          {/* Current (Main) Image */}
          <div className={`w-1/2 md:w-1/2 lg:w-1/2 ${centralImageAspectRatio} rounded-lg overflow-hidden shadow-xl z-10 transform scale-100 transition-all duration-500 ease-in-out`}>
            <img
              src={images[displayIndices[1]].image_url}
              alt={images[displayIndices[1]].alt_text || `Tour image ${currentIndex + 1}`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Next Image (Partially Visible) */}
          {numImages > 1 && (
            <div className={`w-1/4 md:w-1/5 lg:w-1/4 ${centralImageAspectRatio} opacity-75 transform scale-95 transition-all duration-500 ease-in-out rounded-lg overflow-hidden relative shadow-md`}>
                <img
                    src={images[displayIndices[2]].image_url}
                    alt={images[displayIndices[2]].alt_text || `Tour image preview next`}
                    className="absolute top-0 right-0 w-[200%] max-w-none h-full object-cover transform translate-x-1/2"
                    // Image is 200% width of its container, then shifted right by 50% of ITS OWN width
                    // effectively showing its left half within the container.
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
                className="rounded-full bg-white hover:bg-gray-100 border-gray-300 shadow"
                aria-label="Previous image"
            >
                <ChevronLeft className="h-6 w-6 text-gray-600" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                onClick={goToNext}
                className="rounded-full bg-white hover:bg-gray-100 border-gray-300 shadow"
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