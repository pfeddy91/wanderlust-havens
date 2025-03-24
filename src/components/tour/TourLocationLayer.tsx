
import React, { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { TourLocation } from '@/types/tour';
import TourLocationMarker from './TourLocationMarker';
import { getLocationColor } from './mapUtils';

interface TourLocationLayerProps {
  map: mapboxgl.Map;
  locations: TourLocation[];
}

const TourLocationLayer: React.FC<TourLocationLayerProps> = ({ map, locations }) => {
  useEffect(() => {
    if (!map || locations.length === 0) return;
    
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
    map.addSource('locations', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: points
      }
    });

    // Add the route line source
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [routeLine]
      }
    });

    // Add the route line layer (dotted line)
    map.addLayer({
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

    // Fit map to show all locations with padding
    fitMapToLocations(locations, map);

    // Cleanup function to remove sources and layers when component unmounts
    return () => {
      if (map.getLayer('route-line')) {
        map.removeLayer('route-line');
      }
      if (map.getSource('route')) {
        map.removeSource('route');
      }
      if (map.getSource('locations')) {
        map.removeSource('locations');
      }
    };
  }, [map, locations]);

  const fitMapToLocations = (locations: TourLocation[], map: mapboxgl.Map) => {
    if (!map || locations.length === 0) return;
    
    const bounds = new mapboxgl.LngLatBounds();
    
    // Extend bounds to include all locations
    locations.forEach(location => {
      bounds.extend([location.longitude, location.latitude]);
    });
    
    // Fit the map to the bounds with padding
    map.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      maxZoom: 9
    });
  };

  // Render markers for each location
  return (
    <>
      {locations.map((location, index) => (
        <TourLocationMarker
          key={location.id}
          location={location}
          map={map}
          index={index}
          total={locations.length}
        />
      ))}
    </>
  );
};

export default TourLocationLayer;
