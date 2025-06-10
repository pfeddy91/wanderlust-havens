import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LoadingDots.css';

interface AiPlannerLoadingAnimationProps {
  message?: string;
  variant?: 'full' | 'simple';
}

const AiPlannerLoadingAnimation: React.FC<AiPlannerLoadingAnimationProps> = ({ 
  message = "Finding your perfect honeymoon...",
  variant = 'full'
}) => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Preload the video when component mounts
  useEffect(() => {
    if (variant === 'full') {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = 'https://videos.pexels.com/video-files/3120488/3120488-hd_1920_1080_24fps.mp4'; // Using HD instead of UHD
      video.onloadeddata = () => setVideoLoaded(true);
      video.onerror = () => setVideoError(true);
    }
  }, [variant]);

  // Simple variant for quick loading states
  if (variant === 'simple') {
    return (
      <div className="min-h-[60vh] w-full relative flex justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="relative flex justify-center items-center">
            <div className="absolute animate-spin h-32 w-32 rounded-full border-t-4 border-b-4 border-pink-400 shadow-lg shadow-pink-400/20"></div>
            <div className="absolute animate-ping h-24 w-24 rounded-full border-t-4 border-b-4 border-purple-400 shadow-lg shadow-purple-400/20"></div>
            <div className="relative z-10 rounded-full h-16 w-16 bg-white/80 backdrop-blur-sm border border-gray-200 animate-pulse flex items-center justify-center shadow-lg">
              <div className="text-xl">✈️</div>
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-serif text-gray-700 font-semibold animate-pulse">
              {message}
            </h2>
            <div className="flex justify-center space-x-1">
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full variant for main loading experience
  return (
    <div className="min-h-screen w-full relative flex items-end justify-start overflow-hidden bg-black">
      <div className="absolute top-6 left-6 md:top-10 md:left-10 lg:top-16 lg:left-16 z-20">
        <Link to="/">
          <span 
            className="text-3xl font-serif font-semibold tracking-wider text-white"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >
            MOONS
          </span>
        </Link>
      </div>
      
      {/* Video element with optimizations */}
      {!videoError && (
        <video
          src="https://videos.pexels.com/video-files/3120488/3120488-hd_1920_1080_24fps.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className="absolute z-0 top-0 left-0 w-full h-full object-cover"
        />
      )}
      
      <div className="absolute z-10 inset-0 bg-black bg-opacity-10" />
      <div className="relative z-20 p-8 sm:p-12 md:p-16 lg:p-24 w-full md:w-3/4 lg:w-2/3 xl:w-1/2">
        <h1 
          className="text-3xl md:text-4xl font-sans font-semibold text-white mb-4"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          Our bespoke AI is finding your ideal honeymoon itineraries
        </h1>
        <p 
          className="text-lg md:text-xl text-gray-200 font-sans"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
        >
          This shouldn't take more than 30 seconds
        </p>
        <div className="wrapper mt-8">
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="shadow"></div>
          <div className="shadow"></div>
          <div className="shadow"></div>
        </div>
      </div>
    </div>
  );
};

export default AiPlannerLoadingAnimation; 