"use client"; // Keep if this component is used in a Next.js App Router client context

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
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
      <div className="[perspective:1200px] [transform-style:preserve-3d] w-[95%]">
        <div
          ref={cardRef}
          onClick={onClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative cursor-pointer w-full aspect-square rounded-xl overflow-hidden"
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
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-white">
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
          // Equal horizontal and vertical gaps for desktop
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-10 w-full justify-items-center">
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
  const isMobile = useIsMobile();
  const [destinationsToDisplay, setDestinationsToDisplay] = useState<FocusCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Consistent left padding value - this will be applied to the header wrapper
  const leftPaddingClass = "lg:pl-14"; 

  useEffect(() => {
    const fetchAndPrepareDestinations = async () => {
      setIsLoading(true);
      try {
        const countriesData = await getCountriesByFeaturedDestination();
        
        // Debug logging to check mobile_image_URL availability
        console.log('🔍 Countries data:', countriesData.map(c => ({ 
          name: c.name, 
          featured_image: c.featured_image ? '✅ has featured' : '❌ no featured', 
          mobile_image_url: c.mobile_image_url ? '✅ has mobile' : '❌ no mobile',
          isMobile 
        })));
        
        const formattedDestinations: FocusCardData[] = countriesData.map((country: any) => {
          // Explicitly check for mobile and mobile_image_url
          let imageSrc = country.featured_image || `https://via.placeholder.com/600x400?text=${encodeURIComponent(country.name)}`;
          
          if (isMobile && country.mobile_image_url) {
            imageSrc = country.mobile_image_url;
            console.log(`📱 Using mobile image for ${country.name}:`, imageSrc);
          } else if (isMobile) {
            console.log(`⚠️ No mobile image found for ${country.name}, using featured_image`);
          } else {
            console.log(`🖥️ Desktop mode, using featured image for ${country.name}`);
          }
          
          return {
            id: country.id,
            slug: country.slug,
            title: country.name,
            src: imageSrc
          };
        });
        
        setDestinationsToDisplay(formattedDestinations);
      } catch (error) {
        console.error('Failed to fetch or format featured destinations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndPrepareDestinations();
  }, [isMobile]);

  const handleDestinationCardClick = (slug: string) => {
    navigate(`/destinations/${slug}`);
  };

  // PageHeader component with consistent typography
  const PageHeader = () => (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8 lg:mb-12">
        <div className="max-w-[60%] mx-auto">
          <h2 className="text-2xl md:text-4xl font-serif font-semibold mb-2 block" style={{ color: '#161618' }}>
            Dream Destinations
          </h2>
          <p className="text-lg md:text-xl font-serif mt-2 leading-tight" style={{ color: '#161618' }}>
            Explore Our Favourite Destinations. You can find the full list{' '}
            <button
              onClick={() => navigate('/destinations')}
              className="font-serif underline hover:no-underline transition-all"
              style={{ color: '#00395c' }}
            >
              here
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );

  // This mainContentWrapperClass is no longer used for the grid directly.
  // const mainContentWrapperClass = `max-w-6xl mx-auto w-full ${leftPaddingClass}`;

  if (isLoading) {
    if (isMobile) {
      // Mobile loading: tile skeletons
      return (
        <section className="py-12 md:py-16 bg-white dark:bg-neutral-950 overflow-x-hidden px-4">
          <PageHeader />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => ( 
              <div key={i} className="h-40 w-full bg-gray-300 dark:bg-neutral-700 animate-pulse"></div>
            ))}
          </div>
        </section>
      );
    }
    
    // Desktop loading: existing fancy card skeletons
    return (
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
    const paddingClass = isMobile ? 'px-4' : 'px-8';
    return (
      <section className={`py-12 md:py-16 bg-white dark:bg-neutral-950 ${paddingClass}`}>
        <PageHeader />
        <div className="w-full">
          <p className="text-gray-600 dark:text-gray-400 text-lg text-center mt-4">
            No favourite destinations available at the moment. Please check back later.
          </p>
        </div>
      </section>
    );
  }

  // Get first 6 destinations for mobile
  const mobileDestinations = destinationsToDisplay.slice(0, 6);

  if (isMobile) {
    // Mobile: Simple tile layout
    return (
      <section className="py-12 md:py-16 bg-white dark:bg-neutral-950 overflow-x-hidden px-4">
        <PageHeader />
        {/* Mobile Tiles */}
        <div className="space-y-2">
          {mobileDestinations.map((destination) => (
            <div
              key={destination.id}
              className="relative w-full h-40 cursor-pointer overflow-hidden"
              onClick={() => handleDestinationCardClick(destination.slug)}
            >
              {/* Background Image */}
              <img
                src={destination.src}
                alt={destination.title}
                className="w-full h-full object-cover"
              />
              
              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-black/20" />
              
                          {/* Text Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <h3 className="text-white text-xl md:text-3xl font-serif font-semibold tracking-wide">
                {destination.title}
              </h3>
            </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Desktop: Original fancy cards layout
  return (
    <section className="py-12 md:py-16 bg-white dark:bg-neutral-950 overflow-x-hidden px-8">
      <PageHeader />
      <DestinationCardsDisplay cards={destinationsToDisplay} onCardClick={handleDestinationCardClick} />
    </section>
  );
};

export default RegionsGrid;
