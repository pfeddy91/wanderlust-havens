import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

/**
 * Premium touch-optimized button component
 * Follows mobile optimization principles with proper touch targets and haptic feedback
 */
export const TouchButton: React.FC<TouchButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  isLoading = false,
  disabled,
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const baseClasses = "relative inline-flex items-center justify-center font-serif font-medium rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";
  
  // Touch-friendly sizing with minimum 44px height
  const sizeClasses = {
    sm: "min-h-[44px] px-4 py-2 text-sm min-w-[44px]",
    md: "min-h-[48px] px-6 py-3 text-base min-w-[48px]",
    lg: "min-h-[52px] px-8 py-4 text-lg min-w-[52px]"
  };

  const variantClasses = {
    primary: "bg-travel-burgundy text-white hover:bg-travel-burgundy/90 active:bg-travel-burgundy/80 focus:ring-travel-burgundy",
    secondary: "bg-travel-sand text-travel-charcoal hover:bg-travel-sand/90 active:bg-travel-sand/80 focus:ring-travel-sand",
    outline: "border-2 border-travel-burgundy text-travel-burgundy bg-transparent hover:bg-travel-burgundy hover:text-white active:bg-travel-burgundy/90 focus:ring-travel-burgundy"
  };

  const pressedClasses = isPressed ? "scale-[0.98] shadow-sm" : "scale-100 shadow-md hover:shadow-lg";

  const handleTouchStart = () => {
    if (!disabled && !isLoading) {
      setIsPressed(true);
      // Haptic feedback for supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const handleMouseDown = () => {
    if (!disabled && !isLoading) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
  };

  return (
    <button
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        pressedClasses,
        className
      )}
      disabled={disabled || isLoading}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {isLoading ? (
        <>
          <svg 
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default TouchButton; 