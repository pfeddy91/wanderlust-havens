
import React from 'react';
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";

const MobileMenu = () => {
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
          <MenuLink href="#destinations" label="DESTINATIONS" hasChildren />
          <MenuLink href="#vibes" label="CATEGORIES" />
          <MenuLink href="#planner" label="QUIZ" />
        </nav>
      </div>
      
      <div className="p-4 border-t border-travel-sand space-y-3">
        <Button className="w-full bg-black hover:bg-black/90 text-white rounded-none py-3 uppercase text-sm font-medium tracking-wide">
          Enquire Now
        </Button>
      </div>
    </div>
  );
};

const MenuLink = ({ 
  href, 
  label, 
  hasChildren = false 
}: { 
  href: string; 
  label: string; 
  hasChildren?: boolean;
}) => {
  return (
    <a 
      href={href} 
      className="flex items-center justify-between px-6 py-4 border-b border-travel-sand text-black font-medium text-lg uppercase"
    >
      {label}
      {hasChildren && <ChevronRight className="h-5 w-5" />}
    </a>
  );
};

export default MobileMenu;
