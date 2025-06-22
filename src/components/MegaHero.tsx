import React, { useState } from 'react';
import { Search, ChevronDown, Menu, X, Briefcase } from 'lucide-react'; // Using Briefcase as a placeholder logo

const navLinks = [
  { name: 'Home', href: '#' },
  { name: 'Destination', href: '#' },
  { name: 'Gallery', href: '#' },
  { name: 'Package', href: '#' },
  { name: 'About Us', href: '#' },
];

const MegaHero = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Placeholder for actual image path
  const heroBackgroundImage = '/images/placeholder-mountain-valley.jpg'; // Replace with your actual image path

  return (
    <div className="relative h-screen w-full font-sans">
      {/* Background Image */}
      <img
        src={heroBackgroundImage}
        alt="Breathtaking mountain valley"
        className="absolute inset-0 w-full h-full object-cover -z-20"
      />
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30 -z-10"></div>

      {/* Navigation Bar */}
      <nav className="absolute top-0 left-1/2 -translate-x-1/2 mt-5 md:mt-6 w-full max-w-screen-xl px-4 z-50">
        <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-xl shadow-lg p-3 md:p-4 flex justify-between items-center">
          {/* Logo Placeholder */}
          <a href="#" className="flex items-center space-x-2 text-gray-800 dark:text-white">
            <Briefcase className="h-7 w-7 md:h-8 md:w-8 text-sky-600" />
            <span className="font-bold text-xl md:text-2xl hidden sm:inline">Moons</span>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex space-x-6 xl:space-x-8 items-center">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`text-sm font-medium transition-colors
                  ${link.name === 'Home' ? 'text-sky-700 dark:text-sky-400 font-semibold' : 'text-gray-700 dark:text-neutral-300 hover:text-sky-600 dark:hover:text-sky-500'}`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Right Controls (Desktop) */}
          <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            <button aria-label="Search" className="text-gray-700 dark:text-neutral-300 hover:text-sky-600 dark:hover:text-sky-500 transition-colors">
              <Search className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-1 text-gray-700 dark:text-neutral-300 text-sm">
              <span>ENG</span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </div>
            <button className="bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-neutral-100 text-sm font-medium py-2 px-4 rounded-full hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors shadow-sm">
              Contact Us
            </button>
          </div>

          {/* Hamburger Menu Icon (Mobile/Tablet) */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open menu"
              className="text-gray-800 dark:text-white"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md rounded-lg shadow-xl p-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`block py-2 text-center text-sm font-medium transition-colors
                  ${link.name === 'Home' ? 'text-sky-700 dark:text-sky-400 font-semibold' : 'text-gray-700 dark:text-neutral-300 hover:text-sky-600 dark:hover:text-sky-500'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <div className="border-t border-gray-200 dark:border-neutral-700 pt-3 space-y-3">
              <button className="w-full flex items-center justify-center space-x-2 text-gray-700 dark:text-neutral-300 py-2 hover:text-sky-600 dark:hover:text-sky-500 transition-colors">
                <Search className="h-5 w-5" />
                <span>Search</span>
              </button>
              <div className="flex items-center justify-center space-x-1 text-gray-700 dark:text-neutral-300 py-2 text-sm">
                <span>ENG</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </div>
              <button className="w-full bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-neutral-100 text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors shadow-sm">
                Contact Us
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Content */}
      <div className="absolute inset-x-0 bottom-0 pb-8 md:pb-16 lg:pb-20 px-4 md:px-8 lg:px-12 z-20">
        <div className="container mx-auto flex flex-col lg:flex-row justify-between items-end gap-8 lg:gap-12">
          {/* Text Content (Lower-left) */}
          <div className="max-w-xl lg:max-w-2xl text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight">
              Pack your bags, let's go
              <br />
              somewhere amazing
            </h1>
            <p className="mt-4 md:mt-6 text-base sm:text-lg md:text-xl text-neutral-100 dark:text-neutral-200 font-light leading-relaxed">
              Hidden gems, breathtaking views, unforgettable adventures - where will you go next?
            </p>
          </div>

          {/* CTA Button (Lower-right) */}
          <div className="w-full lg:w-auto flex justify-center lg:justify-end">
            <button className="bg-white text-gray-900 font-semibold py-3.5 md:py-4 px-8 md:px-10 rounded-lg shadow-xl hover:bg-gray-100 transition duration-300 text-base md:text-lg whitespace-nowrap">
              Book Now &gt;&gt;&gt;&gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MegaHero; 