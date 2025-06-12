import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TourImage } from '@/types/tour';
import { optimizeImageUrl, ImagePresets } from '@/utils/imageOptimization';
import { useIsMobile } from '@/hooks/use-mobile';

interface TourImageGalleryProps {
  images: TourImage[];
  title?: string;
}

const TourImageGallery: React.FC<TourImageGalleryProps> = ({ images, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  if (!images || images.length === 0) {
    return <div className="text-center py-8">No images to display.</div>;
  }

  const numImages = images.length;

  const goToPrevious = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + numImages) % numImages);
    setTimeout(() => setIsTransitioning(false), 400);
  };

  const goToNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % numImages);
    setTimeout(() => setIsTransitioning(false), 400);
  };

  // Mobile swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    carouselRef.current?.setAttribute('data-start-x', touch.clientX.toString());
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.changedTouches[0];
    const startX = parseFloat(carouselRef.current?.getAttribute('data-start-x') || '0');
    const diffX = touch.clientX - startX;

    if (Math.abs(diffX) > 50) { // Minimum swipe distance
      if (diffX > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }
  };

  if (isMobile) {
    // Mobile: Full-width swipeable carousel
    return (
      <section className="py-8 md:py-12 bg-white">
        <div className="px-4">
          {title && (
            <h2 className="text-2xl font-serif font-semibold mb-6 text-center" style={{ color: '#161618' }}>
              {title}
            </h2>
          )}
          
          <div 
            ref={carouselRef}
            className="relative w-full"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Main Image Container */}
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden shadow-lg bg-gray-100">
              <img
                key={currentIndex}
                src={optimizeImageUrl(images[currentIndex].image_url, ImagePresets.galleryMobile)}
                alt={images[currentIndex].alt_text || `Tour image ${currentIndex + 1}`}
                className="w-full h-full object-cover transition-opacity duration-400 ease-out"
                loading="lazy"
              />
              
              {/* Overlay with swipe hint for first image */}
              {currentIndex === 0 && numImages > 1 && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-60">
                  <div className="bg-white/90 px-3 py-1 rounded-full">
                    <p className="text-sm text-gray-700">Swipe to explore</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation dots */}
            {numImages > 1 && (
              <div className="flex justify-center mt-4 space-x-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex ? 'bg-gray-800' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Image counter */}
            {numImages > 1 && (
              <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {currentIndex + 1} / {numImages}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Desktop: Enhanced three-image layout
  const getDisplayIndices = () => {
    const prev = (currentIndex - 1 + numImages) % numImages;
    const current = currentIndex;
    const next = (currentIndex + 1) % numImages;
    return [prev, current, next];
  };

  const displayIndices = getDisplayIndices();

  if (numImages === 1) {
    return (
      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4">
          {title && (
            <h2 className="text-2xl md:text-4xl font-serif font-semibold mb-8 text-center" style={{ color: '#161618' }}>
              {title}
            </h2>
          )}
          <div className="flex justify-center items-center">
            <div className="w-full md:w-2/3 lg:w-1/2 aspect-[4/3] rounded-lg overflow-hidden shadow-xl">
              <img
                src={optimizeImageUrl(images[0].image_url, ImagePresets.galleryMain)}
                alt={images[0].alt_text || `Tour image 1`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-2xl md:text-4xl font-serif font-semibold mb-8 text-center" style={{ color: '#161618' }}>
            {title}
          </h2>
        )}
        
        <div className="relative flex items-center justify-center space-x-4 overflow-hidden">
          {/* Previous Image */}
          <div className="w-[27.5%] aspect-[4/3] opacity-60 transform transition-all duration-700 ease-out rounded-lg overflow-hidden shadow-lg">
            <img
              src={optimizeImageUrl(images[displayIndices[0]].image_url, ImagePresets.galleryThumb)}
              alt={images[displayIndices[0]].alt_text || `Tour image preview`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Current (Main) Image */}
          <div className="w-[45%] aspect-[4/3] rounded-lg overflow-hidden shadow-2xl z-10 transform transition-all duration-700 ease-out">
            <img
              src={optimizeImageUrl(images[displayIndices[1]].image_url, ImagePresets.galleryMain)}
              alt={images[displayIndices[1]].alt_text || `Tour image ${currentIndex + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Next Image */}
          <div className="w-[27.5%] aspect-[4/3] opacity-60 transform transition-all duration-700 ease-out rounded-lg overflow-hidden shadow-lg">
            <img
              src={optimizeImageUrl(images[displayIndices[2]].image_url, ImagePresets.galleryThumb)}
              alt={images[displayIndices[2]].alt_text || `Tour image preview`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-center mt-8 space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevious}
            disabled={isTransitioning}
            className="rounded-full bg-white hover:bg-gray-100 border-gray-300 shadow"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            disabled={isTransitioning}
            className="rounded-full bg-white hover:bg-gray-100 border-gray-300 shadow"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TourImageGallery; 