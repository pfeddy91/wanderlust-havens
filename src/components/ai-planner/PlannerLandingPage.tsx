import React from 'react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface PlannerLandingPageProps {
  onStart: () => void; // Function passed from parent to start the questionnaire
}

const PlannerLandingPage: React.FC<PlannerLandingPageProps> = ({ onStart }) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute w-full h-full object-cover z-0"
      >
        <source src="https://videos.pexels.com/video-files/3115738/3115738-uhd_2560_1440_24fps.mp4" type="video/mp4" />
      </video>
      
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>
      
      {/* Content Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-20 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-16 md:py-20 min-h-screen"
      >
        <div className="max-w-2xl">
          {/* Wrap Logo with Link */}
          <Link to="/" className="inline-block mb-6">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-xl md:text-3xl font-serif tracking-widest text-white"
            >
              MOONS
            </motion.h2>
          </Link>

          {/* Main Title (Increased font size) */}
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-serif mb-6 text-white"
          >
            Moons' Honeymoon Bespoke Planner
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-xl md:text-2xl font-light text-white mb-8"
          >
            Let us help you plan the honeymoon of a lifetime
          </motion.p>
          
          {/* Description */}
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-base md:text-lg text-white/90 mb-12 leading-relaxed max-w-xl"
          >
            Planning the honeymoon of your dreams? Whether you imagine relaxing on pristine beaches, exploring vibrant cultures side-by-side, or seeking thrilling adventures, finding the trip that truly resonates with you both is essential. Our Honeymoon Bespoke Planner asks a few key questions about your ideal escape. We'll then reveal the top recommendations from our curated collection of exquisite honeymoon itineraries, perfectly matched to your unique desires. Let's discover your dream itinerary together...
          </motion.p>
          
          {/* Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.5 }}
          >
            <Button
              size="lg"
              onClick={onStart}
              className="bg-white hover:bg-white/90 text-black px-10 py-6 text-lg rounded-full shadow-md hover:shadow-xl border border-white/20 transition-all duration-300 ease-in-out"
            >
              Start Planning
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default PlannerLandingPage; 