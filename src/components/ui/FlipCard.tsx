import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
  cardClassName?: string; // Optional: specific classes for the card element itself
  frontClassName?: string; // Optional: classes for the front face
  backClassName?: string;  // Optional: classes for the back face
  onClick?: () => void; // Handle selection logic
  isSelected?: boolean;
  isDisabled?: boolean;
}

const FlipCard: React.FC<FlipCardProps> = ({
  frontContent,
  backContent,
  className, // Classes for the outer container (perspective, grid item size)
  cardClassName, // Classes for the flip-card div itself
  frontClassName,
  backClassName,
  onClick,
  isSelected = false,
  isDisabled = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    if (isDisabled) return; // Don't flip if disabled
    setIsFlipped(!isFlipped);
  };

  const handleClick = () => {
     if (isDisabled) return;
     handleFlip(); // Flip the card on click
     onClick?.(); // Also trigger the passed selection onClick
  }

  return (
    // Outer container - controls size in the grid, perspective is on parent grid
    <div className={cn(className)}>
      <div
        className={cn('flip-card', cardClassName)}
        onClick={handleClick}
        role="button" // Make it behave like a button
        aria-pressed={isFlipped} // Accessibility state
        tabIndex={isDisabled ? -1 : 0} // Make focusable unless disabled
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }} // Allow keyboard activation
      >
        <div className={cn('flip-card-inner', { 'is-flipped': isFlipped })}>
          <div
            className={cn(
              'flip-card-front',
              isSelected && 'flip-card-selected', // Apply selected style
              isDisabled && 'flip-card-disabled', // Apply disabled style
              frontClassName
            )}
          >
            {frontContent}
          </div>
          <div
            className={cn(
              'flip-card-back',
               isSelected && 'flip-card-selected', // Apply selected style (optional on back)
               isDisabled && 'flip-card-disabled', // Apply disabled style
              backClassName
            )}
          >
            {backContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCard; 