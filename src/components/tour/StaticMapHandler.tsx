
import React, { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { TourMap } from '@/types/tour';
import { extractCoordinatesFromStaticMap, getFallbackCenter } from './mapUtils';

interface StaticMapHandlerProps {
  map: mapboxgl.Map;
  tourMap: TourMap;
}

const StaticMapHandler: React.FC<StaticMapHandlerProps> = ({ map, tourMap }) => {
  useEffect(() => {
    if (!map || !tourMap.static_map_url) return;
    
    // Try to extract coordinates from static map URL
    const coordinates = extractCoordinatesFromStaticMap(tourMap.static_map_url);
    
    if (coordinates) {
      // If coordinates were successfully extracted, center the map
      map.setCenter(coordinates.center);
      map.setZoom(coordinates.zoom);
      
      // Add a marker at the center
      new mapboxgl.Marker({
        color: "#f5b942"
      })
        .setLngLat(coordinates.center)
        .addTo(map);
    } else {
      // Use fallback coordinates based on URL content
      const fallback = getFallbackCenter(tourMap.static_map_url);
      map.setCenter(fallback.center);
      map.setZoom(fallback.zoom);
      
      // Add a marker at the fallback center
      new mapboxgl.Marker({
        color: "#f5b942"
      })
        .setLngLat(fallback.center)
        .addTo(map);
    }
  }, [map, tourMap]);

  // This component doesn't render anything visible itself
  return null;
};

export default StaticMapHandler;
