
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';

// Initialize with the user's Mapbox token
let mapboxToken = 'pk.eyJ1IjoicGZlZGVsZTkxIiwiYSI6ImNtOG1hZ2EyaDFiM3AyanNlb2FoYXM0ZXQifQ.RaqIl8lhNGGIMw56nXxIQw';

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
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState(false);

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
        // Set the access token
        mapboxgl.accessToken = mapboxToken;
        
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

        // Handle map load errors
        map.current.on('error', (e) => {
          console.error('Map error:', e);
          if (e.error && typeof e.error === 'object' && 'message' in e.error && 
              (e.error.message?.includes('access token') || e.error.message?.includes('401'))) {
            setTokenError(true);
            setError("Invalid Mapbox access token. Please provide a valid token below.");
          } else {
            setError("Error loading map. Please try again later.");
          }
          setLoading(false);
        });

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
                const bounds = new mapboxgl.LngLatBounds();
                
                // Handle different types of geometry
                geojsonData.features.forEach((feature: any) => {
                  if (feature.geometry) {
                    // Handle each geometry type properly
                    processGeometry(feature.geometry, bounds);
                  }
                });
                
                // Only fit bounds if we have added coordinates
                if (!bounds.isEmpty()) {
                  map.current.fitBounds(bounds, {
                    padding: 50,
                    maxZoom: 10
                  });
                } else {
                  // Set default view if no coordinates found
                  handleStaticMapUrl();
                }

                // Add popups for points
                map.current.on('click', 'route-points', (e) => {
                  if (!e.features || !e.features[0] || !e.features[0].properties) return;
                  
                  if (!e.features[0].geometry || e.features[0].geometry.type !== 'Point') return;
                  
                  const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
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

    // Helper function to process different geometry types
    const processGeometry = (geometry: GeoJSON.Geometry, bounds: mapboxgl.LngLatBounds) => {
      if (!geometry || !geometry.type) return;
      
      switch(geometry.type) {
        case 'Point':
          const point = geometry as GeoJSON.Point;
          if (point.coordinates) {
            bounds.extend(point.coordinates as [number, number]);
          }
          break;
        case 'LineString':
          const lineString = geometry as GeoJSON.LineString;
          if (lineString.coordinates) {
            lineString.coordinates.forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
          }
          break;
        case 'Polygon':
          const polygon = geometry as GeoJSON.Polygon;
          if (polygon.coordinates && polygon.coordinates[0]) {
            polygon.coordinates[0].forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
          }
          break;
        case 'MultiPoint':
          const multiPoint = geometry as GeoJSON.MultiPoint;
          if (multiPoint.coordinates) {
            multiPoint.coordinates.forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
          }
          break;
        case 'MultiLineString':
          const multiLineString = geometry as GeoJSON.MultiLineString;
          if (multiLineString.coordinates) {
            multiLineString.coordinates.forEach((line: [number, number][]) => {
              line.forEach((coord: [number, number]) => {
                bounds.extend(coord);
              });
            });
          }
          break;
        case 'MultiPolygon':
          const multiPolygon = geometry as GeoJSON.MultiPolygon;
          if (multiPolygon.coordinates) {
            multiPolygon.coordinates.forEach((polygon: [number, number][][]) => {
              polygon[0].forEach((coord: [number, number]) => {
                bounds.extend(coord);
              });
            });
          }
          break;
        case 'GeometryCollection':
          const collection = geometry as GeoJSON.GeometryCollection;
          if (collection.geometries) {
            collection.geometries.forEach((geom: GeoJSON.Geometry) => {
              // Recursively process each geometry in the collection
              processGeometry(geom, bounds);
            });
          }
          break;
      }
    };

    const handleStaticMapUrl = () => {
      // If we have a static map URL, fit the map to that area
      // This is just a fallback if the GeoJSON data isn't available or valid
      if (tourMap.static_map_url && map.current) {
        console.log("Using static map URL:", tourMap.static_map_url);
        
        try {
          // For static map URLs, we'll try to extract coordinates if it's a mapbox URL
          const url = new URL(tourMap.static_map_url);
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
                
                // Add a marker at the center
                new mapboxgl.Marker({
                  color: "#f5b942"
                })
                  .setLngLat([lng, lat])
                  .addTo(map.current);
                  
                return;
              }
            }
          }
          
          // Fallback for specific tours based on URL content
          if (tourMap.static_map_url.includes('brazil') || tourMap.static_map_url.includes('rio')) {
            map.current.setCenter([-43.2096, -22.9064]); // Rio de Janeiro
            map.current.setZoom(5);
            
            // Add a marker for Rio
            new mapboxgl.Marker({
              color: "#f5b942"
            })
              .setLngLat([-43.2096, -22.9064])
              .addTo(map.current);
              
          } else if (tourMap.static_map_url.includes('iguazu')) {
            map.current.setCenter([-54.4380, -25.6953]); // Iguazu Falls
            map.current.setZoom(6);
            
            // Add a marker for Iguazu Falls
            new mapboxgl.Marker({
              color: "#f5b942"
            })
              .setLngLat([-54.4380, -25.6953])
              .addTo(map.current);
          } else {
            // Default view - South America for Brazilian tours
            map.current.setCenter([-55, -15]); // Brazil
            map.current.setZoom(4);
          }
        } catch (e) {
          console.error("Error parsing static map URL:", e);
          // If URL parsing fails, check if we can still determine the location from the URL string
          if (tourMap.static_map_url.includes('brazil') || tourMap.static_map_url.includes('rio')) {
            if (map.current) {
              map.current.setCenter([-43.2096, -22.9064]); // Rio de Janeiro
              map.current.setZoom(5);
              
              // Add a marker for Rio
              new mapboxgl.Marker({
                color: "#f5b942"
              })
                .setLngLat([-43.2096, -22.9064])
                .addTo(map.current);
            }
          } else if (tourMap.static_map_url.includes('iguazu')) {
            if (map.current) {
              map.current.setCenter([-54.4380, -25.6953]); // Iguazu Falls
              map.current.setZoom(6);
              
              // Add a marker for Iguazu Falls
              new mapboxgl.Marker({
                color: "#f5b942"
              })
                .setLngLat([-54.4380, -25.6953])
                .addTo(map.current);
            }
          } else {
            // Default view - South America for fallback
            if (map.current) {
              map.current.setCenter([-55, -15]); // Brazil
              map.current.setZoom(4);
            }
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
  }, [tourMap, mapboxToken]);

  // Function to update the Mapbox token and reinitialize the map
  const updateMapboxToken = () => {
    if (tokenInput.trim()) {
      mapboxToken = tokenInput.trim();
      setTokenError(false);
      setError(null);
      setLoading(true);
      
      // If there's a map instance, remove it
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      
      // The useEffect will reinitialize the map with the new token
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        
        {error && !loading && !tokenError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center p-4">
              <p className="text-red-500">{error}</p>
              <p className="text-sm text-gray-600 mt-2">Unable to load the map</p>
            </div>
          </div>
        )}
        
        {tokenError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10 p-4">
            <div className="text-center mb-4">
              <p className="text-red-500">Invalid Mapbox access token</p>
              <p className="text-sm text-gray-600 mt-2">
                Enter a valid Mapbox token to view the map. 
                Get a token at <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Mapbox.com</a>
              </p>
            </div>
            <div className="flex w-full max-w-md">
              <input 
                type="text" 
                className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter Mapbox access token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <button 
                className="bg-primary text-white px-4 py-2 rounded-r-md hover:bg-primary/80 transition-colors"
                onClick={updateMapboxToken}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
