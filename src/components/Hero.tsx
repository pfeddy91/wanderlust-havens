
import React, { useState, useEffect } from 'react';
import { ChevronDown } from "lucide-react";
import { getBackgroundImages } from '@/services/backgroundService';
import { useIsMobile } from "@/hooks/use-mobile";

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
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-medium text-black leading-tight mb-8">
            {isMobile ? "Vacation envy starts here" : "PICCOLETTA"}
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
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-medium text-center leading-tight mb-8 hero-text-animation">
          {isMobile ? "Vacation envy starts here" : "PICCOLETTA"}
        </h1>
      </div>
      
      {/* Learn More button */}
      <div className="absolute bottom-10 left-0 right-0 z-10 flex flex-col items-center">
        <p className="text-white uppercase text-base tracking-widest mb-2">LEARN MORE</p>
        <button 
          onClick={scrollToExplore}
          aria-label="Learn more" 
          className="flex items-center justify-center w-10 h-10 text-white transition-opacity hover:opacity-80"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default Hero;
