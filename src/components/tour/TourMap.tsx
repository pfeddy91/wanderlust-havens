import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TourLocation } from '@/types/tour';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

// Initialize with the Mapbox token
mapboxgl.accessToken = 'pk.eyJ1IjoicGZlZGVsZTkxIiwiYSI6ImNtOG1hZ2EyaDFiM3AyanNlb2FoYXM0ZXQifQ.RaqIl8lhNGGIMw56nXxIQw';

// Location marker colors
const LOCATION_COLORS = {
  start: '#3498DB',  // Blue for first stop
  middle: '#28B463', // Green for intermediate stops
  end: '#E74C3C'     // Red for final stop
};

interface TourMapProps {
  // Accept both location data and route data
  tourLocations?: TourLocation[];
  staticMapUrl?: string;
  routeGeoJson?: any;
  className?: string;
  mapStyle?: string;
}

const TourMap: React.FC<TourMapProps> = ({ 
  tourLocations = [], 
  staticMapUrl = '',
  routeGeoJson = null,
  className = "",
  mapStyle = 'mapbox://styles/mapbox/light-v11'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!mapContainer.current) return;
    
    console.log('TourMap received props:', {
      tourLocations: tourLocations?.length || 0,
      hasStaticMapUrl: !!staticMapUrl,
      hasRouteGeoJson: !!routeGeoJson
    });
    
    if (tourLocations?.length > 0) {
      console.log('Tour locations:', tourLocations);
    }
    
    const initializeMap = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Initialize the map
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: mapStyle,
          zoom: 4,
          pitch: 30,
          bearing: 0,
          attributionControl: true,
          renderWorldCopies: true,
          fadeDuration: 100,
          interactive: true,
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
          
          // Add terrain source with subtle exaggeration
          map.current.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
          });
          
          // Add subtle terrain to the map (lower exaggeration value)
          map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 0.8 });
          
          // Adjust the water color to be slightly more visible but still subtle
          if (map.current.getLayer('water')) {
            map.current.setPaintProperty('water', 'fill-color', '#e2e8f0');
          }
          
          // Priority order for data visualization:
          // 1. Tour locations (if available)
          // 2. GeoJSON route data (if available)
          // 3. Static map URL (as fallback)
          
          if (tourLocations.length > 0) {
            // Render locations with markers and connecting lines
            addLocationsToMap(tourLocations);
          } else if (routeGeoJson) {
            // Render GeoJSON route data
            addRouteToMap(routeGeoJson);
          } else if (staticMapUrl) {
            // Use static map URL to center the map
            centerMapBasedOnStaticUrl(staticMapUrl);
          } else {
            // Default view if no data is available
            setDefaultMapView();
          }
          
          setLoading(false);
        });

        // Handle map errors
        map.current.on('error', (e) => {
          console.error('Map error:', e);
          
          // Check if it's a token error
          if (e.error && typeof e.error === 'object' && 'message' in e.error && 
              (e.error.message?.includes('access token') || e.error.message?.includes('401'))) {
            setTokenError(true);
            setError("Invalid Mapbox access token. Please provide a valid token below.");
          } else {
            setError("Error loading map. Please try again later.");
          }
          
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
  }, [tourLocations, routeGeoJson, staticMapUrl, mapStyle, isMobile]);

  // Function to add locations with markers and connecting lines
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
        order: loc.order_index,
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

    // Add a circle layer to highlight small islands or coastal areas
    if (map.current.getSource('location-points')) {
      map.current.removeSource('location-points');
    }
    
    map.current.addSource('location-points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: points
      }
    });
    
    // Add a larger circle under each point for better visibility
    map.current.addLayer({
      id: 'location-points-highlight',
      type: 'circle',
      source: 'location-points',
      paint: {
        'circle-radius': 12,
        'circle-color': '#ffffff',
        'circle-opacity': 0.6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#000000',
        'circle-stroke-opacity': 0.3
      }
    });

    // Add markers for each location
    locations.forEach((location, index) => {
      // Create a custom marker element
      const el = document.createElement('div');
      el.className = 'location-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = getLocationColor(index, locations.length);
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '12px';
      el.textContent = `${index + 1}`;
      
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

      // Add a text label for each location
      if (map.current) {
        map.current.addLayer({
          id: `location-label-${index}`,
          type: 'symbol',
          source: {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [location.longitude, location.latitude]
              },
              properties: {
                title: location.name
              }
            }
          },
          layout: {
            'text-field': ['get', 'title'],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-size': 12
          },
          paint: {
            'text-color': '#000',
            'text-halo-color': '#fff',
            'text-halo-width': 2
          }
        });
      }
    });

    // Fit map to show all locations with padding
    fitMapToLocations(locations);
  };

  // Function to add GeoJSON route data to the map
  const addRouteToMap = (geojsonData: any) => {
    if (!map.current) return;
    
    try {
      // Parse GeoJSON if it's a string
      const parsedData = typeof geojsonData === 'string' 
        ? JSON.parse(geojsonData) 
        : geojsonData;
      
      if (parsedData.features && parsedData.features.length > 0) {
        // Add route source
        map.current.addSource('route', {
          type: 'geojson',
          data: parsedData
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
        
        // Process all geometries in the GeoJSON
        parsedData.features.forEach((feature: any) => {
          if (feature.geometry) {
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
          setDefaultMapView();
        }

        // Add popups for points
        map.current.on('click', 'route-points', (e) => {
          if (!e.features || !e.features[0] || !e.features[0].properties) return;
          
          const feature = e.features[0];
          // The 'route-points' layer is filtered for 'Point' types, but this is a good safety check
          if (feature.geometry.type !== 'Point') return;

          const coordinates = feature.geometry.coordinates.slice();
          const properties = feature.properties;
          
          // Create popup content
          let popupContent = '';
          
          if (properties.name) {
            popupContent += `<h3 style="font-weight: bold; margin-bottom: 5px;">${properties.name}</h3>`;
          }
          
          if (properties.description) {
            popupContent += `<p>${properties.description}</p>`;
          }
          
          // Create and display the popup
          new mapboxgl.Popup()
            .setLngLat(coordinates as [number, number])
            .setHTML(popupContent)
            .addTo(map.current!);
        });
      } else {
        console.warn('GeoJSON data has no features');
        setDefaultMapView();
      }
    } catch (error) {
      console.error('Error processing GeoJSON data:', error);
      setDefaultMapView();
    }
  };

  // Process different geometry types for bounds calculation
  const processGeometry = (geometry: any, bounds: mapboxgl.LngLatBounds) => {
    if (!geometry || !geometry.type) return;
    
    if (geometry.type === 'Point' && geometry.coordinates) {
      bounds.extend(geometry.coordinates as [number, number]);
    } else if (geometry.type === 'LineString' && geometry.coordinates) {
      geometry.coordinates.forEach((coord: [number, number]) => {
        bounds.extend(coord);
      });
    } else if (geometry.type === 'Polygon' && geometry.coordinates) {
      geometry.coordinates.forEach((ring: [number, number][]) => {
        ring.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
      });
    } else if (geometry.type === 'MultiPoint' && geometry.coordinates) {
      geometry.coordinates.forEach((coord: [number, number]) => {
        bounds.extend(coord);
      });
    } else if (geometry.type === 'MultiLineString' && geometry.coordinates) {
      geometry.coordinates.forEach((line: [number, number][]) => {
        line.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
      });
    } else if (geometry.type === 'MultiPolygon' && geometry.coordinates) {
      geometry.coordinates.forEach((polygon: [number, number][][]) => {
        polygon.forEach((ring: [number, number][]) => {
          ring.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });
        });
      });
    }
  };

  // Center map based on static URL
  const centerMapBasedOnStaticUrl = (staticMapUrl: string) => {
    if (!map.current) return;
    
    try {
      // Extract coordinates from static map URL if possible
      const url = new URL(staticMapUrl);
      const pathSegments = url.pathname.split('/');
      
      // Look for coordinates in the URL path
      const coordinatesIndex = pathSegments.findIndex(segment => 
        segment.includes(',') && !segment.includes('(') && !segment.includes(')')
      );
      
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
      
      // Try to extract pin markers from the URL
      const pinRegex = /pin-s-\d+\+[0-9a-f]+\(([^)]+)\)/g;
      let pins = [];
      let match;
      
      while ((match = pinRegex.exec(staticMapUrl)) !== null) {
        const coordinates = match[1].split(',');
        if (coordinates.length === 2) {
          const lng = parseFloat(coordinates[0]);
          const lat = parseFloat(coordinates[1]);
          
          if (!isNaN(lng) && !isNaN(lat)) {
            pins.push([lng, lat]);
          }
        }
      }
      
      if (pins.length > 0) {
        // Create bounds from pins
        const bounds = new mapboxgl.LngLatBounds();
        pins.forEach(pin => bounds.extend(pin as [number, number]));
        
        // Fit map to pins
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 9
        });
        
        // Add markers for each pin
        pins.forEach((pin, index) => {
          const el = document.createElement('div');
          el.className = 'location-marker';
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = getLocationColor(index, pins.length);
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.color = 'white';
          el.style.fontWeight = 'bold';
          el.style.fontSize = '12px';
          el.textContent = `${index + 1}`;
          
          new mapboxgl.Marker(el)
            .setLngLat(pin as [number, number])
            .addTo(map.current!);
        });
        
        return;
      }
      
      // Fallback for specific tours based on URL content
      if (staticMapUrl.includes('brazil') || staticMapUrl.includes('rio')) {
        map.current.setCenter([-43.2096, -22.9064]); // Rio de Janeiro
        map.current.setZoom(5);
        
        // Add a marker for Rio
        new mapboxgl.Marker({
          color: "#f5b942"
        })
          .setLngLat([-43.2096, -22.9064])
          .addTo(map.current);
          
      } else if (staticMapUrl.includes('iguazu')) {
        map.current.setCenter([-54.4380, -25.6953]); // Iguazu Falls
        map.current.setZoom(6);
        
        // Add a marker for Iguazu Falls
        new mapboxgl.Marker({
          color: "#f5b942"
        })
          .setLngLat([-54.4380, -25.6953])
          .addTo(map.current);
      } else {
        // Default view
        setDefaultMapView();
      }
    } catch (e) {
      console.error("Error parsing static map URL:", e);
      setDefaultMapView();
    }
  };

  // Set default map view
  const setDefaultMapView = () => {
    if (!map.current) return;
    
    // Default to South America view
    map.current.setCenter([-55, -15]);
    map.current.setZoom(3);
  };

  // Fit map to show all locations
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
      : { top: 70, bottom: 70, left: 70, right: 70 }; // Original padding for desktop

    // Fit the map to the bounds with padding and adjusted maxZoom
    map.current.fitBounds(bounds, {
      padding: padding,
      maxZoom: 12, // Increase from 9 to 12 for better detail
      duration: 1500 // Smoother animation
    });
  };

  // Get color based on location position
  const getLocationColor = (index: number, total: number) => {
    if (index === 0) return LOCATION_COLORS.start;
    if (index === total - 1) return LOCATION_COLORS.end;
    return LOCATION_COLORS.middle;
  };

  // Update Mapbox token
  const updateMapboxToken = () => {
    if (tokenInput.trim()) {
      mapboxgl.accessToken = tokenInput.trim();
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

export default TourMap; 