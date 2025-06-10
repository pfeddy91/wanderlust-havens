import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Tour {
  id: string;
  title: string;
  duration: number;
  slug: string;
  featured_image: string | null;
  countries: string[];
  country_names: string[];
  is_featured?: boolean;
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
  
  // Fetch featured tours data and associated country names
  useEffect(() => {
    const fetchFeaturedToursAndCountries = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error on new fetch

        // 1. Fetch featured tours (without the image initially)
        const { data: toursData, error: toursError } = await supabase
          .from('tours')
          .select(`
            id,
            title,
            duration,
            slug,
            countries, 
            is_featured
          `)
          .eq('is_featured', true)
          .limit(10); // Adjust limit as needed

        if (toursError) {
          console.error("Error fetching featured tours:", toursError);
          throw new Error(`Database error fetching tours: ${toursError.message}`);
        }

        // Ensure toursData is not null and is an array before proceeding
        if (!toursData || !Array.isArray(toursData) || toursData.length === 0) {
          setOriginalTours([]); // Ensure state is empty
          setLoading(false);
          return;
        }

        // 2. Extract tour IDs to fetch corresponding featured images
        const tourIds = toursData.map(t => t.id);

        // 3. Fetch the featured images from tour_images table
        const { data: imagesData, error: imagesError } = await supabase
          .from('tour_images')
          .select('tour_id, image_url')
          .in('tour_id', tourIds)
          .eq('is_featured', true);

        if (imagesError) {
           console.warn("Error fetching featured images:", imagesError);
        }

        // 4. Create a map of tour_id -> featured_image_url
        const imageMap = new Map<string, string>();
        if (imagesData && Array.isArray(imagesData)) { // Check if imagesData is valid array
            imagesData.forEach(img => {
                if (img.tour_id && !imageMap.has(img.tour_id) && img.image_url) {
                    imageMap.set(img.tour_id, img.image_url);
                }
            });
        }
        
        if (toursData.length > 0 && imageMap.size === 0 && !imagesError) {
            console.warn("Featured tours found, but no corresponding featured images in tour_images table.");
        }

        // 5. Extract all unique country UUIDs from the fetched tours
        // Ensure we handle potential null/undefined values for countries array
        const countryIds = Array.from(new Set(
          toursData.flatMap(tour => tour.countries || [])
        ));

        let countryMap = new Map<string, string>();

        // 6. Fetch country names only if there are IDs to fetch
        if (countryIds.length > 0) {
          const { data: countriesData, error: countriesError } = await supabase
            .from('countries')
            .select('id, name')
            .in('id', countryIds);

          if (countriesError) {
            console.warn(`Could not fetch country names: ${countriesError.message}`);
          } else if (countriesData && Array.isArray(countriesData)) { // Check if countriesData is valid array
            countryMap = new Map(countriesData.map(c => [c.id, c.name]));
          }
        }

        // 7. Combine tour data with country names and the fetched featured image URL
        const toursWithDetails: Tour[] = toursData.map(tour => ({
          // Explicitly define the structure matching the Tour interface
          id: tour.id,
          title: tour.title,
          duration: tour.duration,
          slug: tour.slug,
          featured_image: imageMap.get(tour.id) || null,
          countries: tour.countries || [], // Default to empty array if null
          country_names: (tour.countries || []).map(id => countryMap.get(id) || 'Unknown').filter(name => name !== 'Unknown'),
          is_featured: tour.is_featured,
        }));

        if (toursWithDetails.length > 0) {
          setOriginalTours(toursWithDetails);
        } else {
          setError("No featured tours available or could not fetch details.");
          setOriginalTours([]);
        }

      } catch (err: any) {
        console.error('Error in fetchFeaturedToursAndCountries:', err);
        setError(err.message || "Failed to load featured tours");
        setOriginalTours([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedToursAndCountries();
  }, []); // Dependency array is empty, runs once on mount
  
  // Create an augmented array with duplicate items for infinite scrolling
  useEffect(() => {
    if (originalTours.length === 0) {
        setTours([]); // Ensure tours is empty if originalTours is empty
        return;
    };

    // Only augment if we have enough tours to make sense (e.g., > 2)
    // Adjust this logic if needed based on how many clones you want/need
     if (originalTours.length >= 3) {
        const augmentedTours = [
            ...originalTours.slice(-2), // Add last 2 items to the beginning
            ...originalTours,           // Original items
            ...originalTours.slice(0, 2) // Add first 2 items to the end
        ];
        setTours(augmentedTours);
        setActiveIndex(2); // Start at the first "real" item
     } else {
         // If few tours, just use the original array without cloning/infinite scroll
         setTours([...originalTours]);
         setActiveIndex(0); // Start at the beginning
     }

  }, [originalTours]);
  
  // Initialize carousel position after tours are loaded
  useLayoutEffect(() => {
    if (scrollRef.current && tours.length > 0 && !loading) {
      // Initialize scroll position
      const cardWidth = 280 + 16; // card width + padding
      // Adjust initial scroll based on whether augmentation happened
      const initialScrollIndex = originalTours.length >= 3 ? 2 : 0;
      scrollRef.current.scrollLeft = initialScrollIndex * cardWidth;
       // Set initial active index explicitly after scroll setup
       setActiveIndex(initialScrollIndex);
    }
     // Reset scroll position if tours/loading changes significantly
     else if (scrollRef.current && (tours.length === 0 || loading)) {
       scrollRef.current.scrollLeft = 0;
     }
  }, [tours, loading, originalTours.length]); // Add originalTours.length dependency

  // Handle scroll events
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
        if (isTransitioning) return; // Don't update index during wraparound transitions

        // Debounce or use scrollend if browser support allows
        if (scrollTimeout) clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
            if (scrollRef.current) {
              const scrollPosition = scrollRef.current.scrollLeft;
              const cardWidth = 280 + 16; // Width + padding
              const newIndex = Math.round(scrollPosition / cardWidth);

              // Check bounds carefully
              if (newIndex >= 0 && newIndex < tours.length && newIndex !== activeIndex) {
                  console.log(`Scroll detected, new index: ${newIndex}`);
                  setActiveIndex(newIndex);
              }
            }
        }, 150); // Adjust debounce time as needed
    };


    scrollContainer.addEventListener('scroll', handleScroll, { passive: true }); // Use passive listener
    return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        if (scrollTimeout) clearTimeout(scrollTimeout);
    };
    // Rerun if activeIndex changes externally or tours update
  }, [activeIndex, tours, isTransitioning]);
  
  // Handle wraparound scrolling logic - ONLY if augmentation is active
  useEffect(() => {
    // Only run wraparound if we have augmented the array (more than original length)
    if (tours.length === 0 || !scrollRef.current || tours.length === originalTours.length || originalTours.length < 3) return;

    const cardWidth = 280 + 16; // Width + padding
    let didWrap = false;
    let targetIndex = activeIndex;

    // If we've landed on a clone at the beginning
    if (activeIndex <= 1) {
      targetIndex = originalTours.length + activeIndex; // Jump to the equivalent real item towards the end
      console.log(`Wrap Around: Start clone (${activeIndex}) -> Real (${targetIndex})`);
      didWrap = true;
    }
    // If we've landed on a clone at the end
    else if (activeIndex >= originalTours.length + 2) {
      targetIndex = activeIndex - originalTours.length; // Jump to the equivalent real item towards the start
      console.log(`Wrap Around: End clone (${activeIndex}) -> Real (${targetIndex})`);
      didWrap = true;
    }

    if (didWrap) {
        setIsTransitioning(true); // Prevent scroll handler updates during jump
        // Use requestAnimationFrame for smoother visual jump
        requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.style.scrollBehavior = 'auto'; // Disable smooth scroll for jump
                scrollRef.current.scrollLeft = targetIndex * cardWidth;

                 // Update activeIndex *after* the scroll jump position is set
                 setActiveIndex(targetIndex);

                 // Restore smooth scrolling after a short delay using another rAF
                 setTimeout(() => {
                     requestAnimationFrame(() => {
                         if (scrollRef.current) {
                            scrollRef.current.style.scrollBehavior = 'smooth';
                         }
                         setIsTransitioning(false); // Re-enable scroll handler updates
                         console.log("Wrap complete. Transitioning set to false.");
                     });
                 }, 50); // Short delay
            } else {
                 setIsTransitioning(false); // Ensure flag is reset if ref becomes null
            }
        });
    }
  }, [activeIndex, originalTours.length, tours.length]); // Dependencies

  const handleTourClick = (slug: string) => {
    navigate(`/tours/${slug}`);
  };

  const formatCountryName = (tour: Tour) => {
    const names = tour.country_names; // Use the fetched names
    if (!names || names.length === 0) {
      return 'Multiple Destinations'; // Fallback if no names found
    }
    if (names.length === 1) {
      return names[0];
    }
    if (names.length === 2) {
      return `${names[0]} & ${names[1]}`;
    }
    // If more than 2, you might list the first few or use a generic term
    return `${names[0]}, ${names[1]} & More`; // Example for 3+
  };

  const scrollToSlide = (index: number) => {
      if (scrollRef.current && !isTransitioning) {
          const cardWidth = 280 + 16; // Width + padding
          // Ensure target index is within bounds of the *augmented* array
          const targetIndex = Math.max(0, Math.min(index, tours.length - 1));
          console.log(`Scrolling to slide index: ${targetIndex}`);
          scrollRef.current.style.scrollBehavior = 'smooth';
          scrollRef.current.scrollLeft = cardWidth * targetIndex;
          // setActiveIndex(targetIndex); // Let the scroll handler update the active index
      }
  };

  const scrollPrev = () => {
    if (isTransitioning) return;
    console.log(`ScrollPrev called from index: ${activeIndex}`);
    // Calculate the target index, considering potential wrap logic is handled by useEffect
    const targetIndex = activeIndex - 1;
    scrollToSlide(targetIndex);
  };

  const scrollNext = () => {
    if (isTransitioning) return;
    console.log(`ScrollNext called from index: ${activeIndex}`);
    // Calculate the target index, considering potential wrap logic is handled by useEffect
    const targetIndex = activeIndex + 1;
    scrollToSlide(targetIndex);
  };
  
  // For dot navigation, map indices to the original tours
  const getOriginalIndex = (currentIndex: number) => {
      // If augmentation didn't happen, index is direct
      if (tours.length === originalTours.length || originalTours.length < 3) {
          return currentIndex;
      }
      // If augmented, map back to original range [0, originalTours.length - 1]
      const actualIndex = currentIndex - 2; // Offset by the number of prepended clones
      return (actualIndex % originalTours.length + originalTours.length) % originalTours.length; // Modulo arithmetic for wrapping
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
            className="text-3xl md:text-3xl font-serif font-semibold mb-4 tracking-wide"
          >
            Recommended Journeys
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl md:text-3xl font-serif font-light opacity-80"
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
              className="text-3xl md:text-3xl font-serif font-semibold mb-4"
            >
              Explore Our Moons
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl md:text-3xl font-serif font-light opacity-80"
            >
              Crafted for unforgettable moments
            </motion.p>
          </div>
          
          {/* Tours Carousel */}
          <div className="lg:w-3/4 relative">
            {loading ? (
              <div className="flex space-x-4 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-[280px] h-[450px] bg-gray-800 animate-pulse rounded-lg flex-shrink-0"></div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 px-4 bg-red-900/20 rounded border border-red-700">
                <p className="text-red-300">{error}</p>
              </div>
            ) : !tours || tours.length === 0 ? (
              <div className="text-center py-8">
                <p>No featured tours available at the moment.</p>
              </div>
            ) : (
              <div className="relative">
                <div
                  ref={scrollRef}
                  className="flex pb-16 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {tours.map((tour, index) => (
                    <div
                      key={`${tour.id}-${index}`}
                      className="px-2 snap-center cursor-pointer tour-card flex-shrink-0 w-[calc(280px+16px)]"
                      onClick={() => handleTourClick(tour.slug)}
                    >
                      <div className="relative w-[280px] h-[450px] overflow-hidden rounded-lg group bg-gray-700">
                        {tour.featured_image ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={tour.featured_image} 
                              alt={tour.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/10 mix-blend-multiply"></div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">Image Coming Soon</div>
                        )}
                        
                        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-md">
                          <span className="text-white font-semibold text-sm">{tour.duration} NIGHTS</span>
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-5">
                          <div className="uppercase tracking-wider text-xs font-semibold mb-1 text-gray-200">
                            {formatCountryName(tour)}
                          </div>
                          
                          <h3 className="text-lg font-serif font-bold mb-2 line-clamp-2">
                            {tour.title}
                          </h3>
                          
                          <h4 className="text-base font-medium mb-4 opacity-90">
                            Tailormade Journeys
                          </h4>
                          
                          <div className="border border-white bg-transparent text-white py-2 px-5 text-xs w-fit font-semibold tracking-wide group-hover:bg-white/15 transition-colors duration-300">
                            EXPLORE TRIP
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {tours.length > 1 && (
                  <>
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
                  </>
                )}

                {originalTours.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
                    {originalTours.map((_, index) => {
                      const isActive = getOriginalIndex(activeIndex) === index;
                      const targetSlideIndex = originalTours.length >= 3 ? index + 2 : index;
                      return (
                        <div
                          key={`dot-${index}`}
                          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                            isActive ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/75'
                          }`}
                          onClick={() => scrollToSlide(targetSlideIndex)}
                        ></div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Featured;