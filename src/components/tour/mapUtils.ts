
import mapboxgl from 'mapbox-gl';
import { TourLocation } from '@/types/tour';

// Initialize with the Mapbox token
export const mapboxToken = 'pk.eyJ1IjoicGZlZGVsZTkxIiwiYSI6ImNtOG1hZ2EyaDFiM3AyanNlb2FoYXM0ZXQifQ.RaqIl8lhNGGIMw56nXxIQw';

export const STOP_COLORS = [
  '#3498DB', // Blue for first stop
  '#28B463', // Green for intermediate stops
  '#E74C3C'  // Red for final stop
];

// Helper function to get a color based on position
export const getLocationColor = (index: number, total: number) => {
  if (index === 0) return STOP_COLORS[0]; // First location
  if (index === total - 1) return STOP_COLORS[2]; // Last location
  return STOP_COLORS[1]; // Intermediate locations
};

// Function to extract coordinates from static map URL
export const extractCoordinatesFromStaticMap = (staticMapUrl: string): { center: [number, number], zoom: number } | null => {
  try {
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
          return { center: [lng, lat], zoom };
        }
      }
    }
    return null;
  } catch (e) {
    console.error("Error parsing static map URL:", e);
    return null;
  }
};

// Function to get fallback center based on static map URL keywords
export const getFallbackCenter = (staticMapUrl: string): { center: [number, number], zoom: number } => {
  if (staticMapUrl.includes('brazil') || staticMapUrl.includes('rio')) {
    return { center: [-43.2096, -22.9064], zoom: 5 }; // Rio de Janeiro
  } else if (staticMapUrl.includes('iguazu')) {
    return { center: [-54.4380, -25.6953], zoom: 6 }; // Iguazu Falls
  } else {
    return { center: [-55, -15], zoom: 3 }; // South America default
  }
};

// Process different geometry types for map bounds
export const processGeometry = (geometry: GeoJSON.Geometry, bounds: mapboxgl.LngLatBounds) => {
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
