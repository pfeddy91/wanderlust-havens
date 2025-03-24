import React, { useState } from 'react';
import { Tour } from '@/types/tour';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPin, Hotel } from 'lucide-react';

interface TourItineraryProps {
  tour: Tour;
}

const TourItinerary = ({ tour }: TourItineraryProps) => {
  // Generate itinerary days based on tour duration
  const generateItineraryDays = () => {
    // If we have tour_hotels data, use that to generate itinerary
    if (tour.tour_hotels && tour.tour_hotels.length > 0) {
      return tour.tour_hotels.map((hotelStay, index) => {
        const dayNumber = index + 1;
        const hotel = hotelStay.hotels;
        return {
          day: dayNumber,
          title: hotel?.location || `Day ${dayNumber}`,
          description: `Stay at ${hotel?.name || 'a local hotel'} for ${hotelStay.nights} night${hotelStay.nights > 1 ? 's' : ''}.`,
          location: hotel?.location,
          hotel: hotel?.name,
          nights: hotelStay.nights,
          image: hotel?.hotel_images && hotel.hotel_images.length > 0 
            ? hotel.hotel_images[0].image_url 
            : getRandomImage(dayNumber)
        };
      });
    }
    
    // Otherwise generate placeholder itinerary
    return Array.from({ length: tour.duration }, (_, i) => {
      const day = i + 1;
      return {
        day,
        title: `Day ${day}`,
        description: `Explore the local area and enjoy the sights and sounds.`,
        location: 'Various locations',
        hotel: 'Luxury accommodation',
        nights: 1,
        image: getRandomImage(day)
      };
    });
  };

  const getRandomImage = (seed: number) => {
    // Use tour images if available, otherwise use placeholder
    if (tour.tour_images && tour.tour_images.length > 0) {
      const index = seed % tour.tour_images.length;
      return tour.tour_images[index].image_url;
    }
    
    // Placeholder images
    const placeholders = [
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
      'https://images.unsplash.com/photo-1502301103665-0b95cc738daf?w=800&q=80',
      'https://images.unsplash.com/photo-1520338801623-6b88fe7dd37f?w=800&q=80'
    ];
    return placeholders[seed % placeholders.length];
  };

  const itineraryDays = generateItineraryDays();
  const [expandedDays, setExpandedDays] = useState<string[]>(['day-1']);

  return (
    <div>
      <h2 className="mb-8 font-serif text-3xl font-bold uppercase tracking-wide">
        Itinerary idea in detail
      </h2>
      
      <p className="mb-8 font-serif text-lg text-gray-700">
        This itinerary is designed to inspire you with a range of exciting activities and experiences.
        Your journey will be tailored to your preferences and can be adjusted to create your perfect trip.
      </p>
      
      <div className="mt-10">
        <Accordion 
          type="multiple" 
          value={expandedDays}
          onValueChange={setExpandedDays}
          className="border-l border-gray-300"
        >
          {itineraryDays.map((day, index) => (
            <AccordionItem 
              key={`day-${day.day}`} 
              value={`day-${day.day}`}
              className="border-b-0"
            >
              <div className="relative">
                <div className="absolute -left-4 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                  {day.day}
                </div>
              </div>
              
              <AccordionTrigger className="pl-8 py-4 font-serif text-xl font-medium">
                {day.title}
              </AccordionTrigger>
              
              <AccordionContent className="pl-8">
                <div className="grid grid-cols-1 gap-6 pb-8 md:grid-cols-2">
                  <div>
                    <p className="mb-6 font-serif text-gray-700">
                      {day.description}
                    </p>
                    
                    {day.location && (
                      <div className="mb-3 flex items-center">
                        <MapPin className="mr-2 h-5 w-5 text-primary" />
                        <span>{day.location}</span>
                      </div>
                    )}
                    
                    {day.hotel && (
                      <div className="flex items-center">
                        <Hotel className="mr-2 h-5 w-5 text-primary" />
                        <span>Stay at: {day.hotel}</span>
                        {day.nights > 0 && (
                          <span className="ml-1 text-gray-500">
                            ({day.nights} night{day.nights > 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="h-64 overflow-hidden rounded-lg shadow-md">
                    <img
                      src={day.image}
                      alt={day.title}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default TourItinerary;
