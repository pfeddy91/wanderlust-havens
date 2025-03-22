
import React from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const AiPlanner = () => {
  return (
    <section id="planner" className="py-20 bg-travel-green text-white">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up opacity-0" style={{ animationDelay: '100ms' }}>
            <span className="text-travel-coral font-medium tracking-wide uppercase text-sm">Smart Planning</span>
            <h2 className="font-serif text-4xl md:text-5xl font-medium mt-3 mb-6">
              AI-Powered Honeymoon Planner
            </h2>
            <p className="text-travel-sand mb-8 text-lg">
              Let our intelligent assistant craft the perfect itinerary based on your preferences, creating a truly personalized honeymoon experience.
            </p>
            
            <div className="space-y-6 mb-8">
              <div className="flex items-start">
                <div className="bg-travel-coral/20 p-2 rounded-full mr-4 mt-1">
                  <Sparkles className="h-5 w-5 text-travel-coral" />
                </div>
                <div>
                  <h3 className="font-medium text-xl mb-2">Personalized Recommendations</h3>
                  <p className="text-travel-sand">
                    Our AI analyzes your preferences to suggest destinations and experiences that perfectly match your dream honeymoon.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-travel-coral/20 p-2 rounded-full mr-4 mt-1">
                  <Sparkles className="h-5 w-5 text-travel-coral" />
                </div>
                <div>
                  <h3 className="font-medium text-xl mb-2">Custom Itineraries</h3>
                  <p className="text-travel-sand">
                    Receive a day-by-day plan tailored to your interests, with the perfect balance of activities and relaxation.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-travel-coral/20 p-2 rounded-full mr-4 mt-1">
                  <Sparkles className="h-5 w-5 text-travel-coral" />
                </div>
                <div>
                  <h3 className="font-medium text-xl mb-2">Budget Optimization</h3>
                  <p className="text-travel-sand">
                    Our planner works within your budget to maximize value and create unforgettable experiences without financial stress.
                  </p>
                </div>
              </div>
            </div>
            
            <Button className="bg-travel-coral hover:bg-travel-coral/90 text-white rounded-sm px-8 py-6 text-lg transition-transform hover:scale-105">
              Try AI Planner
            </Button>
          </div>
          
          <div className="animate-slide-up opacity-0" style={{ animationDelay: '300ms' }}>
            <div className="bg-travel-green/50 backdrop-blur-md rounded-lg p-8 border border-white/10 shadow-xl">
              <h3 className="font-serif text-2xl font-medium mb-6 text-center">
                Start Your Journey
              </h3>
              
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-travel-sand text-sm mb-2">First Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/10 border border-white/20 rounded-sm px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-travel-coral/50"
                      placeholder="Your first name"
                    />
                  </div>
                  <div>
                    <label className="block text-travel-sand text-sm mb-2">Last Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/10 border border-white/20 rounded-sm px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-travel-coral/50"
                      placeholder="Your last name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-travel-sand text-sm mb-2">Email</label>
                  <input 
                    type="email" 
                    className="w-full bg-white/10 border border-white/20 rounded-sm px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-travel-coral/50"
                    placeholder="Your email address"
                  />
                </div>
                
                <div>
                  <label className="block text-travel-sand text-sm mb-2">Preferred Destination Type</label>
                  <select className="w-full bg-white/10 border border-white/20 rounded-sm px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-travel-coral/50">
                    <option value="" className="bg-travel-green">Select a destination type</option>
                    <option value="beach" className="bg-travel-green">Beach & Islands</option>
                    <option value="mountains" className="bg-travel-green">Mountains & Nature</option>
                    <option value="city" className="bg-travel-green">City & Culture</option>
                    <option value="adventure" className="bg-travel-green">Adventure & Wildlife</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-travel-sand text-sm mb-2">Approximate Budget</label>
                  <select className="w-full bg-white/10 border border-white/20 rounded-sm px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-travel-coral/50">
                    <option value="" className="bg-travel-green">Select your budget range</option>
                    <option value="budget" className="bg-travel-green">$2,000 - $5,000</option>
                    <option value="mid" className="bg-travel-green">$5,000 - $10,000</option>
                    <option value="luxury" className="bg-travel-green">$10,000 - $20,000</option>
                    <option value="ultra" className="bg-travel-green">$20,000+</option>
                  </select>
                </div>
                
                <Button className="w-full bg-travel-coral hover:bg-travel-coral/90 text-white rounded-sm py-3 font-medium transition-all">
                  Generate Honeymoon Plan
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiPlanner;
