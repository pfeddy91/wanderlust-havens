import { useState, useCallback } from 'react';

interface SwipeGestureConfig {
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  preventScrollOnSwipe?: boolean;
}

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface TouchEventHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

/**
 * Custom hook for handling swipe gestures on touch devices
 * Optimized for premium mobile experience with configurable sensitivity
 */
export const useSwipeGesture = (
  handlers: SwipeHandlers,
  config: SwipeGestureConfig = {}
): TouchEventHandlers => {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    preventScrollOnSwipe = false
  } = config;

  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    const touch = e.targetTouches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchEnd({
      x: touch.clientX,
      y: touch.clientY
    });

    // Prevent scrolling if configured to do so during horizontal swipes
    if (preventScrollOnSwipe && touchStart) {
      const deltaX = Math.abs(touch.clientX - touchStart.x);
      const deltaY = Math.abs(touch.clientY - touchStart.y);
      
      // If horizontal movement is greater than vertical, prevent scroll
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
      }
    }
  }, [touchStart, preventScrollOnSwipe]);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const deltaTime = Date.now() - touchStart.time;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if swipe was fast enough and far enough
    if (deltaTime > maxSwipeTime) return;

    // Determine if this is a horizontal or vertical swipe
    const isHorizontalSwipe = absDeltaX > absDeltaY;
    const isVerticalSwipe = absDeltaY > absDeltaX;

    // Handle horizontal swipes
    if (isHorizontalSwipe && absDeltaX > minSwipeDistance) {
      if (deltaX > 0) {
        handlers.onSwipeLeft?.();
      } else {
        handlers.onSwipeRight?.();
      }
    }

    // Handle vertical swipes
    if (isVerticalSwipe && absDeltaY > minSwipeDistance) {
      if (deltaY > 0) {
        handlers.onSwipeUp?.();
      } else {
        handlers.onSwipeDown?.();
      }
    }

    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, minSwipeDistance, maxSwipeTime, handlers]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

/**
 * Specialized hook for carousel swipe gestures with optimized settings
 */
export const useCarouselSwipe = (onPrevious: () => void, onNext: () => void) => {
  return useSwipeGesture(
    {
      onSwipeLeft: onNext,
      onSwipeRight: onPrevious
    },
    {
      minSwipeDistance: 40, // Slightly more sensitive for carousels
      maxSwipeTime: 400, // Allow slightly slower swipes
      preventScrollOnSwipe: true // Prevent page scroll during carousel swipes
    }
  );
};

export default useSwipeGesture; 