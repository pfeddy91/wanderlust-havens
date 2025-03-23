
import React from 'react';
import { Link } from 'react-router-dom';

// Define interface for tour image
interface TourImage {
  id: string;
  tour_id: string | null;
  image_url: string;
  alt_text: string | null;
  is_featured: boolean | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Define interface for tour with tour_images property
interface Tour {
  id: string;
  name: string;
  slug: string;
  duration: number;
  guide_price: number;
  summary?: string;
  description?: string;
  featured_image: string | null;
  is_featured?: boolean | null;
  created_at?: string;
  updated_at?: string;
  vibe_tag?: any;
  tour_images?: TourImage[];
}

interface DestinationToursProps {
  tours: Tour[];
  country: {
    name: string;
  };
}

const DestinationTours = ({ tours, country }: DestinationToursProps) => {
  // If no tours are available, use placeholder tours
  const displayTours = tours.length > 0 ? tours : [
    {
      id: 'placeholder-1',
      name: `A JOURNEY INTO ${country.name.toUpperCase()}`,
      duration: 7,
      guide_price: 6000,
      featured_image: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800&q=80',
      slug: 'journey-into-morocco',
    },
    {
      id: 'placeholder-2',
      name: `BEST OF ${country.name.toUpperCase()}: BERBERS, KASBAHS & CAMELS`,
      duration: 13,
      guide_price: 8000,
      featured_image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
      slug: 'best-of-morocco',
    },
    {
      id: 'placeholder-3',
      name: `${country.name.toUpperCase()}: A LUXURY ADVENTURE IN THE SAHARA DESERT`,
      duration: 10,
      guide_price: 7500,
      featured_image: 'https://images.unsplash.com/photo-1482881497185-d4a9ddbe4151?w=800&q=80',
      slug: 'luxury-adventure-sahara',
    }
  ];

  // Function to get the best image for a tour
  const getTourImage = (tour: Tour) => {
    // Try to get featured image from tour_images
    if (tour.tour_images && tour.tour_images.length > 0) {
      // First look for a featured image
      const featuredImage = tour.tour_images.find((img) => img.is_featured);
      if (featuredImage) return featuredImage.image_url;
      
      // If no featured image, use the first one by display_order
      const sortedImages = [...tour.tour_images].sort((a, b) => a.display_order - b.display_order);
      if (sortedImages.length > 0) return sortedImages[0].image_url;
    }
    // Fallback to tour's featured_image or a placeholder
    return tour.featured_image || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';
  };

  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-3xl font-serif font-bold mb-4 uppercase">
            EXAMPLE<br/>{country.name.toUpperCase()} HONEYMOONS
          </h2>
          <p className="text-base text-gray-700 mb-6 font-serif">
            These luxury {country.name} honeymoons are simply suggestions for the kind of holiday you might have. 
            Yours will be tailored, altered, and refined until it matches you completely.
          </p>
        </div>
        
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {displayTours.map((tour) => (
              <Link 
                to={`/tours/${tour.slug}`} 
                key={tour.id} 
                className="block h-[600px] relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-4 right-6 z-10 text-white font-serif tracking-wider text-lg">
                  {tour.duration} NIGHTS
                </div>
                
                <div className="w-full h-full relative">
                  <img 
                    src={getTourImage(tour)} 
                    alt={tour.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                    <div className="absolute bottom-0 left-0 p-8 text-white">
                      <p className="uppercase text-sm tracking-wider mb-2 font-sans">{country.name}</p>
                      <h3 className="text-2xl font-bold uppercase font-serif tracking-wide mb-6">{tour.name}</h3>
                      <p className="text-sm mb-8 font-serif">From £{tour.guide_price.toLocaleString()} per person</p>
                      
                      <div className="inline-block border border-white px-8 py-3 uppercase tracking-wider text-sm font-sans backdrop-blur-sm bg-white/10 transition-colors group-hover:bg-white/20">
                        EXPLORE MOON
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationTours;
