import React, { useEffect, useState, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

// Curated 6-image gallery for CSS columns masonry layout
const MASONRY_IMAGES = [
  {
    id: 1,
    name: 'luxury-travel-1',
    alt: 'Luxury travel destination',
    urls: {
      desktop: 'https://cdn.cosmos.so/3004f166-9fa7-4ed4-96bb-b6765d1058f5?format=jpeg',
      mobile: 'https://cdn.cosmos.so/3004f166-9fa7-4ed4-96bb-b6765d1058f5?format=jpeg',
      lqip: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAUABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAQDBQYH/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhBhMicYGRofD/xAAXAQADAQAAAAAAAAAAAAAAAAABAgME/8QAHREAAgICAwEAAAAAAAAAAAAAAQIAEQMhMUFR/9oADAMBAAIRAxEAPwDn9FFFAUUUUBRRRQf/2Q=='
    },
    column: 'left',
    heightRatio: 1.6, // ~1.6×W
    delay: 0
  },
  {
    id: 2,
    name: 'luxury-travel-2',
    alt: 'Luxury travel experience',
    urls: {
      desktop: 'https://cdn.cosmos.so/eaa28f57-727c-4428-a4c9-044864f7fd34?format=jpeg',
      mobile: 'https://cdn.cosmos.so/eaa28f57-727c-4428-a4c9-044864f7fd34?format=jpeg',
      lqip: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAUABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAQDBQYH/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhBhMicYGRofD/xAAXAQADAQAAAAAAAAAAAAAAAAABAgME/8QAHREAAgICAwEAAAAAAAAAAAAAAQIAEQMhMUFR/9oADAMBAAIRAxEAPwDn9FFFAUUUUBRRRQf/2Q=='
    },
    column: 'right',
    heightRatio: 1.1, // ~1.1×W
    delay: 150
  },
  {
    id: 3,
    name: 'luxury-travel-3',
    alt: 'Premium honeymoon destination',
    urls: {
      desktop: 'https://cdn.cosmos.so/58296942-f546-4989-b1bc-31384be34a55?format=jpeg',
      mobile: 'https://cdn.cosmos.so/58296942-f546-4989-b1bc-31384be34a55?format=jpeg',
      lqip: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAUABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAQDBQYH/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhBhMicYGRofD/xAAXAQADAQAAAAAAAAAAAAAAAAABAgME/8QAHREAAgICAwEAAAAAAAAAAAAAAQIAEQMhMUFR/9oADAMBAAIRAxEAPwDn9FFFAUUUUBRRRQf/2Q=='
    },
    column: 'left',
    heightRatio: 1.3, // ~1.3×W
    delay: 300
  },
  {
    id: 4,
    name: 'luxury-travel-4',
    alt: 'Boutique travel experience',
    urls: {
      desktop: 'https://cdn.cosmos.so/0cf9802e-814a-41de-8faf-eed88c47605f?format=jpeg',
      mobile: 'https://cdn.cosmos.so/0cf9802e-814a-41de-8faf-eed88c47605f?format=jpeg',
      lqip: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAUABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAQDBQYH/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhBhMicYGRofD/xAAXAQADAQAAAAAAAAAAAAAAAAABAgME/8QAHREAAgICAwEAAAAAAAAAAAAAAQIAEQMhMUFR/9oADAMBAAIRAxEAPwDn9FFFAUUUUBRRRQf/2Q=='
    },
    column: 'right',
    heightRatio: 1.3, // ~1.3×W
    delay: 450
  },
  {
    id: 5,
    name: 'luxury-travel-5',
    alt: 'Exclusive honeymoon getaway',
    urls: {
      desktop: 'https://cdn.cosmos.so/d4211211-f305-4083-8a27-3bbd98666572?format=jpeg',
      mobile: 'https://cdn.cosmos.so/d4211211-f305-4083-8a27-3bbd98666572?format=jpeg',
      lqip: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAUABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAQDBQYH/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhBhMicYGRofD/xAAXAQADAQAAAAAAAAAAAAAAAAABAgME/8QAHREAAgICAwEAAAAAAAAAAAAAAQIAEQMhMUFR/9oADAMBAAIRAxEAPwDn9FFFAUUUUBRRRQf/2Q=='
    },
    column: 'left',
    heightRatio: 1.2, // ~1.2×W
    delay: 600
  },
  {
    id: 6,
    name: 'luxury-travel-6',
    alt: 'Premium travel destination',
    urls: {
      desktop: 'https://cdn.cosmos.so/c7c25a2d-5949-4244-bf36-30ed68bff7fb?format=jpeg',
      mobile: 'https://cdn.cosmos.so/c7c25a2d-5949-4244-bf36-30ed68bff7fb?format=jpeg',
      lqip: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAUABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAQDBQYH/8QAJhAAAgEDAwMEAwEAAAAAAAAAAQIDAAQRBSExQVFhBhMicYGRofD/xAAXAQADAQAAAAAAAAAAAAAAAAABAgME/8QAHREAAgICAwEAAAAAAAAAAAAAAQIAEQMhMUFR/9oADAMBAAIRAxEAPwDn9FFFAUUUUBRRRQf/2Q=='
    },
    column: 'right',
    heightRatio: 1.5, // ~1.518×W (2% taller than 1.488)
    delay: 750
  }
];

// Hook for intersection observer to trigger staggered animations
const useIntersectionObserver = (ref: React.RefObject<HTMLElement>, threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element); // Only trigger once
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, threshold]);

  return isVisible;
};

// Individual masonry image component
interface MasonryImageProps {
  image: typeof MASONRY_IMAGES[0];
  index: number;
  isVisible: boolean;
}

const MasonryImage: React.FC<MasonryImageProps> = ({ image, index, isVisible }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showLQIP, setShowLQIP] = useState(true);
  const isMobile = useIsMobile();

  const imageUrl = isMobile ? image.urls.mobile : image.urls.desktop;

  // Calculate height based on viewport width and ratio
  // W = 50vw - padding (approximately)
  const calculateHeight = () => {
    if (typeof window !== 'undefined') {
      const viewportWidth = window.innerWidth;
      const columnWidth = (viewportWidth - 40) / 2; // Account for padding and gap
      return columnWidth * image.heightRatio;
    }
    return 300; // Fallback height
  };

  return (
    <div
      className={`
        relative overflow-hidden cursor-pointer group mb-2
        transition-all duration-700 ease-out
        ${isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
        }
      `}
      style={{
        height: `${calculateHeight()}px`,
        transitionDelay: isVisible ? `${image.delay}ms` : '0ms',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        borderRadius: '2px',
        breakInside: 'avoid', // Prevent breaking across columns
        width: '100%'
      }}
    >
      {/* LQIP Background */}
      {showLQIP && (
        <img
          src={image.urls.lqip}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ 
            opacity: imageLoaded ? 0 : 1,
            filter: 'blur(4px)',
            transform: 'scale(1.05)'
          }}
        />
      )}
      
      {/* Main Image */}
      <img
        src={imageUrl}
        alt={image.alt}
        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        style={{ opacity: imageLoaded ? 1 : 0 }}
        loading="lazy"
        onLoad={() => {
          setImageLoaded(true);
          setTimeout(() => setShowLQIP(false), 200);
        }}
      />

      {/* Subtle overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
    </div>
  );
};

// Main masonry gallery component
const PremiumScrollGallery: React.FC = () => {
  const galleryRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(galleryRef, 0.2);

  return (
    <section 
      ref={galleryRef}
      className="py-6 bg-gradient-to-b from-white to-gray-50/30"
    >
      {/* Scrollable Container with Padding */}
      <div 
        className="max-w-4xl mx-auto overflow-y-auto"
        style={{ 
          padding: '10px',
          maxHeight: '80vh' // Make it scrollable if needed
        }}
      >
        {/* CSS Columns Masonry Layout */}
        <div 
          className="w-full"
          style={{
            columnCount: 2,
            columnGap: '10px',
            columnFill: 'balance'
          }}
        >
          {MASONRY_IMAGES.map((image, index) => (
            <MasonryImage
              key={image.id}
              image={image}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PremiumScrollGallery; 