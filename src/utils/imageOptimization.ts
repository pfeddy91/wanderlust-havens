/**
 * Image optimization utilities for Supabase Storage
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Optimizes Supabase Storage image URLs with transformation parameters
 * @param originalUrl - The original image URL
 * @param options - Optimization options
 * @returns Optimized image URL
 */
export const optimizeImageUrl = (
  originalUrl: string | null | undefined, 
  options: ImageOptimizationOptions = {}
): string => {
  // Handle null/undefined URLs
  if (!originalUrl) {
    return 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80'; // Fallback
  }

  // Only optimize Supabase Storage URLs
  if (!originalUrl.includes('supabase.co/storage')) {
    return originalUrl;
  }

  // Default options
  const {
    width = 800,
    height,
    quality = 80,
    format = 'webp',
    resize = 'cover'
  } = options;

  // Build transformation parameters
  const params = new URLSearchParams({
    width: width.toString(),
    resize,
    format,
    quality: quality.toString()
  });

  // Add height if specified
  if (height) {
    params.set('height', height.toString());
  }

  // Remove existing query parameters and add new ones
  const baseUrl = originalUrl.split('?')[0];
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Predefined image size presets for common use cases
 * Optimized for luxury travel agency with premium mobile experience
 */
export const ImagePresets = {
  // Hero images
  hero: { width: 1920, height: 1080, quality: 85 },
  heroMobile: { width: 800, height: 600, quality: 82 }, // Increased quality for luxury
  heroTablet: { width: 1200, height: 800, quality: 85 },
  
  // Cards and thumbnails - Enhanced mobile experience
  cardLarge: { width: 800, height: 600, quality: 80 },
  cardMedium: { width: 600, height: 450, quality: 80 },
  cardSmall: { width: 400, height: 300, quality: 75 },
  
  // NEW: Mobile-optimized card sizes for premium experience
  cardMobile: { width: 400, height: 300, quality: 80 }, // Premium mobile quality
  cardMobileLarge: { width: 500, height: 375, quality: 82 }, // For featured mobile content
  cardTablet: { width: 600, height: 450, quality: 82 }, // Tablet-specific sizing
  
  // NEW: Thumbnail optimizations for mobile carousels
  thumbnailMobile: { width: 200, height: 150, quality: 75 },
  thumbnailTablet: { width: 300, height: 225, quality: 78 },
  
  // Gallery images
  galleryMain: { width: 1200, height: 800, quality: 85 },
  galleryThumb: { width: 300, height: 200, quality: 75 },
  galleryMobile: { width: 600, height: 400, quality: 80 }, // NEW: Mobile gallery optimization
  
  // Destination pages
  destinationHero: { width: 1500, height: 1000, quality: 85 },
  destinationCard: { width: 500, height: 400, quality: 80 },
  destinationMobile: { width: 800, height: 600, quality: 82 }, // NEW: Mobile destination pages
  
  // NEW: Carousel-specific presets for optimal swipe performance
  carouselDesktop: { width: 800, height: 600, quality: 82 },
  carouselTablet: { width: 600, height: 450, quality: 80 },
  carouselMobile: { width: 400, height: 300, quality: 78 }, // Optimized for swipe performance
};

/**
 * Helper function for responsive images based on viewport
 */
export const getResponsiveImageUrl = (
  originalUrl: string | null | undefined,
  size: 'mobile' | 'tablet' | 'desktop' = 'desktop'
): string => {
  const presets = {
    mobile: ImagePresets.cardSmall,
    tablet: ImagePresets.cardMedium,
    desktop: ImagePresets.cardLarge
  };
  
  return optimizeImageUrl(originalUrl, presets[size]);
}; 