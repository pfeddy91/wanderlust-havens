
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Menu, X, Phone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileMenuOpen 
          ? 'bg-travel-cream py-3 shadow-md' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <span className="font-serif text-2xl font-medium">Wanderlust Havens</span>
          </a>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#destinations" className="nav-item font-medium text-travel-green hover:text-travel-gray transition-colors">
                Destinations
              </a>
              <a href="#vibes" className="nav-item font-medium text-travel-green hover:text-travel-gray transition-colors">
                Vibes
              </a>
              <a href="#planner" className="nav-item font-medium text-travel-green hover:text-travel-gray transition-colors">
                AI Planner
              </a>
              <a href="#about" className="nav-item font-medium text-travel-green hover:text-travel-gray transition-colors">
                About Us
              </a>
            </nav>
          )}

          {/* Desktop Actions */}
          {!isMobile && (
            <div className="hidden md:flex items-center space-x-4">
              <div className="relative">
                <Input 
                  placeholder="Search destinations..." 
                  className="pl-9 pr-4 py-2 w-[200px] bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white transition-all"
                />
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-travel-gray" />
              </div>
              <a href="tel:+123456789" className="flex items-center text-travel-green hover:text-travel-gray transition-colors">
                <Phone className="h-4 w-4 mr-2" />
                <span className="font-medium">Contact</span>
              </a>
              <Button className="bg-travel-coral hover:bg-travel-coral/90 text-white rounded-sm px-6">
                Book Now
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          {isMobile && (
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-travel-green" />
              ) : (
                <Menu className="h-6 w-6 text-travel-green" />
              )}
            </button>
          )}
        </div>

        {/* Mobile menu */}
        {isMobile && mobileMenuOpen && (
          <div className="md:hidden pt-5 pb-3 animate-fade-in">
            <nav className="flex flex-col space-y-4">
              <a 
                href="#destinations" 
                className="font-medium text-travel-green hover:text-travel-gray transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Destinations
              </a>
              <a 
                href="#vibes" 
                className="font-medium text-travel-green hover:text-travel-gray transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Vibes
              </a>
              <a 
                href="#planner" 
                className="font-medium text-travel-green hover:text-travel-gray transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                AI Planner
              </a>
              <a 
                href="#about" 
                className="font-medium text-travel-green hover:text-travel-gray transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                About Us
              </a>
              <div className="pt-2">
                <div className="relative mb-4">
                  <Input 
                    placeholder="Search destinations..." 
                    className="pl-9 pr-4 py-2 w-full bg-white/80 backdrop-blur-sm"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-travel-gray" />
                </div>
                <div className="flex flex-col space-y-3">
                  <a 
                    href="tel:+123456789" 
                    className="flex items-center text-travel-green hover:text-travel-gray transition-colors"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="font-medium">Contact</span>
                  </a>
                  <Button className="bg-travel-coral hover:bg-travel-coral/90 text-white w-full rounded-sm">
                    Book Now
                  </Button>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
