
import React, { useState, useEffect } from 'react';
import { Tour } from '@/types/tour';
import { MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import MapView from './MapView';

interface TourItineraryProps {
  tour: Tour;
}

interface ItinerarySection {
  days: string;
  title: string;
  content: string;
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
        content
      });
    }
    
    // If no sections were found with the regex, check if there's an alternative format
    if (sections.length === 0 && description) {
      // Just use the full description as a single section
      sections.push({
        days: "Full Itinerary",
        title: "Complete Journey",
        content: description
      });
    }
    
    return sections;
  };

  return (
    <div>
      <h2 className="mb-8 font-serif text-3xl font-bold uppercase tracking-wide">
        Itinerary idea in detail
      </h2>
      
      <div className="grid md:grid-cols-[1fr_1.2fr] gap-12">
        {/* Map Column */}
        <div className="space-y-6">
          <div className="rounded-lg overflow-hidden shadow-lg h-[500px] bg-gray-100">
            {tourMap ? (
              <MapView 
                tourMap={tourMap} 
                className="w-full h-full"
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
        </div>
        
        {/* Itinerary Sections Column */}
        <div className="space-y-8">
          {itinerarySections.map((section, index) => (
            <Card key={`section-${index}`} className="overflow-hidden border-0 shadow-md">
              <div className="bg-primary/10 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-primary font-serif text-2xl font-bold uppercase tracking-wide">
                    Days {section.days}
                  </div>
                  {index > 0 && (
                    <div className="text-sm text-gray-500">
                      Continue your journey
                    </div>
                  )}
                </div>
              </div>
              
              <CardContent className="p-6">
                <div>
                  <h3 className="font-serif text-xl font-bold uppercase tracking-wide mb-4">
                    {section.title}
                  </h3>
                  <div className="prose prose-sm max-w-none font-serif text-gray-700 whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
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
