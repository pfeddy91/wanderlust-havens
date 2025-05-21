"use client"; // Keep if this component is used in a Next.js App Router client context

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCountriesByFeaturedDestination } from '@/services/honeymoonService'; // Updated import
import Image from "next/image"; // If using Next.js <Image>
// If not using Next.js, replace with a standard <img> tag or your preferred Image component
import { cn } from "@/lib/utils"; // Assuming you have this utility

// Define the types based on the provided FocusCards structure
interface FocusCardData {
  id: string; // Keep original region ID for navigation
  slug: string; // Keep original region slug for navigation
  title: string;
  src: string;
}

// Card Component (from your provided snippet)
const FocusCardItem = React.memo(
  ({
    card,
    index,
    hovered,
    setHovered,
    onClick,
  }: {
    card: FocusCardData;
    index: number;
    hovered: number | null;
    setHovered: React.Dispatch<React.SetStateAction<number | null>>;
    onClick: () => void; // Added onClick prop
  }) => (
    <div
      onClick={onClick} // Added onClick handler
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "rounded-xl relative bg-gray-200 dark:bg-neutral-800 overflow-hidden transition-all duration-300 ease-out cursor-pointer group",
        "h-[26rem] w-full", // MODIFIED: w-full for responsive width, kept height
        "md:h-[35rem]", // MODIFIED: Kept height, width will be responsive
        hovered !== null && hovered !== index && "blur-sm scale-[0.98]"
      )}
    >
      {/*
        Replace Next.js Image with standard img if not in a Next.js project
        or if you prefer a standard img tag.
      */}
      <img // Using standard img tag for broader compatibility example
        src={card.src}
        alt={card.title}
        // fill // 'fill' is a Next.js Image prop
        className="object-cover absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105" // Ensure w-full, h-full
      />
      {/* For Next.js Image:
      <Image
        src={card.src}
        alt={card.title}
        fill
        className="object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-105"
      />
      */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 flex items-center justify-center text-center py-6 px-4 md:py-8 md:px-6 transition-opacity duration-300", // MODIFIED: items-center, justify-center, text-center
          hovered === index ? "opacity-100" : "opacity-0 group-hover:opacity-100" // Show on hover for non-blurred items too
        )}
      >
        {/* Ensure text is visible - original used bg-clip-text which might not always work well */}
        <div className="text-xl md:text-2xl lg:text-3xl font-serif font-medium text-white"> {/* MODIFIED: Added lg:text-3xl */}
          {card.title}
        </div>
      </div>
    </div>
  )
);
FocusCardItem.displayName = "FocusCardItem";


// FocusCards Component (from your provided snippet, adapted)
const FocusCardsDisplay = ({ cards, onCardClick }: { cards: FocusCardData[]; onCardClick: (slug: string) => void; }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    // MODIFIED: Removed max-w-6xl, adjusted gap for wider cards.
    // gap-4 might be suitable now that cards are w-full in their columns.
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
      {cards.map((card, index) => (
        <FocusCardItem
          key={card.id}
          card={card}
          index={index}
          hovered={hovered}
          setHovered={setHovered}
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
    <div className="flex flex-col md:flex-row justify-between md:items-start w-full mb-8 lg:mb-12">
      <div className="w-full md:w-2/3 text-left">
        <span className="text-2xl md:text-2xl text-travel-burgundy font-serif font-semibold tracking-wider uppercase mb-2 block dark:text-red-400">
          DESTINATIONS
        </span>
        <h2 className="text-3xl md:text-4xl font-serif font-light text-gray-800 dark:text-neutral-300 leading-tight">
          Explore Our Favourite Destinations
        </h2>
      </div>
      <div className="mt-4 md:mt-0 md:w-1/3 md:text-right">
        <button
          onClick={() => navigate('/destinations')}
          className="all-destinations-button flex-shrink-0 px-5 py-2.5 text-sm font-medium text-white bg-travel-blue hover:bg-travel-blue-dark focus:ring-4 focus:outline-none focus:ring-travel-blue-light rounded-lg text-center transition-colors dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" // Example styling
        >
          All Destinations
        </button>
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
      <FocusCardsDisplay cards={destinationsToDisplay} onCardClick={handleDestinationCardClick} />
    </section>
  );
};

export default RegionsGrid;
