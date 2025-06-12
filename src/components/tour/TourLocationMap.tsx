import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TourLocation, TourMap } from '@/types/tour';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

// Initialize with the Mapbox token
mapboxgl.accessToken = 'pk.eyJ1IjoicGZlZGVsZTkxIiwiYSI6ImNtOG1hZ2EyaDFiM3AyanNlb2FoYXM0ZXQifQ.RaqIl8lhNGGIMw56nXxIQw';

const STOP_COLORS = [
  '#3498DB', // Blue for first stop
  '#28B463', // Green for intermediate stops
  '#E74C3C'  // Red for final stop
];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

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

        // Disable scroll zoom on mobile to avoid scroll hijacking
        if (isMobile) {
          map.current.scrollZoom.disable();
        }

        // Add navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl(),
          'bottom-right'
        );

        // Handle map load
        map.current.on('load', () => {
          if (!map.current) return;
          
          if (tourLocations.length > 0) {
            addLocationsToMap(tourLocations);
          } else if (tourMap?.static_map_url) {
            centerMapBasedOnStaticUrl(tourMap.static_map_url);
          } else {
            // Default view if no locations or static map
            map.current.setCenter([-55, -15]); // South America default
            map.current.setZoom(3);
          }
          
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

    const addLocationsToMap = (locations: TourLocation[]) => {
      if (!map.current || locations.length === 0) return;
      
      // Create a GeoJSON feature collection for locations
      const points: GeoJSON.Feature<GeoJSON.Point>[] = locations.map((loc, index) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [loc.longitude, loc.latitude]
        },
        properties: {
          name: loc.name,
          description: loc.description || '',
          order: loc.order_index, // Changed from order to order_index
          color: getLocationColor(index, locations.length)
        }
      }));

      // Create a GeoJSON feature for the route line
      const lineCoordinates = locations.map(loc => [loc.longitude, loc.latitude]);
      const routeLine: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: lineCoordinates as [number, number][]
        },
        properties: {}
      };

      // Add the points source
      map.current.addSource('locations', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: points
        }
      });

      // Add the route line source
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [routeLine]
        }
      });

      // Add the route line layer (dotted line)
      map.current.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#000',
          'line-width': 2,
          'line-opacity': 0.7,
          'line-dasharray': [2, 2] // Creates a dotted line effect
        }
      });

      // Add markers for each location
      locations.forEach((location, index) => {
        // Create a custom marker element
        const el = document.createElement('div');
        el.className = 'location-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = getLocationColor(index, locations.length);
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
        
        // Add a popup for each marker
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<h3 style="font-weight: bold; margin-bottom: 5px;">${location.name}</h3>
                   ${location.description ? `<p>${location.description}</p>` : ''}
                   ${location.stay_duration ? `<p>Stay: ${location.stay_duration} days</p>` : ''}`);
        
        // Add the marker to the map
        new mapboxgl.Marker(el)
          .setLngLat([location.longitude, location.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      });

      // Fit map to show all locations with padding
      fitMapToLocations(locations);
    };

    const fitMapToLocations = (locations: TourLocation[]) => {
      if (!map.current || locations.length === 0) return;
      
      const bounds = new mapboxgl.LngLatBounds();
      
      // Extend bounds to include all locations
      locations.forEach(location => {
        bounds.extend([location.longitude, location.latitude]);
      });
      
      // Use responsive padding to ensure visibility on mobile
      const padding = isMobile
        ? { top: 60, bottom: 60, left: 40, right: 40 } // Reduced padding for mobile
        : { top: 50, bottom: 50, left: 50, right: 50 }; // Original padding for desktop
      
      // Fit the map to the bounds with padding
      map.current.fitBounds(bounds, {
        padding: padding,
        maxZoom: 9
      });
    };

    const centerMapBasedOnStaticUrl = (staticMapUrl: string) => {
      if (!map.current) return;
      
      try {
        // Extract coordinates from static map URL if possible
        const url = new URL(staticMapUrl);
        const pathSegments = url.pathname.split('/');
        const coordinatesIndex = pathSegments.findIndex(segment => segment.includes(','));
        
        if (coordinatesIndex !== -1) {
          const coordsWithZoom = pathSegments[coordinatesIndex];
          const parts = coordsWithZoom.split(',');
          
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            const zoom = parts.length > 2 ? parseFloat(parts[2]) : 5;
            
            if (!isNaN(lng) && !isNaN(lat)) {
              map.current.setCenter([lng, lat]);
              map.current.setZoom(zoom);
              return;
            }
          }
        }
        
        // Fallback for specific tours based on URL content
        if (staticMapUrl.includes('brazil') || staticMapUrl.includes('rio')) {
          map.current.setCenter([-43.2096, -22.9064]); // Rio de Janeiro
          map.current.setZoom(5);
        } else if (staticMapUrl.includes('iguazu')) {
          map.current.setCenter([-54.4380, -25.6953]); // Iguazu Falls
          map.current.setZoom(6);
        } else {
          // Default view - South America for fallback
          map.current.setCenter([-55, -15]); // Brazil
          map.current.setZoom(4);
        }
      } catch (e) {
        console.error("Error parsing static map URL:", e);
        // Default view
        if (map.current) {
          map.current.setCenter([-55, -15]); // South America default
          map.current.setZoom(3);
        }
      }
    };

    // Helper function to get a color based on position
    const getLocationColor = (index: number, total: number) => {
      if (index === 0) return STOP_COLORS[0]; // First location
      if (index === total - 1) return STOP_COLORS[2]; // Last location
      return STOP_COLORS[1]; // Intermediate locations
    };

    initializeMap();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [tourLocations, tourMap, isMobile]);

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
      </div>
    </div>
  );
};

export default TourLocationMap;
