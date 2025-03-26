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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white bg-opacity-91 shadow-sm">
      <div className="container mx-auto px-0 sm:px-1">
        <div className="flex justify-between items-center h-20">
          {/* Logo - Extreme Left aligned */}
          <a href="/" className="flex items-center pl-2 md:pl-4">
            <span className="font-serif text-[2rem] font-medium text-black tracking-wider">MOONS</span>
          </a>

          {/* Desktop Navigation - Center */}
          {!isMobile && (
            <nav className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-10">
              <button 
                onClick={toggleDestinations}
                className="nav-item text-black tracking-wide capitalize text-2xl hover:text-travel-gray transition-colors flex items-center gap-1"
              >
                Destinations
                <ChevronDown className="h-4 w-4" />
              </button>
              <a href="/collections" className="nav-item text-black tracking-wide capitalize text-2xl hover:text-travel-gray transition-colors">
                Collections
              </a>
              <a href="/planner" className="nav-item text-black tracking-wide capitalize text-2xl hover:text-travel-gray transition-colors">
                AI Planner
              </a>
            </nav>
          )}

          {/* Desktop Actions - Extreme Right aligned */}
          {!isMobile && (
            <div className="flex items-center space-x-4 pr-2 md:pr-4">
              <Button className="bg-[#333333] hover:bg-[#333333]/90 text-white rounded-[10px] px-6 capitalize text-lg font-medium tracking-wide">
                GET IN TOUCH
              </Button>
              <div className="flex items-center justify-center w-10 h-10 text-black hover:text-gray-700 transition-colors cursor-pointer">
                <Search className="h-5 w-5" />
              </div>
            </div>
          )}

          {/* Mobile header actions */}
          {isMobile && (
            <div className="flex items-center space-x-3 pr-2">
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
