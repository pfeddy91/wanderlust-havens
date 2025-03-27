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
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <Link 
            to="/" 
            className="font-serif text-3xl font-medium"
            onClick={onClose}
          >
            MOONS
          </Link>
          <button 
            onClick={onClose}
            className="rounded-full h-8 w-8 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Simplified menu without scrolling concerns */}
        <div className="p-6 flex-1">
          <nav>
            <div className="space-y-1">
              {/* Direct link to destinations page */}
              <Link 
                to="/destinations"
                className="block py-5 text-2xl font-serif border-b border-gray-100"
                onClick={onClose}
              >
                Destinations
              </Link>
              
              <Link 
                to="/collections"
                className="block py-5 text-2xl font-serif border-b border-gray-100"
                onClick={onClose}
              >d
                Collections
              </Link>
              
              <Link 
                to="/planner"
                className="block py-5 text-2xl font-serif border-b border-gray-100"
                onClick={onClose}
              >
                AI Planner
              </Link>
            </div>
          </nav>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <button 
            className="w-full bg-travel-burgundy text-white py-4 rounded-md text-xl font-serif"
            onClick={() => {
              navigate('/contact');
              onClose();
            }}
          >
            Enquire Now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MobileMenu;
