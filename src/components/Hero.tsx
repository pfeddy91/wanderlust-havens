
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

// Array of background images
const backgrounds = [
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
  "https://images.unsplash.com/photo-1586861644790-f7c7fb066a6f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
  "https://images.unsplash.com/photo-1476673160081-cf065607f449?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
  "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
  "https://images.unsplash.com/photo-1602002418082-dd4a8d2d2f96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2274&q=80"
];

const Hero = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Preload images
  useEffect(() => {
    backgrounds.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Image rotation
  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsTransitioning(true);
      setNextImageIndex((currentImageIndex + 1) % backgrounds.length);
      
      // After animation completes, update currentImageIndex
      setTimeout(() => {
        setCurrentImageIndex(nextImageIndex);
        setIsTransitioning(false);
      }, 1000);
    }, 6000);
    
    return () => clearInterval(intervalId);
  }, [currentImageIndex, nextImageIndex]);

  const scrollToExplore = () => {
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Current background image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url(${backgrounds[currentImageIndex]})` }}
      />
      
      {/* Next background image (for smooth transition) */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
          isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `url(${backgrounds[nextImageIndex]})` }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 hero-overlay"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4 sm:px-6 lg:px-8">
        <div className="animate-slide-up opacity-0" style={{ animationDelay: '300ms' }}>
          <p className="text-center mb-2 tracking-widest uppercase text-travel-sand">Experience Pure Luxury</p>
        </div>
        <div className="animate-slide-up opacity-0" style={{ animationDelay: '600ms' }}>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-medium text-center max-w-5xl leading-tight mb-6">
            Unforgettable Honeymoon Destinations for Your Perfect Beginning
          </h1>
        </div>
        <div className="animate-slide-up opacity-0" style={{ animationDelay: '900ms' }}>
          <p className="text-center text-lg md:text-xl mb-8 max-w-2xl text-travel-sand">
            Curated luxury experiences in the world's most enchanting destinations, designed for couples starting their journey together.
          </p>
        </div>
        <div className="animate-slide-up opacity-0" style={{ animationDelay: '1200ms' }}>
          <Button 
            className="bg-travel-coral hover:bg-travel-coral/90 text-white rounded-sm px-8 py-6 text-lg font-medium transition-transform hover:scale-105"
            onClick={scrollToExplore}
          >
            Explore Destinations
          </Button>
        </div>
      </div>
      
      {/* Scroll down indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-10">
        <button 
          onClick={scrollToExplore}
          aria-label="Scroll down" 
          className="flex flex-col items-center text-white transition-opacity hover:opacity-80"
        >
          <span className="mb-2 text-sm">Scroll</span>
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default Hero;
