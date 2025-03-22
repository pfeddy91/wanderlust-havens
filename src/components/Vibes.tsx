
import React from 'react';

const vibeCategories = [
  {
    title: "Adventure",
    image: "https://images.unsplash.com/photo-1527631120902-378417754324?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
    description: "For thrill-seeking couples"
  },
  {
    title: "Relaxation",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
    description: "Serene escapes for unwinding"
  },
  {
    title: "Cultural",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2339&q=80",
    description: "Immersive local experiences"
  },
  {
    title: "Luxury",
    image: "https://images.unsplash.com/photo-1551918120-9739cb430c6d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
    description: "Exclusive high-end getaways"
  }
];

const VibeCard = ({ vibe, index }: { vibe: typeof vibeCategories[0], index: number }) => {
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {vibeCategories.map((vibe, index) => (
            <VibeCard key={vibe.title} vibe={vibe} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Vibes;
