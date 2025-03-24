import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';

// Mapbox public token - this should be stored securely in production
mapboxgl.accessToken = 'pk.eyJ1IjoibG92YWJsZWFpIiwiYSI6ImNsdmt1dWM2ZzBnZ3EyaW11a281emJxM3oifQ.a5xW8vTtgfH6UeQuRXNlUw';

interface TourMap {
  static_map_url: string;
  route_geojson?: any;
  distance?: string;
  duration?: string;
}

interface MapViewProps {
  tourMap: TourMap | null;
  className?: string;
}

const MapView: React.FC<MapViewProps> = ({ tourMap, className = "" }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (!tourMap) {
      setError("Map data not available");
      setLoading(false);
      return;
    }

    const initializeMap = async () => {
      setLoading(true);
      try {
        // Initialize the map
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/outdoors-v12', // Outdoor style is good for travel/tours
          zoom: 5,
          pitch: 45, // Add some 3D perspective
          attributionControl: false, // We'll add this manually
        });

        // Add navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl(),
          'top-right'
        );

        // Add attribution
        map.current.addControl(
          new mapboxgl.AttributionControl({
            compact: true
          })
        );

        // Wait for map to load
        map.current.on('load', () => {
          if (!map.current) return;

          try {
            // If we have GeoJSON data, add it to the map
            if (tourMap.route_geojson) {
              const geojsonData = typeof tourMap.route_geojson === 'string' 
                ? JSON.parse(tourMap.route_geojson) 
                : tourMap.route_geojson;

              if (geojsonData.features && geojsonData.features.length > 0) {
                // Add route source
                map.current.addSource('route', {
                  type: 'geojson',
                  data: geojsonData
                });

                // Add route line
                map.current.addLayer({
                  id: 'route-line',
                  type: 'line',
                  source: 'route',
                  layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                  },
                  paint: {
                    'line-color': '#f5b942',
                    'line-width': 4,
                    'line-opacity': 0.8
                  }
                });

                // Add points layer
                map.current.addLayer({
                  id: 'route-points',
                  type: 'circle',
                  source: 'route',
                  filter: ['==', '$type', 'Point'],
                  paint: {
                    'circle-radius': 6,
                    'circle-color': '#f5b942',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                  }
                });

                // Fit bounds to the route
                const coordinates = geojsonData.features[0].geometry.coordinates;
                const bounds = new mapboxgl.LngLatBounds();
                
                coordinates.forEach((coord: [number, number]) => {
                  bounds.extend(coord);
                });
                
                map.current.fitBounds(bounds, {
                  padding: 50,
                  maxZoom: 10
                });

                // Add popups for points
                map.current.on('click', 'route-points', (e) => {
                  if (!e.features || !e.features[0] || !e.features[0].properties) return;
                  
                  const coordinates = e.features[0].geometry.coordinates.slice() as [number, number];
                  const { name, description } = e.features[0].properties;
                  
                  new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(`<h3>${name || 'Location'}</h3><p>${description || 'A stop on your journey'}</p>`)
                    .addTo(map.current!);
                });

                // Change cursor on hover
                map.current.on('mouseenter', 'route-points', () => {
                  if (map.current) map.current.getCanvas().style.cursor = 'pointer';
                });
                
                map.current.on('mouseleave', 'route-points', () => {
                  if (map.current) map.current.getCanvas().style.cursor = '';
                });
              } else {
                // Fallback to static map URL if no features found
                handleStaticMapUrl();
              }
            } else {
              // Use static map if no GeoJSON
              handleStaticMapUrl();
            }
            
            setLoading(false);
          } catch (err) {
            console.error('Error rendering GeoJSON:', err);
            // Fallback to static map
            handleStaticMapUrl();
            setLoading(false);
          }
        });

      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize map');
        setLoading(false);
      }
    };

    const handleStaticMapUrl = () => {
      // If we have a static map URL, fit the map to that area
      // This is just a fallback if the GeoJSON data isn't available or valid
      if (tourMap.static_map_url && map.current) {
        // For static map URLs, we'll try to extract coordinates if it's a mapbox URL
        // Otherwise, just set a default view
        try {
          const url = new URL(tourMap.static_map_url);
          const center = url.searchParams.get('center');
          const zoom = url.searchParams.get('zoom');
          
          if (center && zoom) {
            const [lng, lat] = center.split(',').map(Number);
            map.current.setCenter([lng, lat]);
            map.current.setZoom(Number(zoom));
          } else {
            // Default view - Africa
            map.current.setCenter([25, 0]);
            map.current.setZoom(3);
          }
        } catch (e) {
          // If URL parsing fails, set default view
          if (map.current) {
            map.current.setCenter([25, 0]); // Africa
            map.current.setZoom(3);
          }
        }
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [tourMap]);

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

export default MapView;
