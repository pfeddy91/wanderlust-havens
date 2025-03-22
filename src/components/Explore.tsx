
import React from 'react';
import { Button } from "@/components/ui/button";
import { MapPin, Compass, Sparkles } from "lucide-react";

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
  return (
    <div 
      className="glass-card rounded-md p-8 shadow-lg flex flex-col items-center text-center animate-slide-up opacity-0" 
      style={{ animationDelay: delay }}
    >
      <div className="bg-travel-green/5 rounded-full p-4 mb-5">
        {icon}
      </div>
      <h3 className="font-serif text-2xl font-medium mb-3">{title}</h3>
      <p className="text-travel-gray mb-6">{description}</p>
      <Button 
        variant="outline"
        className="border-travel-green text-travel-green hover:bg-travel-green hover:text-white transition-all duration-300 rounded-sm px-6"
      >
        {buttonText}
      </Button>
    </div>
  );
};

const Explore = () => {
  return (
    <section id="explore" className="py-20 bg-travel-cream relative">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="text-center mb-16">
          <span className="text-travel-coral font-medium tracking-wide uppercase text-sm">How to explore</span>
          <h2 className="font-serif text-4xl md:text-5xl font-medium mt-3 mb-6">Find Your Dream Honeymoon</h2>
          <p className="text-travel-gray max-w-2xl mx-auto">
            Discover our curated collection of luxury honeymoon experiences through different ways of exploration.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ExploreCard 
            icon={<MapPin className="h-8 w-8 text-travel-green" />}
            title="By Destination"
            description="Explore our handpicked collection of romantic destinations around the world, from secluded islands to cultural capitals."
            buttonText="Browse Destinations"
            delay="100ms"
          />
          
          <ExploreCard 
            icon={<Compass className="h-8 w-8 text-travel-green" />}
            title="By Vibe"
            description="Whether you're seeking adventure, relaxation, or cultural immersion, find experiences that match your perfect honeymoon atmosphere."
            buttonText="Discover Vibes"
            delay="300ms"
          />
          
          <ExploreCard 
            icon={<Sparkles className="h-8 w-8 text-travel-green" />}
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
