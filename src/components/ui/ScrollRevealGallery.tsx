import React, { useEffect, useState, useRef } from 'react';
import ProgressiveImage from '@/components/ui/ProgressiveImage';
import { ImagePresets } from '@/utils/imageOptimization';

interface GalleryImage {
  src: string;
  alt: string;
  size: 'small' | 'medium' | 'large';
  position: {
    top: string;
    left: string;
    transform?: string;
    zIndex: number;
  };
}

const ScrollRevealGallery: React.FC = () => {
  const [visibleImages, setVisibleImages] = useState<number>(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Gallery images with irregular positioning (mobile-optimized)
  const galleryImages: GalleryImage[] = [
    {
      src: 'https://images.pexels.com/photos/572780/pexels-photo-572780.jpeg?auto=compress&cs=tinysrgb&w=600',
      alt: 'Romantic tropical beach',
      size: 'large',
      position: {
        top: '20%',
        left: '15%',
        zIndex: 3
      }
    },
    {
      src: 'https://images.pexels.com/photos/10183905/pexels-photo-10183905.jpeg?auto=compress&cs=tinysrgb&w=600',
      alt: 'Luxury resort overlooking ocean',
      size: 'medium',
      position: {
        top: '10%',
        left: '45%',
        zIndex: 4
      }
    },
    {
      src: 'https://images.pexels.com/photos/161183/thailand-monks-temple-tourism-161183.jpeg?auto=compress&cs=tinysrgb&w=600',
      alt: 'Cultural temple experience',
      size: 'medium',
      position: {
        top: '40%',
        left: '20%',
        zIndex: 2
      }
    },
    {
      src: 'https://images.pexels.com/photos/1643130/pexels-photo-1643130.jpeg?auto=compress&cs=tinysrgb&w=600',
      alt: 'Intimate dinner setting',
      size: 'large',
      position: {
        top: '55%',
        left: '50%',
        zIndex: 1
      }
    }
  ];

  // Image size classes - bigger sizes, more overlapping
  const getSizeClass = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        return 'w-36 h-48'; // 144x192px
      case 'medium':
        return 'w-48 h-60'; // 192x240px  
      case 'large':
        return 'w-56 h-72'; // 224x288px
      default:
        return 'w-48 h-60';
    }
  };

  // Scroll detection for sequential reveals
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const section = sectionRef.current;
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight;
      const viewportHeight = window.innerHeight;

      // Calculate scroll progress through the section (0 to 1)
      const scrollProgress = Math.max(0, Math.min(1, 
        (viewportHeight - rect.top) / (sectionHeight + viewportHeight)
      ));

      // Determine how many images should be visible based on scroll progress
      const totalImages = galleryImages.length;
      const newVisibleCount = Math.floor(scrollProgress * (totalImages + 1));
      
      setVisibleImages(Math.min(newVisibleCount, totalImages));
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [galleryImages.length]);

  return (
    <section 
      ref={sectionRef}
      className="relative w-full bg-gradient-to-b from-white to-gray-50/30"
      style={{ height: '100vh' }} // 1x viewport height
    >
      <div className="relative w-full h-full overflow-hidden">
        {galleryImages.map((image, index) => (
          <div
            key={index}
            className={`absolute transition-all duration-1000 ease-out ${getSizeClass(image.size)} ${
              index < visibleImages 
                ? 'opacity-100 translate-y-0 scale-100' 
                : 'opacity-0 translate-y-8 scale-95'
            }`}
            style={{
              top: image.position.top,
              left: image.position.left,
              transform: index < visibleImages ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.95)',
              zIndex: image.position.zIndex,
              transitionDelay: `${index * 200}ms` // Sequential delay
            }}
          >
            <div className="relative w-full h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <ProgressiveImage
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover"
                optimization={ImagePresets.cardMobile}
                placeholder="shimmer"
                loading="lazy"
              />
              {/* Subtle overlay for elegance */}
              <div className="absolute inset-0 bg-black/5 mix-blend-multiply"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Subtle bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
    </section>
  );
};

export default ScrollRevealGallery; 