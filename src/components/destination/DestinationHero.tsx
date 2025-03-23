
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface DestinationHeroProps {
  country: {
    name: string;
    featured_image: string | null;
  };
}

const DestinationHero = ({ country }: DestinationHeroProps) => {
  const scrollToOverview = () => {
    document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' });
  };

  const heroImage = country.featured_image || 
    'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1500&q=80';

  return (
    <div className="relative h-screen min-h-[600px] w-full">
      {/* Hero Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>
      
      {/* Hero Content */}
      <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4">
        <h1 className="text-4xl md:text-6xl font-serif text-white font-bold tracking-wider mb-6">
          HIGH-END HONEYMOONS IN {country.name.toUpperCase()}
        </h1>
        
        {/* Scroll Down Indicator */}
        <button 
          onClick={scrollToOverview}
          className="absolute bottom-10 flex flex-col items-center text-white hover:text-gray-200 transition-colors animate-bounce"
          aria-label="Scroll down"
        >
          <span className="text-sm mb-2">Scroll Down</span>
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default DestinationHero;
