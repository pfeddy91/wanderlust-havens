
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import DestinationsPopup from "./DestinationsPopup";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [destinationsOpen, setDestinationsOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleDestinations = () => {
    setDestinationsOpen(!destinationsOpen);
  };

  const closeDestinations = () => {
    setDestinationsOpen(false);
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileMenuOpen 
          ? 'py-0' 
          : 'py-0'
      }`}
    >
      <div className="bg-[#F1F0FB] shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <a href="/" className="flex items-center">
              <span className="font-serif text-2xl font-medium text-[#000000e6]">Wanderlust</span>
            </a>

            {/* Desktop Navigation */}
            {!isMobile && (
              <nav className="flex items-center space-x-10">
                <button 
                  onClick={toggleDestinations}
                  className="nav-item font-medium text-[#000000e6] hover:text-travel-gray transition-colors flex items-center"
                >
                  Destinations
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${destinationsOpen ? 'transform rotate-180' : ''}`} />
                </button>
                <a href="#vibes" className="nav-item font-medium text-[#000000e6] hover:text-travel-gray transition-colors">
                  Vibes
                </a>
                <a href="#planner" className="nav-item font-medium text-[#000000e6] hover:text-travel-gray transition-colors">
                  AI Planner
                </a>
              </nav>
            )}

            {/* Desktop Actions */}
            {!isMobile && (
              <div className="flex items-center space-x-4">
                <Button className="bg-travel-green hover:bg-travel-green/90 text-white rounded-full px-6">
                  Enquire Now
                </Button>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-transparent border border-travel-green text-travel-green hover:bg-travel-green hover:text-white transition-colors cursor-pointer">
                  <Search className="h-4 w-4" />
                </div>
              </div>
            )}

            {/* Mobile menu button */}
            {isMobile && (
              <div className="flex items-center space-x-4">
                <Button className="bg-travel-green hover:bg-travel-green/90 text-white rounded-full px-4 py-2 text-sm">
                  Enquire Now
                </Button>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent border border-travel-green text-travel-green">
                  <Search className="h-3 w-3" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Destinations Popup */}
      {destinationsOpen && <DestinationsPopup onClose={closeDestinations} />}
    </header>
  );
};

export default Header;
