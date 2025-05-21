import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const featureData = [
  {
    id: 'destinations',
    number: '01',
    title: 'Destinations',
    description: "Explore our handpicked collection of romantic destinations around the world, from secluded islands to cultural capitals.",
    imageSrc: 'https://images.pexels.com/photos/15167415/pexels-photo-15167415/free-photo-of-hot-air-balloons-flying-over-a-valley.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    imageAlt: 'Hot air balloons flying over a valley',
    navigationPath: '/destinations',
  },
  {
    id: 'collections',
    number: '02',
    title: 'Bespoke Planner',
    description: "Seeking adventure, relaxation, or cultural immersion? Find experiences that match your perfect honeymoon atmosphere.",
    imageSrc: 'https://images.pexels.com/photos/15167415/pexels-photo-15167415/free-photo-of-hot-air-balloons-flying-over-a-valley.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    imageAlt: 'Hot air balloons flying over a valley',
    navigationPath: '/planner',
  },
  {
    id: 'planner',
    number: '03',
    title: 'Curated Collections',
    description: "Let our intelligent assistant design a customized honeymoon itinerary based on your preferences, budget, and dream experiences.",
    imageSrc: 'https://images.pexels.com/photos/15167415/pexels-photo-15167415/free-photo-of-hot-air-balloons-flying-over-a-valley.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    imageAlt: 'Hot air balloons flying over a valley',
    navigationPath: '/collections',
  },
];

const Explore = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  const activeCardBgColor = 'bg-[#2D336B]';
  const inactiveCardBgColor = 'bg-slate-100';
  const sectionBgColor = 'bg-white';
  const activeTextColor = 'text-white';
  const inactiveTitleColor = 'text-slate-800';
  const inactiveNumberColor = 'text-slate-400';
  
  const featuresTitleColor = 'text-travel-burgundy';
  const mainHeadingColor = 'text-zinc-800';

  const leftPaddingClass = "pl-14"; 
  const contentWrapperClass = `max-w-6xl mx-auto w-full ${leftPaddingClass}`;

  return (
    <section id="explore" className={`py-16 md:py-20 ${sectionBgColor}`}>
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className={contentWrapperClass}>
          <div className="mb-12 md:mb-16">
            <span className={`${featuresTitleColor} font-semibold tracking-wider uppercase text-sm md:text-base`}>
              FEATURES
            </span>
            <h2 className={`text-4xl md:text-5xl font-serif font-bold ${mainHeadingColor} mt-2 leading-tight`}>
              We make nature <br /> accessible
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 md:gap-4 items-stretch lg:h-[480px] xl:h-[450px]">
            {featureData.map((feature, index) => {
              const isActive = index === activeIndex;
              return (
                <div
                  key={feature.id}
                  className={`
                    p-6 md:p-8 rounded-xl cursor-pointer
                    transition-all duration-500 ease-in-out
                    flex flex-col relative overflow-hidden
                    group
                    ${isActive ? `${activeCardBgColor} lg:flex-[1.75_1_0%]` : `${inactiveCardBgColor} lg:flex-[1_1_0%] hover:bg-slate-200/70`}
                    ${isActive ? 'shadow-xl' : 'shadow-md'}
                  `}
                  onClick={() => setActiveIndex(index)}
                >
                  {isActive && feature.imageSrc && (
                    <div 
                      className="absolute -top-5 -right-5 md:-top-6 md:-right-6 lg:-top-7 lg:-right-7 
                                 w-28 h-28 md:w-32 md:h-32 lg:w-[150px] lg:h-[150px]
                                 rounded-full overflow-hidden shadow-lg border-2 border-white/30 z-0"
                    >
                      <img
                        src={feature.imageSrc}
                        alt={feature.imageAlt}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  )}
                  
                  <div className="relative z-10">
                    <span className={`text-4xl lg:text-5xl font-bold mb-2 lg:mb-0 transition-colors duration-300 ${isActive ? activeTextColor : inactiveNumberColor}`}>
                      {feature.number}
                    </span>
                  </div>

                  <h3 className={`
                    font-serif text-2xl md:text-3xl font-semibold relative z-10
                    ${isActive ? `mt-4 ${activeTextColor}` : `mt-3 ${inactiveTitleColor}`}
                    transition-all duration-300 ease-in-out
                  `}>
                    {feature.title}
                  </h3>

                  <div
                    className={`
                      transition-all duration-500 ease-in-out relative z-10
                      ${isActive ? 'opacity-100 max-h-[1000px] mt-3 md:mt-4 flex flex-col flex-grow' : 'opacity-0 max-h-0 mt-0 pointer-events-none'}
                    `}
                  >
                    <div className="flex-grow">
                      <p className={`${activeTextColor} text-base md:text-lg leading-relaxed opacity-90`}>
                        {feature.description}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(feature.navigationPath);
                      }}
                      className={`
                        mt-auto font-medium flex items-center group self-start pt-3 md:pt-4 
                        transition-opacity duration-300
                        ${isActive ? `opacity-100 ${activeTextColor}` : 'opacity-0'}
                        hover:opacity-80
                      `}
                    >
                      Learn more
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-1.5 transform transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </div>
                  {!isActive && <div className="flex-grow"></div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Explore;
