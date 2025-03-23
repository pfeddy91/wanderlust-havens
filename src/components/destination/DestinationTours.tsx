
import React from 'react';
import { Button } from '@/components/ui/button';

interface DestinationToursProps {
  tours: any[];
  country: {
    name: string;
  };
}

const DestinationTours = ({ tours, country }: DestinationToursProps) => {
  // If no tours are available, use placeholder tours
  const displayTours = tours.length > 0 ? tours : [
    {
      id: 'placeholder-1',
      name: `A Journey into ${country.name}`,
      duration: 7,
      guide_price: 6000,
      featured_image: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800&q=80',
      slug: 'journey-into-morocco',
      summary: `At the gateway to Africa, ${country.name} bears all the marks of...`
    },
    {
      id: 'placeholder-2',
      name: `Best of ${country.name}: Berbers, Kasbahs & Camels`,
      duration: 13,
      guide_price: 8000,
      featured_image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
      slug: 'best-of-morocco',
      summary: `Experience the rich cultural heritage and stunning landscapes...`
    },
    {
      id: 'placeholder-3',
      name: `${country.name}: A Luxury Adventure in the Sahara Desert`,
      duration: 10,
      guide_price: 7500,
      featured_image: 'https://images.unsplash.com/photo-1482881497185-d4a9ddbe4151?w=800&q=80',
      slug: 'luxury-adventure-sahara',
      summary: `Journey through the golden dunes and starlit skies...`
    }
  ];

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayTours.map((tour) => (
              <div key={tour.id} className="relative group overflow-hidden">
                <div className="aspect-w-2 aspect-h-3 bg-gray-200 h-[500px] md:h-[600px]">
                  <img 
                    src={tour.featured_image || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80'} 
                    alt={tour.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                    <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 font-serif">
                      {tour.duration} NIGHTS
                    </div>
                    
                    <div className="absolute bottom-0 left-0 p-8 text-white">
                      <p className="uppercase text-sm mb-2 font-sans">{country.name}</p>
                      <h3 className="text-2xl font-bold mb-3 uppercase font-serif">{tour.name}</h3>
                      <p className="text-sm mb-4 line-clamp-3 font-serif">{tour.summary}</p>
                      <p className="text-sm mb-6 font-serif">From £{tour.guide_price.toLocaleString()} per person excl. flights</p>
                      
                      <Button variant="outline" className="text-white border-white hover:bg-white hover:text-black rounded-none w-full">
                        EXPLORE HONEYMOON
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationTours;
