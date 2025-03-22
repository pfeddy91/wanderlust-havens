
import React, { useState, useEffect } from 'react';
import { ChevronDown } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

// Type for background images from database
interface BackgroundImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

const Hero = () => {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch background images from the database
  useEffect(() => {
    const fetchBackgroundImages = async () => {
      try {
        const { data, error } = await supabase
          .from('background_images')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('Error fetching background images:', error);
          return;
        }
        
        // Extract image URLs from the data
        const imageUrls = (data as BackgroundImage[]).map(img => img.image_url);
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

  // Preload images
  useEffect(() => {
    if (backgrounds.length > 0) {
      backgrounds.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  }, [backgrounds]);

  // Image rotation - faster transition
  useEffect(() => {
    if (backgrounds.length <= 1) return;
    
    const intervalId = setInterval(() => {
      setIsTransitioning(true);
      setNextImageIndex((currentImageIndex + 1) % backgrounds.length);
      
      // After animation completes, update currentImageIndex - faster transition
      setTimeout(() => {
        setCurrentImageIndex(nextImageIndex);
        setIsTransitioning(false);
      }, 700); // 700ms transition
    }, 3000); // 3 seconds interval
    
    return () => clearInterval(intervalId);
  }, [currentImageIndex, nextImageIndex, backgrounds.length]);

  const scrollToExplore = () => {
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fallback while loading
  if (loading || backgrounds.length === 0) {
    return (
      <div className="relative w-full h-screen bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-medium text-black leading-tight mb-8">
            Plan the honeymoon of a lifetime
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Current background image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url(${backgrounds[currentImageIndex]})` }}
      />
      
      {/* Next background image (for smooth transition) */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out ${
          isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `url(${backgrounds[nextImageIndex]})` }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 hero-overlay"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-medium text-center leading-tight mb-8 hero-text-animation">
          Plan the honeymoon of a lifetime
        </h1>
      </div>
      
      {/* Learn More button */}
      <div className="absolute bottom-10 left-0 right-0 z-10 flex flex-col items-center">
        <p className="text-white uppercase text-sm tracking-widest mb-2">LEARN MORE</p>
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
