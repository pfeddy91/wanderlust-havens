import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Compass, Sparkles } from 'lucide-react';

const ExploreCard = ({ 
  icon, 
  title, 
  description, 
  buttonText, 
  delay 
}: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  buttonText: string, 
  delay: string 
}) => {
  const navigate = useNavigate();

  return (
    <div 
      className="glass-card rounded-md p-8 shadow-lg flex flex-col items-center text-center animate-slide-up opacity-0" 
      style={{ animationDelay: delay }}
    >
      <div className="bg-travel-orange/5 rounded-full p-4 mb-5">
        {icon}
      </div>
      <h3 className="font-serif text-2xl font-medium mb-3">{title}</h3>
      <p className="text-travel-charcoal mb-6">{description}</p>
      <button 
        onClick={() => {
          if (buttonText === "Browse Destinations") {
            navigate('/destinations');
          } else if (buttonText === "Browse Collections" || buttonText === "Discover Collections") {
            navigate('/collections');
          } else if (buttonText === "Start Planning") {
            navigate('/planner');
          }
        }}
        className="bg-travel-burgundy text-white py-3 px-6 text-xl font-medium rounded hover:bg-travel-burgundy/90 transition-colors"
      >
        {buttonText}
      </button>
    </div>
  );
};

const Explore = () => {
  const navigate = useNavigate();

  return (
    <section id="explore" className="py-12 bg-travel-brown relative">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="text-center mb-10">
          <span className="text-travel-burgundy font-medium tracking-wide uppercase text-lg">How to explore</span>
          <h2 className="text-4xl md:text-4xl font-serif font-bold text-center mb-8">Find Your Dream Honeymoon</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ExploreCard 
            icon={<MapPin className="h-8 w-8 text-travel-burgundy" />}
            title="Handpicked Destinations"
            description="Explore our handpicked collection of romantic destinations around the world, from secluded islands to cultural capitals."
            buttonText="Browse Destinations"
            delay="100ms"
          />
          
          <ExploreCard 
            icon={<Compass className="h-8 w-8 text-travel-burgundy" />}
            title="Collections"
            description="Whether you're seeking adventure, relaxation, or cultural immersion, find experiences that match your perfect honeymoon atmosphere."
            buttonText="Discover Collections"
            delay="300ms"
          />
          
          <ExploreCard 
            icon={<Sparkles className="h-8 w-8 text-travel-burgundy" />}
            title="AI Planner"
            description="Let our intelligent assistant design a customized honeymoon itinerary based on your preferences, budget, and dream experiences."
            buttonText="Start Planning"
            delay="500ms"
          />
        </div>
      </div>
    </section>
  );
};

export default Explore;
