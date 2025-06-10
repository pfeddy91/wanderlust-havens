import React from 'react';
import { Search, Headphones, Mail, BookOpen, ChevronRight } from 'lucide-react';
// Link component is not used in this revised version, can be removed if not used elsewhere
// import { Link } from 'react-router-dom'; 

const HoneymoonInfo = () => {
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
      {/* Booking Process Section */}
      <section className="py-8 md:py-12 px-8" style={{ backgroundColor: '#fcfaf5' }}>
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-3xl font-serif font-semibold mb-4" style={{ color: '#161618' }}>
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
                  
                  {/* Step Number and Title */}
                  <h3 className="text-2xl font-serif font-semibold mb-3 h-16 flex items-center justify-center" style={{ color: '#161618' }}>
                    {index + 1}. {step.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="leading-relaxed text-lg" style={{ color: '#161618' }}>
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

          {/* Mobile: Scrollable Steps */}
          <div className="lg:hidden">
            <div className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-8 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {bookingSteps.map((step, index) => (
                <div key={step.title} className="flex-shrink-0 w-80 text-center snap-center">
                  {/* Icon Circle */}
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(223,233,240,1)' }}>
                    <step.icon className="w-8 h-8" style={{ color: '#a0dadc' }} strokeWidth={1.5} />
                  </div>
                  
                  {/* Step Number and Title */}
                  <h3 className="text-3xl md:text-4xl font-serif font-semibold mb-3" style={{ color: '#161618' }}>
                    {index + 1}. {step.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="leading-relaxed text-lg px-4" style={{ color: '#161618' }}>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HoneymoonInfo; 