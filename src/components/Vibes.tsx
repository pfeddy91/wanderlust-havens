
import React, { useState, useEffect } from 'react';
import { getVibeCategories } from '@/services/honeymoonService';

type VibeCategory = {
  title: string;
  image: string;
  description: string;
};

const VibeCard = ({ vibe, index }: { vibe: VibeCategory, index: number }) => {
  return (
    <div 
      className="relative group overflow-hidden rounded-md h-80 animate-slide-up opacity-0" 
      style={{ animationDelay: `${index * 200}ms` }}
    >
      <img 
        src={vibe.image} 
        alt={vibe.title} 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6 text-white">
        <h3 className="font-serif text-2xl font-medium mb-1">{vibe.title}</h3>
        <p className="text-travel-sand text-sm">{vibe.description}</p>
      </div>
    </div>
  );
};

const Vibes = () => {
  const [vibeCategories, setVibeCategories] = useState<VibeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVibeCategories = async () => {
      try {
        const categories = await getVibeCategories();
        setVibeCategories(categories);
      } catch (error) {
        console.error('Error fetching vibe categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVibeCategories();
  }, []);

  return (
    <section id="vibes" className="py-20 bg-travel-cream">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="text-center mb-16">
          <span className="text-travel-coral font-medium tracking-wide uppercase text-sm">Find Your Style</span>
          <h2 className="font-serif text-4xl md:text-5xl font-medium mt-3 mb-6">Browse by Vibe</h2>
          <p className="text-travel-gray max-w-2xl mx-auto">
            Discover honeymoon experiences tailored to your preferred atmosphere and travel style.
          </p>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-80 bg-gray-200 animate-pulse rounded-md"></div>
            ))}
          </div>
        ) : vibeCategories.length === 0 ? (
          <div className="text-center text-travel-gray py-16">
            <p>No categories available. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {vibeCategories.map((vibe, index) => (
              <VibeCard key={vibe.title} vibe={vibe} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Vibes;
