import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Tour {
  id: string;
  name: string;
  duration: number;
  slug: string;
  featured_image: string;
  country_name1: string;
  country_name2?: string;
}

const Featured = () => {
  const [originalTours, setOriginalTours] = useState<Tour[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Fetch original tours data
  useEffect(() => {
    const fetchFeaturedTours = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('tours')
          .select(`
            id, 
            name, 
            duration,
            slug,
            featured_image,
            country_name1,
            country_name2,
            is_featured
          `)
          .eq('is_featured', true)
          .limit(10);
        
        if (error) {
          console.error("Error fetching featured tours:", error);
          setError(`Database error: ${error.message}`);
          return;
        }
        
        if (data && data.length > 0) {
          setOriginalTours(data);
        } else {
          setError("No featured tours available");
        }
      } catch (error) {
        console.error('Error in fetchFeaturedTours:', error);
        setError("Failed to load featured tours");
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeaturedTours();
  }, []);
  
  // Create an augmented array with duplicate items for infinite scrolling
  useEffect(() => {
    if (originalTours.length === 0) return;
    
    // Create a circular array by adding items from the beginning to the end and vice versa
    const augmentedTours = [
      ...originalTours.slice(-2), // Add last 2 items to the beginning
      ...originalTours,           // Original items
      ...originalTours.slice(0, 2) // Add first 2 items to the end
    ];
    
    setTours(augmentedTours);
    
    // Set initial active index to start at the first "real" item (after the clones)
    setActiveIndex(2); // Skip the 2 cloned items at the start
    
  }, [originalTours]);
  
  // Initialize carousel position after tours are loaded
  useLayoutEffect(() => {
    if (scrollRef.current && tours.length > 0 && !loading) {
      // Initialize scroll position to the first "real" item
      const cardWidth = 280 + 16; // card width + padding
      scrollRef.current.scrollLeft = activeIndex * cardWidth;
    }
  }, [tours, loading, activeIndex]);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current && !isTransitioning) {
        const scrollPosition = scrollRef.current.scrollLeft;
        const cardWidth = 280 + 16; // Width + padding
        const newIndex = Math.round(scrollPosition / cardWidth);
        
        if (newIndex !== activeIndex && newIndex < tours.length) {
          setActiveIndex(newIndex);
        }
      }
    };
    
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [activeIndex, tours.length, isTransitioning]);
  
  // Handle wraparound scrolling logic
  useEffect(() => {
    if (tours.length === 0 || !scrollRef.current) return;
    
    // Handle wraparound scrolling logic
    const handleWraparound = () => {
      const cardWidth = 280 + 16; // Width + padding
      
      // If we've scrolled to a clone at the beginning, jump to its real counterpart
      if (activeIndex <= 1) {
        setIsTransitioning(true);
        const realIndex = originalTours.length + activeIndex;
        scrollRef.current!.style.scrollBehavior = 'auto';
        scrollRef.current!.scrollLeft = realIndex * cardWidth;
        setActiveIndex(realIndex);
        
        // Reset scroll behavior after jump
        setTimeout(() => {
          scrollRef.current!.style.scrollBehavior = 'smooth';
          setIsTransitioning(false);
        }, 50);
      }
      
      // If we've scrolled to a clone at the end, jump to its real counterpart
      if (activeIndex >= originalTours.length + 2) {
        setIsTransitioning(true);
        const realIndex = activeIndex - originalTours.length;
        scrollRef.current!.style.scrollBehavior = 'auto';
        scrollRef.current!.scrollLeft = realIndex * cardWidth;
        setActiveIndex(realIndex);
        
        // Reset scroll behavior after jump
        setTimeout(() => {
          scrollRef.current!.style.scrollBehavior = 'smooth';
          setIsTransitioning(false);
        }, 50);
      }
    };
    
    handleWraparound();
  }, [activeIndex, originalTours.length, tours.length]);

  const handleTourClick = (slug: string) => {
    navigate(`/tours/${slug}`);
  };

  const formatCountryName = (tour: Tour) => {
    if (tour.country_name1 && tour.country_name2) {
      return `${tour.country_name1} & ${tour.country_name2}`;
    }
    return tour.country_name1 || 'Multiple Countries';
  };

  const scrollToSlide = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = 280 + 16; // Width + padding
      scrollRef.current.style.scrollBehavior = 'smooth';
      scrollRef.current.scrollLeft = cardWidth * index;
    }
  };

  const scrollPrev = () => {
    if (isTransitioning) return;
    scrollToSlide(activeIndex - 1);
  };

  const scrollNext = () => {
    if (isTransitioning) return;
    scrollToSlide(activeIndex + 1);
  };
  
  // For dot navigation, map indices to the original tours
  const getOriginalIndex = (augmentedIndex: number) => {
    if (augmentedIndex < 2) return originalTours.length + augmentedIndex - 2;
    if (augmentedIndex >= originalTours.length + 2) return augmentedIndex - originalTours.length - 2;
    return augmentedIndex - 2;
  };

  return (
    <section className="py-16 bg-travel-charcoal text-white overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Mobile Title - Centered */}
        <div className="lg:hidden text-center mb-8">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl font-serif font-bold mb-4 tracking-wide"
          >
            RECOMMENDED JOURNEYS
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg opacity-80 font-light"
          >
            Crafted for unforgettable moments
          </motion.p>
        </div>
        
        <div className="flex flex-col lg:flex-row">
          {/* Desktop Title - Left Column */}
          <div className="hidden lg:block lg:w-1/4 mb-8 lg:mb-0 pr-8">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl lg:text-5xl font-serif font-bold mb-4"
            >
              EXPLORE<br />OUR<br />MOONS
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg opacity-80 font-light"
            >
              Crafted for<br />unforgettable moments
            </motion.p>
          </div>
          
          {/* Tours Carousel */}
          <div className="lg:w-3/4 relative">
            {loading ? (
              <div className="flex space-x-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="min-w-[280px] h-[450px] bg-gray-800 animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="mb-4">{error}</p>
              </div>
            ) : tours.length === 0 ? (
              <div className="text-center py-8">
                <p>No featured tours available at the moment.</p>
              </div>
            ) : (
              <div className="relative">
                {/* The carousel with visible adjacent tours */}
                <div 
                  ref={scrollRef}
                  className="flex pb-16 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    paddingLeft: '50px',  
                    paddingRight: '50px'
                  }}
                >
                  {tours.map((tour, index) => (
                    <div 
                      key={`${tour.id}-${index}`}
                      className="px-2 snap-center cursor-pointer tour-card flex-shrink-0"
                      onClick={() => handleTourClick(tour.slug)}
                    >
                      <div className="relative w-[280px] h-[450px] overflow-hidden rounded-lg group">
                        {tour.featured_image ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={tour.featured_image} 
                              alt={tour.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/10 mix-blend-multiply"></div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <span className="text-gray-300">No image available</span>
                          </div>
                        )}
                        
                        <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm px-3 py-1">
                          <span className="text-white font-medium">{tour.duration} NIGHTS</span>
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                          <div className="uppercase tracking-wider text-sm font-medium mb-1">
                            {formatCountryName(tour)}
                          </div>
                          
                          <h3 className="text-xl font-serif font-bold mb-2">
                            {tour.name}
                          </h3>
                          
                          <h4 className="text-lg font-medium mb-4">
                            Tailormade Journeys
                          </h4>
                          
                          <button className="border border-white bg-transparent text-white py-2 px-6 text-sm w-fit hover:bg-white/10 transition-colors duration-300">
                            EXPLORE TRIP
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows - Visible on All Devices */}
                <button 
                  onClick={scrollPrev}
                  className="absolute top-1/2 left-0 transform -translate-y-1/2 w-12 h-12 rounded-full bg-white text-black border border-gray-200 shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                <button 
                  onClick={scrollNext}
                  className="absolute top-1/2 right-0 transform -translate-y-1/2 w-12 h-12 rounded-full bg-white text-black border border-gray-200 shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Updated Dot Navigation (Bottom) - Shows only original tours */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-3">
                  {originalTours.map((_, index) => {
                    // Map the augmented index to the original index
                    const isActive = getOriginalIndex(activeIndex) === index;
                    
                    return (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
                          isActive
                            ? 'bg-white scale-125'
                            : 'bg-white/40 hover:scale-110'
                        }`}
                        onClick={() => scrollToSlide(index + 2)} // +2 to account for the clones at the beginning
                      ></div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Featured;