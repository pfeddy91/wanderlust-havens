import React from 'react';
import { Search, Headphones, Mail, BookOpen, ChevronRight, ArrowRight } from 'lucide-react';
import { TouchButton } from '@/components/ui/TouchButton';
import { useIsMobile } from '@/hooks/use-mobile';
import PremiumScrollGallery from '@/components/ui/PremiumScrollGallery';
import { TYPOGRAPHY } from '@/utils/typography';
// Link component is not used in this revised version, can be removed if not used elsewhere
// import { Link } from 'react-router-dom'; 

const HoneymoonInfo = () => {
  const isMobile = useIsMobile();
  
  // This value MUST be the same as `leftPaddingClass` in RegionsGrid.tsx
  // to ensure the "ABOUT US" text block starts at the same horizontal position
  // as the "DESTINATIONS" text block in RegionsGrid.
  // From your RegionsGrid.tsx, this was "pl-14".
  const leftPaddingValue = "pl-14"; 

  const bookingSteps = [
    {
      icon: Search,
      title: "Browse & Enquiry",
      description: "Get inspired by the curated Moons available here and enquire about it."
    },
    {
      icon: Headphones,
      title: "Consult a Travel Advisor", 
      description: "Work with your dedicated Travel Specialist to meticulously shape and refine your exclusive travel aspirations."
    },
    {
      icon: Mail,
      title: "Receive Your Bespoke Itinerary",
      description: "We will present you with a beautifully crafted proposal, a detailed vision of your dream holiday for your consideration."
    },
    {
      icon: BookOpen,
      title: "Confirm Your Escape",
      description: "Once every element aligns with your desires, we will secure arrangements and you will be ready to go."
    }
  ];

  return (
    <>
      {/* Honeymoon Experts Section - Mobile Optimized */}
      <section className="py-8 md:py-12 px-4 md:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title - Using standardized h2 */}
          <h2 className={`${TYPOGRAPHY.h2} mb-4`} style={{ color: '#161618' }}>
            The Honeymoon Experts
          </h2>
          
          {/* Description - Using standardized lead text */}
          <p className={`${TYPOGRAPHY.lead} mb-8 max-w-2xl mx-auto`} style={{ color: '#161618' }}>
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
            {/* Testimonial Text - Using standardized testimonial style */}
            <blockquote className="text-center mb-8">
              <p className={`${TYPOGRAPHY.testimonial} tracking-wide uppercase`} style={{ color: '#161618' }}>
                "Hands down it was the most amazing experience our family has ever done"
              </p>
            </blockquote>
            
            {/* Attribution - Using standardized body text */}
            <div className="text-center mb-4">
              <cite className={`${TYPOGRAPHY.body} italic not-italic`} style={{ color: '#7FB3B3' }}>
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

      {/* Booking Process Section */}
      <section className="py-8 md:py-12 px-8" style={{ backgroundColor: '#fcfaf5' }}>
        <div className="max-w-7xl mx-auto">
          {/* Section Title - Using standardized h2 */}
          <div className="text-center mb-12">
            <h2 className={`${TYPOGRAPHY.h2} mb-4`} style={{ color: '#161618' }}>
              Our Booking Process
            </h2>
          </div>

          {/* Steps - Desktop: Grid, Mobile: Scrollable */}
          <div className="hidden lg:grid lg:grid-cols-11 gap-2 items-start max-w-6xl mx-auto">
            {bookingSteps.map((step, index) => (
              <React.Fragment key={step.title}>
                {/* Step */}
                <div className="text-center col-span-2">
                  {/* Icon Circle */}
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(223,233,240,1)' }}>
                    <step.icon className="w-8 h-8" style={{ color: '#00395c' }} strokeWidth={1.5} />
                  </div>
                  
                  {/* Step Number and Title - Using standardized h4 */}
                  <h3 className={`${TYPOGRAPHY.h4} mb-3 h-16 flex items-center justify-center ml-2`} style={{ color: '#161618' }}>
                    {index + 1}. {step.title}
                  </h3>
                  
                  {/* Description - Using standardized body text */}
                  <p className={`${TYPOGRAPHY.body} leading-relaxed ml-2`} style={{ color: '#161618' }}>
                    {step.description}
                  </p>
                </div>

                {/* Arrow (only between steps, not after the last one) */}
                {index < bookingSteps.length - 1 && (
                  <div className="flex justify-center items-start pt-10 col-span-1">
                    <ChevronRight className="w-6 h-6" style={{ color: '#00395c' }} strokeWidth={2} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile: Scrollable Steps with Scroll Indicator */}
          <div className="lg:hidden relative">
            <div className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-8 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {bookingSteps.map((step, index) => (
                <div key={step.title} className="flex-shrink-0 w-80 text-center snap-center">
                  {/* Icon Circle */}
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(223,233,240,1)' }}>
                    <step.icon className="w-8 h-8" style={{ color: '#a0dadc' }} strokeWidth={1.5} />
                  </div>
                  
                  {/* Step Number and Title - Using standardized h3 for mobile prominence */}
                  <h3 className={`${TYPOGRAPHY.h3} mb-3 pr-8`} style={{ color: '#161618' }}>
                    {index + 1}. {step.title}
                  </h3>
                  
                  {/* Description - Using standardized body text */}
                  <p className={`${TYPOGRAPHY.body} leading-relaxed px-4 pr-12`} style={{ color: '#161618' }}>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Mobile Scroll Indicator - More Subtle */}
            <div className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-white/80 rounded-full p-1 shadow-sm opacity-60">
              <ArrowRight className="w-4 h-4" style={{ color: '#00395c' }} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HoneymoonInfo; 