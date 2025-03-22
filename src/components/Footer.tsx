
import React from 'react';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer id="about" className="bg-travel-cream pt-16 pb-8">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-serif text-2xl font-medium mb-4">Wanderlust Havens</h3>
            <p className="text-travel-gray mb-6">
              Curated luxury honeymoon experiences for couples seeking unforgettable beginnings. Our travel specialists design perfect moments for your new journey together.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-travel-green hover:text-travel-coral transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-travel-green hover:text-travel-coral transition-colors" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-travel-green hover:text-travel-coral transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a href="#destinations" className="text-travel-gray hover:text-travel-green transition-colors">
                  Destinations
                </a>
              </li>
              <li>
                <a href="#vibes" className="text-travel-gray hover:text-travel-green transition-colors">
                  Vibes
                </a>
              </li>
              <li>
                <a href="#planner" className="text-travel-gray hover:text-travel-green transition-colors">
                  AI Planner
                </a>
              </li>
              <li>
                <a href="#" className="text-travel-gray hover:text-travel-green transition-colors">
                  Our Story
                </a>
              </li>
              <li>
                <a href="#" className="text-travel-gray hover:text-travel-green transition-colors">
                  Travel Blog
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-lg mb-4">Popular Destinations</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-travel-gray hover:text-travel-green transition-colors">
                  Maldives
                </a>
              </li>
              <li>
                <a href="#" className="text-travel-gray hover:text-travel-green transition-colors">
                  Santorini, Greece
                </a>
              </li>
              <li>
                <a href="#" className="text-travel-gray hover:text-travel-green transition-colors">
                  Bali, Indonesia
                </a>
              </li>
              <li>
                <a href="#" className="text-travel-gray hover:text-travel-green transition-colors">
                  Amalfi Coast, Italy
                </a>
              </li>
              <li>
                <a href="#" className="text-travel-gray hover:text-travel-green transition-colors">
                  Kyoto, Japan
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-lg mb-4">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-travel-green mr-3 mt-0.5" />
                <span className="text-travel-gray">
                  123 Luxury Lane, Suite 500<br />New York, NY 10001
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-travel-green mr-3" />
                <a href="tel:+1234567890" className="text-travel-gray hover:text-travel-green transition-colors">
                  +1 (234) 567-890
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-travel-green mr-3" />
                <a href="mailto:info@wanderlusthavens.com" className="text-travel-gray hover:text-travel-green transition-colors">
                  info@wanderlusthavens.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-travel-sand/50 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-travel-gray text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Wanderlust Havens. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-travel-gray">
            <a href="#" className="hover:text-travel-green transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-travel-green transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-travel-green transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
