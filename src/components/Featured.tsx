
import React from 'react';
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Calendar } from "lucide-react";

const destinations = [
  {
    id: 1,
    title: "Maldives Overwater Villa",
    location: "Maldives",
    duration: "10 days",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
    price: "$5,999"
  },
  {
    id: 2,
    title: "Santorini Sunset Escape",
    location: "Greece",
    duration: "8 days",
    image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
    price: "$4,599"
  },
  {
    id: 3,
    title: "Bali Luxury Retreat",
    location: "Indonesia",
    duration: "12 days",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2338&q=80",
    price: "$3,999"
  }
];

const DestinationCard = ({ destination }: { destination: typeof destinations[0] }) => {
  return (
    <div className="group rounded-md overflow-hidden shadow-md bg-white transition-all duration-300 hover:shadow-xl">
      <div className="relative overflow-hidden h-80">
        <img 
          src={destination.image} 
          alt={destination.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <button className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full transition-colors hover:bg-white">
          <Heart className="h-5 w-5 text-travel-coral" />
        </button>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-serif text-xl font-medium">{destination.title}</h3>
          <span className="font-medium text-travel-coral">{destination.price}</span>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center text-travel-gray">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-sm">{destination.location}</span>
          </div>
          <div className="flex items-center text-travel-gray">
            <Calendar className="h-4 w-4 mr-1" />
            <span className="text-sm">{destination.duration}</span>
          </div>
        </div>
        <Button className="w-full bg-travel-cream text-travel-green hover:bg-travel-green hover:text-white rounded-sm transition-all duration-300">
          View Details
        </Button>
      </div>
    </div>
  );
};

const Featured = () => {
  return (
    <section id="destinations" className="py-20 bg-travel-sand/30">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="text-center mb-16">
          <span className="text-travel-coral font-medium tracking-wide uppercase text-sm">Popular Choices</span>
          <h2 className="font-serif text-4xl md:text-5xl font-medium mt-3 mb-6">Featured Honeymoon Experiences</h2>
          <p className="text-travel-gray max-w-2xl mx-auto">
            Our most sought-after destinations combining luxury, romance, and unforgettable experiences for your perfect honeymoon.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((destination, index) => (
            <div 
              key={destination.id} 
              className="animate-slide-up opacity-0" 
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <DestinationCard destination={destination} />
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Button 
            variant="outline" 
            className="border-travel-green text-travel-green hover:bg-travel-green hover:text-white transition-all duration-300 rounded-sm px-8 py-6"
          >
            View All Destinations
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Featured;
