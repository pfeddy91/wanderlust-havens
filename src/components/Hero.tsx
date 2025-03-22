
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

// Array of background images
const backgrounds = [
  "public/lovable-uploads/496c1439-8451-4174-991e-b025c565c709.png", // Use the uploaded image as the first background
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
          <div className="luxury-badge mb-5 px-6 py-2">
            <p className="text-center tracking-widest uppercase text-white text-sm">LUXURY HONEYMOON JOURNEYS</p>
          </div>
        </div>
        <div className="animate-slide-up opacity-0" style={{ animationDelay: '600ms' }}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-center max-w-5xl leading-tight mb-6">
            Begin Your Forever<br />in Paradise
          </h1>
        </div>
        <div className="animate-slide-up opacity-0" style={{ animationDelay: '900ms' }}>
          <p className="text-center text-base md:text-lg mb-8 max-w-2xl text-white">
            Curated honeymoon experiences designed for couples seeking<br />
            unforgettable moments in the world's most beautiful destinations
          </p>
        </div>
        <div className="animate-slide-up opacity-0" style={{ animationDelay: '1200ms' }}>
          <Button 
            className="bg-transparent hover:bg-white/20 text-white rounded-full border border-white px-10 py-6 text-lg font-medium transition-transform hover:scale-105"
            onClick={scrollToExplore}
          >
            Discover Your Dream Honeymoon
          </Button>
        </div>
      </div>
      
      {/* Scroll down indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center">
        <p className="text-white mb-2 text-sm">Explore</p>
        <button 
          onClick={scrollToExplore}
          aria-label="Scroll down" 
          className="flex items-center justify-center w-10 h-10 rounded-full border border-white text-white transition-opacity hover:opacity-80"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Hero;
