import React, { useState, useEffect } from 'react';
import { Tour } from '@/types/tour';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import TourLocationMap from './TourLocationMap';
import { getTourLocations, getTourMap } from '@/services/honeymoonService';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TourItineraryProps {
  tour: Tour;
}

interface ItinerarySection {
  days: string;
  title: string;
  content: string;
}

interface DatabaseItinerarySection {
  id: number;
  tour_id: string;
  day_range: string;
  title: string;
  content: string;
  order_index: number;
}

const TourItinerary = ({ tour }: TourItineraryProps) => {
  const [itinerarySections, setItinerarySections] = useState<ItinerarySection[]>([]);
  const [tourMap, setTourMap] = useState<any>(null);
  const [tourLocations, setTourLocations] = useState<any[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [itineraryLoading, setItineraryLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<number | null>(0); // First section expanded by default

  useEffect(() => {
    // Fetch itinerary sections from database
    const fetchItinerarySections = async () => {
      setItineraryLoading(true);
      try {
        // First try to get sections from the tour_itineraries table
        const { data, error } = await supabase
          .from('tour_itineraries')
          .select('*')
          .eq('tour_id', tour.id)
          .order('order_index');
        
        if (error) {
          console.error('Error fetching tour itineraries:', error);
          // Fall back to parsing from description
          if (tour.description) {
            const sections = parseItinerary(tour.description);
            setItinerarySections(sections);
          }
        } else if (data && data.length > 0) {
          // Convert database format to component format
          const sections: ItinerarySection[] = data.map((section: DatabaseItinerarySection) => ({
            days: section.day_range,
            title: section.title,
            content: section.content
          }));
          setItinerarySections(sections);
          console.log(`Loaded ${sections.length} itinerary sections from database`);
          
          // Ensure the first section is expanded after loading
          setExpandedSection(0);
        } else {
          // No data in database, fall back to parsing from description
          console.log('No itinerary sections found in database, parsing from description');
          if (tour.description) {
            const sections = parseItinerary(tour.description);
            setItinerarySections(sections);
            
            // Ensure the first section is expanded after parsing
            if (sections.length > 0) {
              setExpandedSection(0);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch itinerary sections:', error);
        // Fall back to parsing from description
        if (tour.description) {
          const sections = parseItinerary(tour.description);
          setItinerarySections(sections);
          
          // Ensure the first section is expanded after parsing
          if (sections.length > 0) {
            setExpandedSection(0);
          }
        }
      } finally {
        setItineraryLoading(false);
      }
    };

    // Fetch tour locations and map data
    const fetchTourData = async () => {
      setMapLoading(true);
      try {
        // Fetch tour locations
        const locations = await getTourLocations(tour.id);
        setTourLocations(locations);
        
        // Fetch tour map
        const mapData = await getTourMap(tour.id);
        
        if (mapData) {
          console.log("Found tour map data:", mapData);
          // Ensure the GeoJSON is parsed if it's a string
          if (typeof mapData.route_geojson === 'string') {
            try {
              mapData.route_geojson = JSON.parse(mapData.route_geojson);
            } catch (e) {
              console.error('Error parsing GeoJSON string:', e);
            }
          }
          
          setTourMap(mapData);
        } else {
          console.log("No tour map found, creating fallback based on the tour:", tour.slug);
          // Set a basic fallback for this tour
          if (tour.slug.includes('brazil') || tour.slug.includes('rio')) {
            setTourMap({
              static_map_url: 'https://api.mapbox.com/styles/v1/mapbox/light-v11/static/-43.2096,-22.9064,5/800x600?access_token=pk.eyJ1IjoicGZlZGVsZTkxIiwiYSI6ImNtOG1hZ2EyaDFiM3AyanNlb2FoYXM0ZXQifQ.RaqIl8lhNGGIMw56nXxIQw'
            });
          } else if (tour.slug.includes('iguazu')) {
            setTourMap({
              static_map_url: 'https://api.mapbox.com/styles/v1/mapbox/light-v11/static/-54.4380,-25.6953,6/800x600?access_token=pk.eyJ1IjoicGZlZGVsZTkxIiwiYSI6ImNtOG1hZ2EyaDFiM3AyanNlb2FoYXM0ZXQifQ.RaqIl8lhNGGIMw56nXxIQw'
            });
          } else {
            // Default fallback
            setTourMap({
              static_map_url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/0,0,2/800x600?access_token=pk.eyJ1IjoicGZlZGVsZTkxIiwiYSI6ImNtOG1hZ2EyaDFiM3AyanNlb2FoYXM0ZXQifQ.RaqIl8lhNGGIMw56nXxIQw`
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch tour data:', error);
      } finally {
        setMapLoading(false);
      }
    };

    fetchItinerarySections();
    fetchTourData();
  }, [tour.description, tour.id, tour.slug, tour.duration]);

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

  const toggleSection = (index: number) => {
    setExpandedSection(expandedSection === index ? null : index);
  };

  return (
    <div>
      <h2 className="mb-8 font-serif text-xl md:text-3xl font-bold uppercase tracking-wide">
        Itinerary idea in detail
      </h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Map Column */}
        <div className="h-[600px]">
          <div className="rounded-lg overflow-hidden shadow-lg h-full bg-gray-100">
            {!mapLoading ? (
              <TourLocationMap 
                tourLocations={tourLocations}
                tourMap={tourMap} 
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Itinerary Column */}
        <div className="space-y-4">
          {itineraryLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-gray-200 h-24 rounded"></div>
              ))}
            </div>
          ) : (
            <>
              {itinerarySections.map((section, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection(index)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-baseline">
                        <span className="text-primary font-serif text-sm md:text-lg font-bold uppercase tracking-wide whitespace-nowrap inline-block w-[110px] flex-shrink-0">
                          Days {section.days}:
                        </span>
                        <span className="text-primary font-serif text-sm md:text-lg font-bold uppercase tracking-wide">
                          {section.title}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {expandedSection === index ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>
                  
                  {expandedSection === index && (
                    <div className="border-t bg-gray-50 p-4">
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line font-serif text-sm md:text-base">
                        {section.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TourItinerary;
