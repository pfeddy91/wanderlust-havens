"use client"; // Keep if this component is used in a Next.js App Router client context

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCountriesByFeaturedDestination } from '@/services/honeymoonService'; // Updated import
// If not using Next.js, replace with a standard <img> tag or your preferred Image component
import { cn } from "@/lib/utils"; // Assuming you have this utility
import ProgressiveImage from '@/components/ui/ProgressiveImage';
import { ImagePresets } from '@/utils/imageOptimization';

// Define the types based on the provided FocusCards structure
interface FocusCardData {
  id: string; // Keep original region ID for navigation
  slug: string; // Keep original region slug for navigation
  title: string;
  src: string;
}

// New Destination Card Component with carousel-style mouse tracking
const DestinationCard = React.memo(
  ({
    card,
    onClick,
  }: {
    card: FocusCardData;
    onClick: () => void;
  }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const xRef = useRef(0);
    const yRef = useRef(0);
    const frameRef = useRef<number>();

    useEffect(() => {
      const animate = () => {
        if (!cardRef.current) return;

        const x = xRef.current;
        const y = yRef.current;

        cardRef.current.style.setProperty("--x", `${x}px`);
        cardRef.current.style.setProperty("--y", `${y}px`);

        frameRef.current = requestAnimationFrame(animate);
      };

      frameRef.current = requestAnimationFrame(animate);

      return () => {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
      };
    }, []);

    const handleMouseMove = (event: React.MouseEvent) => {
      const el = cardRef.current;
      if (!el) return;

      const r = el.getBoundingClientRect();
      xRef.current = event.clientX - (r.left + Math.floor(r.width / 2));
      yRef.current = event.clientY - (r.top + Math.floor(r.height / 2));
    };

    const handleMouseLeave = () => {
      xRef.current = 0;
      yRef.current = 0;
    };

    return (
      <div className="[perspective:1200px] [transform-style:preserve-3d]">
        <div
          ref={cardRef}
          onClick={onClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative cursor-pointer w-[56vmin] h-[56vmin] rounded-xl overflow-hidden mx-auto"
          style={{
            transform: "scale(1) rotateX(0deg)",
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            transformOrigin: "bottom",
          }}
        >
          <div
            className="absolute top-0 left-0 w-full h-full rounded-xl overflow-hidden transition-all duration-150 ease-out"
            style={{
              transform: "translate3d(calc(var(--x) / 30), calc(var(--y) / 30), 0)",
            }}
          >
            <ProgressiveImage
              src={card.src}
              alt={card.title}
              className="absolute inset-0 w-[120%] h-[120%] object-cover"
              optimization={ImagePresets.cardLarge}
              placeholder="shimmer"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
          
          {/* Always visible country name */}
          <div className="absolute inset-0 flex items-center justify-center text-center p-6">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold text-white">
              {card.title}
            </h3>
          </div>
        </div>
      </div>
    );
  }
);
DestinationCard.displayName = "DestinationCard";


// Updated Cards Display Component with increased spacing
const DestinationCardsDisplay = ({ cards, onCardClick }: { cards: FocusCardData[]; onCardClick: (slug: string) => void; }) => {
  return (
          // No horizontal gap, some vertical gap
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-0 gap-y-4 lg:gap-y-10 w-full justify-items-center">
      {cards.map((card) => (
        <DestinationCard
          key={card.id}
          card={card}
          onClick={() => onCardClick(card.slug)}
        />
      ))}
    </div>
  );
};

// Main RegionsGrid Component
const RegionsGrid = () => {
  const navigate = useNavigate();
  const [destinationsToDisplay, setDestinationsToDisplay] = useState<FocusCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Consistent left padding value - this will be applied to the header wrapper
  const leftPaddingClass = "lg:pl-14"; 

  useEffect(() => {
    const fetchAndPrepareDestinations = async () => {
      setIsLoading(true);
      try {
        const countriesData = await getCountriesByFeaturedDestination();
        
        const formattedDestinations: FocusCardData[] = countriesData.map((country: any) => ({
          id: country.id,
          slug: country.slug,
          title: country.name,
          src: country.featured_image || `https://via.placeholder.com/600x400?text=${encodeURIComponent(country.name)}`, 
        }));
        
        setDestinationsToDisplay(formattedDestinations);
      } catch (error) {
        console.error('Failed to fetch or format featured destinations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndPrepareDestinations();
  }, []);

  const handleDestinationCardClick = (slug: string) => {
    navigate(`/destinations/${slug}`);
  };

  // MODIFIED: Header structure changed
  const PageHeader = () => (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8 lg:mb-12">
        <div className="max-w-[60%] mx-auto">
          <span className="text-3xl md:text-3xl font-serif font-semibold mb-2 block" style={{ color: '#161618' }}>
            Destinations
          </span>
          <h2 className="text-xl md:text-xl font-sans mt-2 leading-tight" style={{ color: '#161618' }}>
            Explore Our Favourite Destinations. You can find all of our destinations{' '}
            <button
              onClick={() => navigate('/destinations')}
              className="font-sans underline hover:no-underline transition-all"
              style={{ color: '#00395c' }}
            >
              here
            </button>
            .
          </h2>
        </div>
      </div>
    </div>
  );

  // This mainContentWrapperClass is no longer used for the grid directly.
  // const mainContentWrapperClass = `max-w-6xl mx-auto w-full ${leftPaddingClass}`;

  if (isLoading) {
    return (
      // MODIFIED: Section has px-4 (changed from px-1)
      <section className="py-12 md:py-16 bg-white dark:bg-neutral-950 overflow-x-hidden px-8">
        <PageHeader />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
          {[1, 2, 3].map((i) => ( 
            <div key={i} className="h-[26rem] md:h-[35rem] w-full bg-gray-300 dark:bg-neutral-700 animate-pulse rounded-xl"></div>
          ))}
        </div>
      </section>
    );
  }

  if (destinationsToDisplay.length === 0) {
    return (
      // MODIFIED: Section has px-4 (changed from px-1)
      <section className="py-12 md:py-16 bg-white dark:bg-neutral-950 px-8">
        <PageHeader />
        <div className="w-full">
          <p className="text-gray-600 dark:text-gray-400 text-lg text-center mt-4">
            No favourite destinations available at the moment. Please check back later.
          </p>
        </div>
      </section>
    );
  }

  return (
    // MODIFIED: Section has px-4 (changed from px-1)
    <section className="py-12 md:py-16 bg-white dark:bg-neutral-950 overflow-x-hidden px-8">
      <PageHeader />
      <DestinationCardsDisplay cards={destinationsToDisplay} onCardClick={handleDestinationCardClick} />
    </section>
  );
};

export default RegionsGrid;
