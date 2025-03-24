import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TourLocation, TourMap } from '@/types/tour';
import { Loader2 } from 'lucide-react';
import TourLocationLayer from './TourLocationLayer';
import StaticMapHandler from './StaticMapHandler';
import { mapboxToken } from './mapUtils';

// Initialize with the Mapbox token
mapboxgl.accessToken = mapboxToken;

interface TourLocationMapProps {
  tourLocations: TourLocation[];
  tourMap: TourMap | null;
  className?: string;
}

const TourLocationMap: React.FC<TourLocationMapProps> = ({ 
  tourLocations, 
  tourMap, 
  className = "" 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    const initializeMap = async () => {
      setLoading(true);
      
      try {
        // Initialize the map with a light style
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11', // Light style with minimal colors
          zoom: 4,
          pitch: 0, // Flat 2D map as shown in the screenshot
          attributionControl: true,
        });

        // Add navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl(),
          'bottom-right'
        );

        // Handle map load
        map.current.on('load', () => {
          setMapLoaded(true);
          setLoading(false);
        });

        // Handle map errors
        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setError("Error loading map. Please try again later.");
          setLoading(false);
        });
        
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize map');
        setLoading(false);
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Determine what to display on the map once it's loaded
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // If we have locations, use them
    if (tourLocations.length > 0) {
      // TourLocationLayer will handle adding the locations to the map
    } 
    // Otherwise, try to use static map URL
    else if (tourMap?.static_map_url) {
      // StaticMapHandler will handle centering based on static URL
    } 
    // If we have neither, use a default view
    else {
      map.current.setCenter([-55, -15]); // South America default
      map.current.setZoom(3);
    }
  }, [mapLoaded, tourLocations, tourMap]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center p-4">
              <p className="text-red-500">{error}</p>
              <p className="text-sm text-gray-600 mt-2">Unable to load the map</p>
            </div>
          </div>
        )}

        {mapLoaded && map.current && (
          <>
            {/* Render location markers and route if we have locations */}
            {tourLocations.length > 0 && (
              <TourLocationLayer 
                map={map.current} 
                locations={tourLocations} 
              />
            )}
            
            {/* Use static map URL as fallback if we have it and no locations */}
            {tourLocations.length === 0 && tourMap?.static_map_url && (
              <StaticMapHandler 
                map={map.current} 
                tourMap={tourMap} 
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TourLocationMap;
