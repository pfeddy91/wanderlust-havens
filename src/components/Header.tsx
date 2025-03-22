
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import DestinationsPopup from "./DestinationsPopup";
import MobileMenu from "./MobileMenu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Header = () => {
  const [destinationsOpen, setDestinationsOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleDestinations = () => {
    setDestinationsOpen(!destinationsOpen);
  };

  const closeDestinations = () => {
    setDestinationsOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <span className="font-serif text-[2rem] font-medium text-black tracking-wider">MOONS</span>
          </a>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="flex items-center space-x-10">
              <button 
                onClick={toggleDestinations}
                className="nav-item font-bold text-black tracking-wide uppercase text-lg hover:text-travel-gray transition-colors flex items-center gap-1"
              >
                DESTINATIONS
                <ChevronDown className="h-4 w-4" />
              </button>
              <a href="#vibes" className="nav-item font-bold text-black tracking-wide uppercase text-lg hover:text-travel-gray transition-colors">
                CATEGORIES
              </a>
              <a href="#planner" className="nav-item font-bold text-black tracking-wide uppercase text-lg hover:text-travel-gray transition-colors">
                QUIZ
              </a>
            </nav>
          )}

          {/* Desktop Actions */}
          {!isMobile && (
            <div className="flex items-center space-x-4">
              <Button className="bg-black hover:bg-black/90 text-white rounded-none px-6 uppercase text-sm font-medium tracking-wide">
                Enquire Now
              </Button>
              <div className="flex items-center justify-center w-10 h-10 text-black hover:text-gray-700 transition-colors cursor-pointer">
                <Search className="h-5 w-5" />
              </div>
            </div>
          )}

          {/* Mobile header actions */}
          {isMobile && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 text-black">
                <Search className="h-5 w-5" />
              </div>
              
              <Sheet>
                <SheetTrigger asChild>
                  <button 
                    aria-label="Open menu" 
                    className="flex items-center justify-center w-8 h-8 text-black"
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-full sm:max-w-xs">
                  <MobileMenu />
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </div>

      {/* Destinations Popup */}
      {destinationsOpen && <DestinationsPopup onClose={closeDestinations} />}
    </header>
  );
};

export default Header;
