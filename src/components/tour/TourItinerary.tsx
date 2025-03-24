
import React, { useState, useEffect } from 'react';
import { Tour } from '@/types/tour';
import { MapPin, Hotel, Clock, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface TourItineraryProps {
  tour: Tour;
}

interface ItinerarySection {
  days: string;
  title: string;
  content: string;
  image?: string;
}

interface TourMap {
  static_map_url: string;
  route_geojson?: any;
  distance?: string;
  duration?: string;
}

const TourItinerary = ({ tour }: TourItineraryProps) => {
  const [itinerarySections, setItinerarySections] = useState<ItinerarySection[]>([]);
  const [tourMap, setTourMap] = useState<TourMap | null>(null);

  useEffect(() => {
    // Parse the description to extract itinerary sections
    if (tour.description) {
      const sections = parseItinerary(tour.description);
      setItinerarySections(sections);
    }

    // Fetch tour map data
    const fetchTourMap = async () => {
      try {
        const { data, error } = await supabase
          .from('tour_maps')
          .select('*')
          .eq('tour_id', tour.id)
          .single();
        
        if (data) {
          setTourMap(data);
        } else if (error) {
          console.error('Error fetching tour map:', error);
        }
      } catch (error) {
        console.error('Failed to fetch tour map:', error);
      }
    };

    fetchTourMap();
  }, [tour.description, tour.id]);

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
      
      <p className="mb-12 font-serif text-lg text-gray-700">
        This itinerary is designed to inspire you with a range of exciting activities and experiences.
        Your journey will be tailored to your preferences and can be adjusted to create your perfect trip.
      </p>
      
      <div className="grid md:grid-cols-[1fr_1.2fr] gap-12">
        {/* Map Column */}
        <div className="space-y-6">
          <div className="rounded-lg overflow-hidden shadow-lg h-[500px] bg-gray-100">
            {tourMap && tourMap.static_map_url ? (
              <img 
                src={tourMap.static_map_url} 
                alt="Tour route map" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100">
                <MapPin className="w-12 h-12 text-gray-400" />
                <p className="text-gray-400 ml-2">Map loading or not available</p>
              </div>
            )}
          </div>
          
          {tourMap && (
            <div className="space-y-4">
              {tourMap.distance && (
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-primary mr-2" />
                  <span className="text-gray-700">Distance: {tourMap.distance}</span>
                </div>
              )}
              
              {tourMap.duration && (
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-primary mr-2" />
                  <span className="text-gray-700">Duration: {tourMap.duration}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-serif font-bold mb-4">Tour Overview</h3>
            <div className="flex items-start mb-3">
              <Calendar className="w-5 h-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="font-medium">Duration</p>
                <p className="text-gray-600">{tour.duration} days</p>
              </div>
            </div>
            <div className="flex items-start">
              <Hotel className="w-5 h-5 text-primary mr-3 mt-0.5" />
              <div>
                <p className="font-medium">Accommodations</p>
                <p className="text-gray-600">{tour.tour_hotels?.length || 'Various'} hotels included</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Itinerary Sections Column */}
        <div className="space-y-8">
          {itinerarySections.map((section, index) => (
            <Card key={`section-${index}`} className="overflow-hidden">
              <div className="bg-primary/5 px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-primary font-medium uppercase tracking-wide">
                    Days {section.days}
                  </div>
                  {index > 0 && (
                    <div className="text-sm text-gray-500">
                      Continue your journey
                    </div>
                  )}
                </div>
              </div>
              
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary text-xl font-bold">
                      {section.days.includes('-') 
                        ? section.days.split('-')[0] 
                        : section.days}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-serif text-xl font-bold uppercase tracking-wide mb-2">
                      {section.title}
                    </h3>
                    <div className="prose prose-sm max-w-none font-serif text-gray-700 whitespace-pre-line">
                      {section.content}
                    </div>
                  </div>
                </div>
                
                {section.image && (
                  <div className="mt-4 rounded-lg overflow-hidden">
                    <img 
                      src={section.image}
                      alt={`Days ${section.days}: ${section.title}`}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
              </CardContent>
              
              {index < itinerarySections.length - 1 && <Separator />}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TourItinerary;
