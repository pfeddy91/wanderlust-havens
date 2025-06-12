import React, { useState, useEffect } from 'react';
import { ChevronDown } from "lucide-react";
import { getBackgroundImages } from '@/services/backgroundService';
import { useIsMobile } from "@/hooks/use-mobile";
import { TouchButton } from '@/components/ui/TouchButton';
import { TYPOGRAPHY } from '@/utils/typography';

// Type for background images from database
interface BackgroundImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

const Hero = () => {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const isMobile = useIsMobile();

  // Fetch background images from the database
  useEffect(() => {
    const fetchBackgroundImages = async () => {
      try {
        const backgroundData = await getBackgroundImages();
        
        // Extract image URLs from the data
        const imageUrls = backgroundData.map((img: BackgroundImage) => img.image_url);
        if (imageUrls.length > 0) {
          setBackgrounds(imageUrls);
        }
      } catch (error) {
        console.error('Error in fetchBackgroundImages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBackgroundImages();
  }, []);

  // Preload images to avoid flickering
  useEffect(() => {
    if (backgrounds.length === 0) return;
    
    let loadedCount = 0;
    const totalImages = backgrounds.length;
    
    backgrounds.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.src = src;
    });
  }, [backgrounds]);

  // Rotate images on an interval
  useEffect(() => {
    if (!imagesLoaded || backgrounds.length <= 1) return;
    
    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % backgrounds.length);
    }, 4000); // Change image every 4 seconds
    
    return () => clearInterval(intervalId);
  }, [imagesLoaded, backgrounds.length]);

  const scrollToExplore = () => {
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fallback while loading
  if (loading || backgrounds.length === 0) {
    return (
      <div className="relative w-full h-screen bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className={`${TYPOGRAPHY.hero} text-black leading-tight mb-8`}>
            Your love story deserves the perfect honeymoon
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background images */}
      {backgrounds.map((bg, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1500 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url(${bg})` }}
          aria-hidden={index !== currentIndex}
        />
      ))}
      
      {/* Overlay */}
      <div className="absolute inset-0 hero-overlay"></div>
      
      {/* Text Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 px-4">
        {/* Hero Title */}
        <h1 className={`${TYPOGRAPHY.hero} text-white leading-tight mb-8`}>
          Your love story deserves the perfect honeymoon
        </h1>

        {/* CTA Button */}
        <TouchButton 
          variant="primary"
          size="lg"
          className="text-white px-8 py-4 rounded-lg font-medium transition-colors duration-200"
          style={{ backgroundColor: '#00395c' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#002a42'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00395c'}
        >
          Start Planning
        </TouchButton>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
        <p className={`${TYPOGRAPHY.caption} text-white uppercase tracking-widest mb-2`}>LEARN MORE</p>
        <button 
          onClick={scrollToExplore}
          aria-label="Learn more" 
          className="flex items-center justify-center text-white transition-opacity hover:opacity-80"
        >
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </button>
      </div>
    </div>
  );
};

export default Hero;