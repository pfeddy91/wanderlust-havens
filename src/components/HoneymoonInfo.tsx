import React from 'react';
// Link component is not used in this revised version, can be removed if not used elsewhere
// import { Link } from 'react-router-dom'; 

const HoneymoonInfo = () => {
  // This value MUST be the same as `leftPaddingClass` in RegionsGrid.tsx
  // to ensure the "ABOUT US" text block starts at the same horizontal position
  // as the "DESTINATIONS" text block in RegionsGrid.
  // From your RegionsGrid.tsx, this was "pl-14".
  const leftPaddingValue = "pl-14"; 

  const contentWrapperClass = `max-w-6xl mx-auto w-full ${leftPaddingValue}`;

  const newStatsData = [
    { value: "100", label: "Curated Tours" },
    { value: "250+", label: "Top Hotels" },
  ];

  return (
    <section className="py-16 md:py-20 bg-white px-8">
      <div className="flex flex-col md:flex-row justify-between md:items-start w-full">
        
        {/* Text content on the left, taking 2/3 width on md+ screens */}
        {/* It's already text-left. The md:pr-8 lg:pr-16 creates space before stats. */}
        <div className="w-full md:w-2/3 text-left md:pr-8 lg:pr-16">
          <span className="text-2xl md:text-2xl text-travel-burgundy font-serif font-semibold tracking-wider uppercase mb-2 block">
            ABOUT US
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-light text-gray-800 mb-6 md:mb-0 leading-tight">
            We are a passionate team of travel enthusiasts dedicated to making your honeymoon dreams come true. We offer a curated collection of honeymoon packages, each carefully designed with romance and adventure in mind.
          </h2>
        </div>

        {/* Stats on the right */}
        <div className="mt-8 md:mt-11 w-full md:w-1/3">
          {/* MODIFIED: Changed md:justify-end to md:justify-start to left-align the stats block on desktop */}
          {/* On mobile, flex items default to justify-start, which is desired. */}
          <div className="flex flex-row space-x-6 sm:space-x-8 md:space-x-10 lg:space-x-12 md:justify-start">
            {newStatsData.map((stat) => (
              // MODIFIED: Changed text-center md:text-left to simply text-left for consistent left alignment
              <div key={stat.label} className="text-left"> 
                <p className="text-2xl lg:text-3xl font-serif font-semibold text-gray-800 mb-1">{stat.value}</p>
                <p className="text-2xl font-serif text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HoneymoonInfo; 