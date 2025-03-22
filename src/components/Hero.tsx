
import React, { useState, useEffect } from 'react';
import { ChevronDown } from "lucide-react";

// Array of high-quality background images
const backgrounds = [
  "public/lovable-uploads/54e12026-cd55-4e53-8a0b-79cbcd85b1ff.png", // Use the uploaded image as the first background
  "https://images.unsplash.com/photo-1602002418082-dd4a8d2d2f96?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=2000",
  "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=2000",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=2000"
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

  // Image rotation - faster transition
  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsTransitioning(true);
      setNextImageIndex((currentImageIndex + 1) % backgrounds.length);
      
      // After animation completes, update currentImageIndex - faster transition
      setTimeout(() => {
        setCurrentImageIndex(nextImageIndex);
        setIsTransitioning(false);
      }, 700); // Reduced from 1000ms to 700ms
    }, 5000); // Reduced from 6000ms to 5000ms
    
    return () => clearInterval(intervalId);
  }, [currentImageIndex, nextImageIndex]);

  const scrollToExplore = () => {
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

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
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-medium text-center leading-tight mb-8">
          Plan the trip of a lifetime
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
