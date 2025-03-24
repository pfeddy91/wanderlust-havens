
import React, { useState, useEffect } from 'react';
import { Tour } from '@/types/tour';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPin, Hotel } from 'lucide-react';

interface TourItineraryProps {
  tour: Tour;
}

interface ItinerarySection {
  days: string;
  title: string;
  content: string;
  image?: string;
}

const TourItinerary = ({ tour }: TourItineraryProps) => {
  const [itinerarySections, setItinerarySections] = useState<ItinerarySection[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);

  useEffect(() => {
    // Parse the description to extract itinerary sections
    if (tour.description) {
      const sections = parseItinerary(tour.description);
      setItinerarySections(sections);
      
      // Expand the first section by default
      if (sections.length > 0) {
        setExpandedDays([`section-0`]);
      }
    }
  }, [tour.description]);

  const parseItinerary = (description: string): ItinerarySection[] => {
    // Regular expression to match day ranges and their content
    const regex = /### Days ([^:]+): ([^\n]+)\s+([^#]+)/g;
    const sections: ItinerarySection[] = [];
    
    let match;
    while ((match = regex.exec(description)) !== null) {
      const days = match[1].trim();
      const title = match[2].trim();
      const content = match[3].trim();
      
      sections.push({
        days,
        title,
        content,
        image: getImageForSection(sections.length)
      });
    }
    
    // If no sections were found with the regex, check if there's an alternative format
    if (sections.length === 0 && description) {
      // Just use the full description as a single section
      sections.push({
        days: "Full Itinerary",
        title: "Complete Journey",
        content: description,
        image: getImageForSection(0)
      });
    }
    
    return sections;
  };

  const getImageForSection = (index: number): string => {
    // Use tour images if available, otherwise use placeholder
    if (tour.tour_images && tour.tour_images.length > 0) {
      const imageIndex = index % tour.tour_images.length;
      return tour.tour_images[imageIndex].image_url;
    }
    
    // Placeholder images
    const placeholders = [
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
      'https://images.unsplash.com/photo-1502301103665-0b95cc738daf?w=800&q=80',
      'https://images.unsplash.com/photo-1520338801623-6b88fe7dd37f?w=800&q=80'
    ];
    return placeholders[index % placeholders.length];
  };

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
          {itinerarySections.map((section, index) => (
            <AccordionItem 
              key={`section-${index}`} 
              value={`section-${index}`}
              className="border-b-0"
            >
              <div className="relative">
                <div className="absolute -left-4 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                  {index + 1}
                </div>
              </div>
              
              <AccordionTrigger className="pl-8 py-4 font-serif text-xl font-medium">
                Days {section.days}: {section.title}
              </AccordionTrigger>
              
              <AccordionContent className="pl-8">
                <div className="grid grid-cols-1 gap-6 pb-8 md:grid-cols-2">
                  <div>
                    <div className="mb-6 font-serif text-gray-700 whitespace-pre-line">
                      {section.content}
                    </div>
                  </div>
                  
                  <div className="h-64 overflow-hidden rounded-lg shadow-md">
                    <img
                      src={section.image}
                      alt={`Days ${section.days}: ${section.title}`}
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
