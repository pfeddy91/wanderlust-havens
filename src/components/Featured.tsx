import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { motion } from 'framer-motion';

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
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeaturedTours = async () => {
      try {
        console.log("Fetching featured tours...");
        setLoading(true);
        
        const { data: tableInfo, error: tableError } = await supabase
          .from('tours')
          .select('is_featured')
          .limit(1);
          
        if (tableError) {
          console.error("Error checking tour table:", tableError);
          setError("Failed to check tour table structure");
          return;
        }
        
        const useIsFeatureFilter = tableInfo && tableInfo.length > 0 && 'is_featured' in tableInfo[0];
        console.log("Can use is_featured filter:", useIsFeatureFilter);
        
        console.log("Getting all tours to examine data...");
        const { data: allTours, error: allToursError } = await supabase
          .from('tours')
          .select('id, name, is_featured')
          .limit(10);
          
        if (allToursError) {
          console.error("Error getting all tours:", allToursError);
          setError("Failed to fetch any tours");
          return;
        }
        
        console.log("Sample of all tours:", allTours);
        
        let query = supabase
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
          `);
          
        if (useIsFeatureFilter) {
          query = query.eq('is_featured', true);
          console.log("Applied is_featured=true filter");
        } else {
          console.log("Skipped is_featured filter - getting all tours");
        }
        
        query = query.limit(10);
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching featured tours:", error);
          setError(`Database error: ${error.message}`);
          return;
        }
        
        console.log("Query results:", data);
        
        if (data && data.length > 0) {
          console.log(`Found ${data.length} tours`);
          
          const featuredTours = useIsFeatureFilter 
            ? data 
            : data.filter(tour => tour.is_featured === true);
            
          console.log(`After filtering: ${featuredTours.length} featured tours`);
          setTours(featuredTours);
        } else {
          console.log("No tours found matching criteria");
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

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const scrollPosition = scrollRef.current.scrollLeft;
        const cardWidth = scrollRef.current.querySelector('.tour-card')?.clientWidth || 300;
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
  }, [activeIndex, tours.length]);

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
      const cardWidth = scrollRef.current.querySelector('.tour-card')?.clientWidth || 300;
      scrollRef.current.scrollTo({
        left: cardWidth * index,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-16 bg-travel-charcoal text-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-1/4 mb-8 lg:mb-0 pr-8">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl lg:text-5xl font-serif font-bold mb-4"
            >
              EXPLORE<br />OUR<br />TRIPS
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
          
          <div className="lg:w-3/4 relative">
            {loading ? (
              <div className="flex space-x-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="min-w-[300px] h-[500px] bg-gray-800 animate-pulse rounded"></div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="mb-4">{error}</p>
                <p className="text-sm opacity-70">
                  Check the browser console for detailed debugging information.
                </p>
              </div>
            ) : tours.length === 0 ? (
              <div className="text-center py-8">
                <p>No featured tours available at the moment.</p>
              </div>
            ) : (
              <>
                <div 
                  ref={scrollRef}
                  className="flex space-x-6 pb-16 overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {tours.map((tour) => (
                    <motion.div 
                      key={tour.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8 }}
                      className="min-w-[350px] sm:min-w-[300px] snap-center cursor-pointer tour-card"
                      onClick={() => handleTourClick(tour.slug)}
                    >
                      <div className="relative h-[500px] sm:h-[600px] overflow-hidden group">
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
                            <div className="absolute inset-0 bg-[#D2B48C]/10"></div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <span className="text-gray-300">No image available</span>
                          </div>
                        )}
                        
                        <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm px-3 py-1">
                          <span className="text-white font-medium">{tour.duration} NIGHTS</span>
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 sm:p-4">
                          <div className="uppercase tracking-wider text-sm font-medium mb-1">
                            {formatCountryName(tour)}
                          </div>
                          
                          <h3 className="text-2xl sm:text-xl font-serif font-bold mb-4">
                            {tour.name}
                          </h3>
                          
                          <button className="border border-white bg-yellow-600/20 text-white py-2 px-6 sm:px-4 sm:text-sm w-fit hover:bg-yellow-600/40 hover:text-white transition-colors duration-300">
                            EXPLORE TRIP
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Updated Dot Navigation (No Labels) */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-3">
                  {tours.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
                        index === activeIndex
                          ? 'bg-gradient-to-r from-yellow-400 to-white scale-125 shadow-lg shadow-yellow-400/50'
                          : 'bg-white/40 hover:scale-110'
                      }`}
                      onClick={() => scrollToSlide(index)}
                    ></div>
                  ))}
                </div>

                {/* Navigation Arrows (Hidden on Mobile) */}
                {tours.length > 1 && (
                  <>
                    <button 
                      onClick={() => scrollToSlide(Math.max(0, activeIndex - 1))}
                      className="hidden sm:block absolute top-1/2 -left-6 transform -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 hover:bg-white/10 transition-colors"
                      disabled={activeIndex === 0}
                      style={{ opacity: activeIndex === 0 ? 0.5 : 1 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <button 
                      onClick={() => scrollToSlide(Math.min(tours.length - 1, activeIndex + 1))}
                      className="hidden sm:block absolute top-1/2 -right-6 transform -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 hover:bg-white/10 transition-colors"
                      disabled={activeIndex === tours.length - 1}
                      style={{ opacity: activeIndex === tours.length - 1 ? 0.5 : 1 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Featured;