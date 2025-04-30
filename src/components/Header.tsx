import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import DestinationsPopup from "./DestinationsPopup";
import MobileMenu from "./MobileMenu";
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
  const [destinationsOpen, setDestinationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const toggleDestinations = () => {
    setDestinationsOpen(!destinationsOpen);
  };

  const closeDestinations = () => {
    setDestinationsOpen(false);
  };

  // Navigation helper to avoid new tabs
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
  <header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-91 shadow-sm px-0">
    <div className="w-full mx-0 px-0">
      <div className="flex justify-between items-center h-20 px-12">
        <Link 
          to="/" 
          className="pl-0 ml-0"
        >
          <span className="font-serif text-[2rem] font-medium text-black tracking-wider">MOONS</span>
        </Link>

          {/* Desktop Navigation - Center */}
          {!isMobile && (
            <nav className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-10">
              <button 
                onClick={toggleDestinations} 
                className="nav-item text-black font-serif tracking-wide capitalize text-2xl hover:text-travel-gray transition-colors flex items-center gap-1"
              >
                Destinations
                <ChevronDown className="h-4 w-4" />
              </button>
              <Link 
                to="/collections" 
                className="nav-item font-serif text-black tracking-wide capitalize text-2xl hover:text-travel-gray transition-colors"
              >
                Collections
              </Link>
              <Link 
                to="/planner" 
                className="nav-item font-serif text-black tracking-wide capitalize text-2xl hover:text-travel-gray transition-colors"
              >
                AI Planner
              </Link>
            </nav>
          )}

          {/* Desktop Actions - Extreme Right aligned */}
          {!isMobile && (
            <div className="flex items-center space-x-4 pr-0">
              <Button 
                className="bg-travel-charcoal hover:bg-travel-charcoal/90 text-white font-serif rounded-[10px] px-8 h-12 capitalize text-lg font-medium tracking-wide"
                onClick={() => handleNavigation('/contact')}
              >
                Get in Touch
              </Button>
              <div className="flex items-center justify-center w-12 h-12 text-black hover:text-gray-700 transition-colors cursor-pointer">
                <Search className="h-5 w-5" />
              </div>
            </div>
          )}

          {/* Mobile header actions */}
          {isMobile && (
            <div className="flex items-center space-x-3 pr-0">
              <div className="flex items-center justify-center w-8 h-8 text-black">
                <Search className="h-5 w-5" />
              </div>
              
              <button 
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu" 
                className="flex items-center justify-center w-8 h-8 text-black"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Destinations Popup - only for desktop */}
      {!isMobile && destinationsOpen && <DestinationsPopup onClose={closeDestinations} />}
      
      {/* Custom Mobile Menu - completely independent of Radix UI */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </header>
  );
};

export default Header;
