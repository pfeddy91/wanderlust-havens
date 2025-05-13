import React from 'react';
import { Link } from 'react-router-dom';

const HoneymoonInfo = () => {
  return (
    <section className="py-16 bg-travel-cream">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-8">
          The Honeymoon Experts
        </h2>
        
        <div className="text-center mb-8 text-lg">
          <p className="text-gray-700 leading-relaxed mb-4">
            Planning your dream honeymoon should be exciting, not overwhelming! Forget endless scrolling and 
            generic itineraries that leave you feeling underwhelmed. We specialise in helping 
            newlyweds like you in planning the perfect honeymoon.
          </p>
          
          <p className="text-gray-700 leading-relaxed mb-4">
            We offer a curated collection of honeymoon packages, each carefully designed with romance 
            and adventure in mind. From idyllic island escapes to vibrant cultural explorations, you'll find a 
            selection to inspire you. And while our packages are thoughtfully composed, we can always add a 
            little personal touch to make it uniquely yours.
          </p>
          
        </div>
        
        <div className="flex justify-center">
          <Link
            to="/contact"
            className="bg-travel-charcoal text-white px-10 py-3.5 rounded-[10px] text-medium font-medium tracking-wide transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HoneymoonInfo; 