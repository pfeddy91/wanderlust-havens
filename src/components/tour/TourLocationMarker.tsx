
import React from 'react';
import mapboxgl from 'mapbox-gl';
import { TourLocation } from '@/types/tour';
import { getLocationColor } from './mapUtils';

interface TourLocationMarkerProps {
  location: TourLocation;
  map: mapboxgl.Map;
  index: number;
  total: number;
}

const TourLocationMarker: React.FC<TourLocationMarkerProps> = ({ 
  location, 
  map, 
  index, 
  total 
}) => {
  React.useEffect(() => {
    // Create a custom marker element
    const el = document.createElement('div');
    el.className = 'location-marker';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = getLocationColor(index, total);
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    
    // Add a popup for each marker
    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`<h3 style="font-weight: bold; margin-bottom: 5px;">${location.name}</h3>
              ${location.description ? `<p>${location.description}</p>` : ''}
              ${location.stay_duration ? `<p>Stay: ${location.stay_duration} days</p>` : ''}`);
    
    // Add the marker to the map
    const marker = new mapboxgl.Marker(el)
      .setLngLat([location.longitude, location.latitude])
      .setPopup(popup)
      .addTo(map);

    // Cleanup function to remove the marker when component unmounts
    return () => {
      marker.remove();
    };
  }, [location, map, index, total]);

  // This component doesn't render anything visible itself
  return null;
};

export default TourLocationMarker;
