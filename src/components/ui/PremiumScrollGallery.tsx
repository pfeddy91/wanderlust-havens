import React, { useEffect, useState, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

// Enhanced 5-image gallery configuration with film-processed images
const GALLERY_IMAGES = [
  {
    id: 1,
    name: 'japan-temple-garden-v2',
    alt: 'Traditional Japanese temple with serene garden',
    urls: {
      desktop: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/japan-temple-garden-v2.webp?width=800&height=1067&quality=85&format=webp&resize=cover',
      mobile: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/japan-temple-garden-v2-mobile.webp?width=400&height=533&quality=80&format=webp&resize=cover',
      lqip: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/japan-temple-garden-v2-lqip.webp?width=30&height=40&quality=20&format=webp&resize=cover'
    },
    aspectRatio: '3:4', // Vertical
    triggerPoint: 0.2
  },
  {
    id: 2,
    name: 'greece-santorini-architecture-v2',
    alt: 'Classic Greek architecture in Santorini with blue domes',
    urls: {
      desktop: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/greece-santorini-architecture-v2.webp?width=800&height=1067&quality=85&format=webp&resize=cover',
      mobile: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/greece-santorini-architecture-v2-mobile.webp?width=400&height=533&quality=80&format=webp&resize=cover',
      lqip: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/greece-santorini-architecture-v2-lqip.webp?width=30&height=40&quality=20&format=webp&resize=cover'
    },
    aspectRatio: '3:4', // Vertical
    triggerPoint: 0.4
  },
  {
    id: 3,
    name: 'venice-grand-canal-horizontal-v2',
    alt: 'Venetian gondolas on the Grand Canal at sunset',
    urls: {
      desktop: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/venice-grand-canal-horizontal-v2.webp?width=1200&height=675&quality=85&format=webp&resize=cover',
      mobile: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/venice-grand-canal-horizontal-v2-mobile.webp?width=600&height=338&quality=80&format=webp&resize=cover',
      lqip: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/venice-grand-canal-horizontal-v2-lqip.webp?width=40&height=23&quality=20&format=webp&resize=cover'
    },
    aspectRatio: '16:9', // Horizontal
    triggerPoint: 0.6
  },
  {
    id: 4,
    name: 'tropical-beach-paradise',
    alt: 'Pristine tropical beach with crystal clear waters',
    urls: {
      desktop: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/tropical-beach-paradise.webp?width=800&height=1067&quality=85&format=webp&resize=cover',
      mobile: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/tropical-beach-paradise-mobile.webp?width=400&height=533&quality=80&format=webp&resize=cover',
      lqip: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/tropical-beach-paradise-lqip.webp?width=30&height=40&quality=20&format=webp&resize=cover'
    },
    aspectRatio: '3:4', // Vertical
    triggerPoint: 0.8
  },
  {
    id: 5,
    name: 'mountain-helicopter-adventure',
    alt: 'Helicopter soaring over dramatic mountain peaks',
    urls: {
      desktop: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/mountain-helicopter-adventure.webp?width=800&height=1067&quality=85&format=webp&resize=cover',
      mobile: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/mountain-helicopter-adventure-mobile.webp?width=400&height=533&quality=80&format=webp&resize=cover',
      lqip: 'https://ydcggawwxohbcpcjyhdk.supabase.co/storage/v1/object/public/gallery-images/mountain-helicopter-adventure-lqip.webp?width=30&height=40&quality=20&format=webp&resize=cover'
    },
    aspectRatio: '3:4', // Vertical
    triggerPoint: 1.0
  }
];

// Smooth scroll progress tracking
const useScrollProgress = (ref: React.RefObject<HTMLElement>) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const elementHeight = rect.height;
      const viewportHeight = window.innerHeight;
      
      // Calculate how much of the element is visible
      const elementTop = rect.top;
      const elementBottom = rect.bottom;
      
      // Progress from 0 to 1 as element scrolls through viewport
      let scrollProgress = 0;
      
      if (elementTop <= viewportHeight && elementBottom >= 0) {
        const visibleHeight = Math.min(elementBottom, viewportHeight) - Math.max(elementTop, 0);
        const totalHeight = elementHeight + viewportHeight;
        const scrolled = viewportHeight - elementTop;
        scrollProgress = Math.max(0, Math.min(1, scrolled / totalHeight));
      }
      
      setProgress(scrollProgress);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [ref]);

  return progress;
};

// Individual image component with precise positioning
interface GalleryImageProps {
  image: typeof GALLERY_IMAGES[0];
  isVisible: boolean;
  opacity: number;
  zIndex: number;
  position: 'top-left' | 'top-right' | 'full-width' | 'center-left' | 'center-right';
}

const GalleryImage: React.FC<GalleryImageProps> = ({
  image,
  isVisible,
  opacity,
  zIndex,
  position
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showLQIP, setShowLQIP] = useState(true);
  const isMobile = useIsMobile();

  // Enhanced positioning based on 5-image pattern with overlaps
  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute' as const,
      transition: 'opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: isVisible ? opacity : 0,
      zIndex,
      overflow: 'hidden', // Removed borderRadius for squared corners
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
    };

    switch (position) {
      case 'top-left':
        // First image: top-left, vertical
        return {
          ...baseStyles,
          top: '5%',
          left: '5%',
          width: '63%',
          height: '35%'
        };
        
      case 'top-right':
        // Second image: top-right, vertical with overlap
        return {
          ...baseStyles,
          top: '25%',
          right: '5%',
          width: '63%',
          height: '35%'
        };
        
      case 'full-width':
        // Third image: full-width, horizontal
        return {
          ...baseStyles,
          bottom: '10%',
          left: '5%',
          width: '90%',
          height: '35%'
        };
        
      case 'center-left':
        // Fourth image: center-left, vertical
        return {
          ...baseStyles,
          top: '15%',
          left: '8%',
          width: '55%',
          height: '40%'
        };
        
      case 'center-right':
        // Fifth image: center-right, vertical with slight overlap
        return {
          ...baseStyles,
          top: '30%',
          right: '8%',
          width: '55%',
          height: '40%'
        };
        
      default:
        return baseStyles;
    }
  };

  const imageUrl = isMobile ? image.urls.mobile : image.urls.desktop;

  return (
    <div
      style={getPositionStyles()}
      className="will-change-opacity"
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
            transform: 'scale(1.1)'
          }}
        />
      )}
      
      {/* Main Image */}
      <img
        src={imageUrl}
        alt={image.alt}
        className="w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: imageLoaded ? 1 : 0 }}
        loading="lazy"
        onLoad={() => {
          setImageLoaded(true);
          setTimeout(() => setShowLQIP(false), 200);
        }}
      />
    </div>
  );
};

// Main gallery component
const PremiumScrollGallery: React.FC = () => {
  const galleryRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useScrollProgress(galleryRef);

  // Calculate which 3 consecutive images should be visible and their opacity
  const getImageStates = () => {
    const states = GALLERY_IMAGES.map((image, index) => {
      return {
        id: image.id,
        isVisible: false,
        opacity: 0,
        zIndex: index + 1
      };
    });

    // Determine which 3 consecutive images to show based on scroll progress
    let startIndex = 0;
    
    if (scrollProgress >= 0.0 && scrollProgress < 0.3) {
      // Show images 1, 2, 3 (indices 0, 1, 2)
      startIndex = 0;
    } else if (scrollProgress >= 0.3 && scrollProgress < 0.65) {
      // Show images 2, 3, 4 (indices 1, 2, 3)
      startIndex = 1;
    } else {
      // Show images 3, 4, 5 (indices 2, 3, 4)
      startIndex = 2;
    }

    // Set visibility for the 3 consecutive images
    for (let i = 0; i < 3; i++) {
      const imageIndex = startIndex + i;
      if (imageIndex < GALLERY_IMAGES.length) {
        states[imageIndex].isVisible = true;
        states[imageIndex].opacity = 1;
      }
    }

    return states;
  };

  const imageStates = getImageStates();

  return (
    <section 
      ref={galleryRef}
      className="relative w-full bg-gradient-to-b from-gray-50 to-white"
      style={{ 
        height: '120vh', // Adequate height for scroll progression
        willChange: 'transform'
      }}
    >
      {/* Gallery Images */}
      {GALLERY_IMAGES.map((image, index) => {
        const state = imageStates[index];
        // Cycle through positions: top-left, top-right, full-width, center-left, center-right
        const positions: ('top-left' | 'top-right' | 'full-width' | 'center-left' | 'center-right')[] = 
          ['top-left', 'top-right', 'full-width', 'center-left', 'center-right'];
        
        return (
          <GalleryImage
            key={image.id}
            image={image}
            isVisible={state.isVisible}
            opacity={state.opacity}
            zIndex={state.zIndex}
            position={positions[index]}
          />
        );
      })}
      
      {/* Subtle ambient overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white via-white/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white via-white/50 to-transparent" />
      </div>
    </section>
  );
};

export default PremiumScrollGallery; 