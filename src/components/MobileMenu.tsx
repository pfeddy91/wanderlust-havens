import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

// This is a completely custom mobile menu that doesn't rely on the Sheet component
const MobileMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  
  // Prevent scrolling of the background when menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Use portal to render outside of any potential constraint containers
  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Menu panel */}
      <div 
        className="relative w-[85%] max-w-xs bg-white h-full flex flex-col shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 
            className="font-serif text-lg md:text-3xl font-medium"
          >
            MOONS
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Simplified menu without scrolling concerns */}
        <nav className="flex-1 overflow-y-auto py-6">
          <div className="space-y-0">
            <Link 
              to="/destinations" 
              onClick={onClose}
              className="block py-5 text-lg md:text-2xl font-serif border-b border-gray-100"
              style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
            >
              Destinations
            </Link>
            <Link 
              to="/planner" 
              onClick={onClose}
              className="block py-5 text-lg md:text-2xl font-serif border-b border-gray-100"
              style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
            >
              Bespoke Planner
            </Link>
            <Link 
              to="/collections" 
              onClick={onClose}
              className="block py-5 text-lg md:text-2xl font-serif border-b border-gray-100"
              style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
            >
              Collections
            </Link>
          </div>
        </nav>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={() => {
              navigate('/contact');
              onClose();
            }}
            className="w-full bg-travel-burgundy text-white py-4 rounded-md text-base md:text-xl font-serif"
          >
            Get In Touch
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MobileMenu;
