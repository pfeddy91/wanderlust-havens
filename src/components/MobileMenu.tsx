
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const MobileMenu = () => {
  const navigate = useNavigate();
  const [isDestinationsOpen, setIsDestinationsOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="flex flex-col h-full bg-travel-cream">
      <div className="flex justify-between items-center p-4 border-b border-travel-sand">
        <a href="/" className="flex items-center">
          <span className="font-serif text-[2rem] font-medium text-black tracking-wider">MOONS</span>
        </a>
        <SheetClose className="w-8 h-8 flex items-center justify-center text-black">
          <X className="h-6 w-6" />
        </SheetClose>
      </div>
      
      <div className="flex-1 overflow-auto py-6">
        <nav className="flex flex-col">
          <Collapsible
            open={isDestinationsOpen}
            onOpenChange={setIsDestinationsOpen}
            className="w-full"
          >
            <CollapsibleTrigger className="flex items-center justify-between px-6 py-4 border-b border-travel-sand text-black text-[1.15rem] capitalize w-full text-left">
              Destinations
              {isDestinationsOpen ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="bg-gray-50">
              <div className="py-2 px-8 space-y-2">
                <button
                  onClick={() => handleNavigation('/destinations/morocco')}
                  className="w-full text-left py-2 text-black hover:text-travel-coral"
                >
                  Morocco
                </button>
                <button
                  onClick={() => handleNavigation('/destinations/egypt')}
                  className="w-full text-left py-2 text-black hover:text-travel-coral"
                >
                  Egypt
                </button>
                <button
                  onClick={() => handleNavigation('/destinations/south-africa')}
                  className="w-full text-left py-2 text-black hover:text-travel-coral"
                >
                  South Africa
                </button>
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          <a href="#vibes" className="flex items-center justify-between px-6 py-4 border-b border-travel-sand text-black text-[1.15rem] capitalize">
            Categories
          </a>
          
          <a href="#planner" className="flex items-center justify-between px-6 py-4 border-b border-travel-sand text-black text-[1.15rem] capitalize">
            Quiz
          </a>
        </nav>
      </div>
      
      <div className="p-4 border-t border-travel-sand space-y-3">
        <Button className="w-full bg-black hover:bg-black/90 text-white rounded-[10px] py-3 capitalize text-sm font-medium tracking-wide">
          Enquire now
        </Button>
      </div>
    </div>
  );
};

export default MobileMenu;
