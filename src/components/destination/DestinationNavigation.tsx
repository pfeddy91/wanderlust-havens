
import React from 'react';

const DestinationNavigation = () => {
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-20 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto">
        <div className="flex justify-center">
          <div className="flex space-x-10">
            <button 
              onClick={() => scrollToSection('overview')}
              className="py-4 px-2 border-b-2 border-transparent hover:border-black text-gray-800 font-medium"
            >
              OVERVIEW
            </button>
            <button 
              onClick={() => scrollToSection('tours')}
              className="py-4 px-2 border-b-2 border-transparent hover:border-black text-gray-800 font-medium"
            >
              ITINERARIES
            </button>
            <button 
              className="py-4 px-2 border-b-2 border-transparent hover:border-black text-gray-800 font-medium"
            >
              SEE & DO
            </button>
            <button 
              className="py-4 px-2 border-b-2 border-transparent hover:border-black text-gray-800 font-medium"
            >
              HOTELS
            </button>
            <button 
              className="py-4 px-2 border-b-2 border-transparent hover:border-black text-gray-800 font-medium"
            >
              INSPIRATION
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DestinationNavigation;
