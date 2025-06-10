import React, { useState, useRef, useEffect } from 'react';
import { optimizeImageUrl, ImageOptimizationOptions } from '@/utils/imageOptimization';

interface ProgressiveImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  optimization?: ImageOptimizationOptions;
  placeholder?: 'blur' | 'shimmer' | 'none';
  onLoad?: () => void;
  onError?: () => void;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  optimization,
  placeholder = 'shimmer',
  onLoad,
  onError
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Optimize the image URL if optimization options are provided
  const optimizedSrc = optimization ? optimizeImageUrl(src, optimization) : src;

  // Intersection Observer for lazy loading awareness
  useEffect(() => {
    if (loading === 'eager') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [loading]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleImageError = () => {
    setImageError(true);
    onError?.();
  };

  const getPlaceholderContent = () => {
    switch (placeholder) {
      case 'blur':
        return (
          <div className="absolute inset-0 bg-gray-200 backdrop-blur-sm">
            <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          </div>
        );
      case 'shimmer':
        return (
          <div className="absolute inset-0 bg-gray-200 overflow-hidden">
            <div className="w-full h-full relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer transform -skew-x-12" />
            </div>
          </div>
        );
      case 'none':
      default:
        return <div className="absolute inset-0 bg-gray-200" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder/Loading State */}
      {(!imageLoaded || !inView) && !imageError && (
        <div className={`absolute inset-0 transition-opacity duration-300 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`}>
          {getPlaceholderContent()}
        </div>
      )}

      {/* Error State */}
      {imageError && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <div className="w-8 h-8 mx-auto mb-2 opacity-50">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs">Image unavailable</p>
          </div>
        </div>
      )}

      {/* Actual Image */}
      {inView && optimizedSrc && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          loading={loading}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};

export default ProgressiveImage; 