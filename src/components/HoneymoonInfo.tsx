import React from 'react';
import { TouchButton } from '@/components/ui/TouchButton';
import { useIsMobile } from '@/hooks/use-mobile';
import PremiumScrollGallery from '@/components/ui/PremiumScrollGallery';
import BookingProcess from '@/components/BookingProcess';
// Link component is not used in this revised version, can be removed if not used elsewhere
// import { Link } from 'react-router-dom'; 

const HoneymoonInfo = () => {
  const isMobile = useIsMobile();
  
  // This value MUST be the same as `leftPaddingClass` in RegionsGrid.tsx
  // to ensure the "ABOUT US" text block starts at the same horizontal position
  // as the "DESTINATIONS" text block in RegionsGrid.
  // From your RegionsGrid.tsx, this was "pl-14".
  const leftPaddingValue = "pl-14";

  return (
    <>
      {/* Honeymoon Experts Section - Mobile Optimized */}
      <section className="py-8 md:py-12 px-4 md:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title - Matching styling from 'Our Booking Process' */}
          <h2 className="text-2xl md:text-4xl font-serif font-semibold mb-4" style={{ color: '#161618' }}>
            The Honeymoon Experts
          </h2>
          
          {/* Description - Evocative expertise text */}
          <p className="text-base md:text-lg font-serif leading-relaxed mb-8 max-w-2xl mx-auto" style={{ color: '#161618' }}>
            With over a decade curating bespoke honeymoons across 25 countries, we craft intimate escapes that capture your unique love story. From hidden Mediterranean gems to exotic Asian retreats, our expertise transforms dreams into unforgettable journeys.
          </p>
          
          {/* Get in Touch Button - Brand color #00395c */}
          <TouchButton 
            variant="primary"
            size="lg"
            className="text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200"
            style={{ backgroundColor: '#00395c' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#002a42'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00395c'}
          >
            Get in Touch
          </TouchButton>
          
          {/* Customer Testimonial Section */}
          <div className="mt-16 md:mt-20 max-w-3xl mx-auto">
            {/* Testimonial Text */}
            <blockquote className="text-center mb-8">
              <p className="text-lg md:text-2xl font-serif font-medium leading-relaxed tracking-wide uppercase" style={{ color: '#161618' }}>
                "Hands down it was the most amazing experience our family has ever done"
              </p>
            </blockquote>
            
            {/* Attribution */}
            <div className="text-center mb-4">
              <cite className="text-base md:text-xl font-serif italic not-italic" style={{ color: '#7FB3B3' }}>
                Isabella & Marco, Tuscany
              </cite>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Scroll Gallery Transition - Mobile Only - Reduced spacing */}
      {isMobile && (
        <div className="-mt-4">
          <PremiumScrollGallery />
        </div>
      )}

      {/* Booking Process Component */}
      <BookingProcess />
    </>
  );
};

export default HoneymoonInfo; 