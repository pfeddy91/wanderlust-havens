import React, { useEffect, useState } from 'react';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from "lucide-react";
import { supabase } from '@/utils/supabaseClient';

// Define interface for destination data
interface Destination {
  id: string;
  name: string;
  slug: string;
}

const Footer = () => {
  const [popularDestinations, setPopularDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch popular destinations from Supabase
  useEffect(() => {
    const fetchPopularDestinations = async () => {
      try {
        console.log("Fetching popular destinations for footer...");
        
        // Updated query to use favourite_destination instead of is_popular
        const { data, error } = await supabase
          .from('countries')
          .select('id, name, slug')
          .eq('favourite_destination', true)  // Changed from is_popular to favourite_destination
          .order('name')
          .limit(5);

        if (error) {
          console.error('Error fetching popular destinations:', error);
          return;
        }

        console.log("Popular destinations fetched:", data);
        setPopularDestinations(data || []);
      } catch (error) {
        console.error('Error in fetchPopularDestinations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularDestinations();
  }, []);

  return (
    <footer id="about" className="pt-16 pb-8" style={{ backgroundColor: '#001e2e' }}>
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-serif text-2xl font-medium mb-4 text-white">Moons</h3>
            <p className="text-white mb-6">
              Curated luxury honeymoon experiences for couples seeking unforgettable beginnings. 
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-travel-green hover:text-travel-coral transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-travel-green hover:text-travel-coral transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-lg mb-4 text-white">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a href="/destinations" className="text-white hover:text-travel-green transition-colors">
                  Destinations
                </a>
              </li>
              <li>
                <a href="/collections" className="text-white hover:text-travel-green transition-colors">
                  Collections
                </a>
              </li>
              <li>
                <a href="/planner" className="text-white hover:text-travel-green transition-colors">
                  Bespoke Planner
                </a>
              </li>
              <li>
                <a href="#" className="text-white hover:text-travel-green transition-colors">
                  Travel Blog
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-lg mb-4 text-white">Popular Destinations</h4>
            <ul className="space-y-3">
              {loading ? (
                // Loading state
                Array(6).fill(0).map((_, index) => (
                  <li key={index} className="animate-pulse">
                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                  </li>
                ))
              ) : popularDestinations.length > 0 ? (
                // Dynamic destinations from Supabase
                popularDestinations.map(destination => (
                  <li key={destination.id}>
                    <a 
                      href={`/destinations/${destination.slug}`} 
                      className="text-white hover:text-travel-green transition-colors"
                    >
                      {destination.name}
                    </a>
                  </li>
                ))
              ) : (
                // Fallback destinations if query fails
                <>
                  <li>
                    <a href="#" className="text-white hover:text-travel-green transition-colors">
                      Maldives
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-white hover:text-travel-green transition-colors">
                      Santorini, Greece
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-white hover:text-travel-green transition-colors">
                      Bali, Indonesia
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-white hover:text-travel-green transition-colors">
                      Amalfi Coast, Italy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-white hover:text-travel-green transition-colors">
                      Kyoto, Japan
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-lg mb-4 text-white">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-travel-green mr-3 mt-0.5" />
                <span className="text-white">
                  83 Goswell Road / London, EC1V 7ER
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-travel-green mr-3" />
                <a href="tel:+1234567890" className="text-white hover:text-travel-green transition-colors">
                  +44 7733 952491
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-travel-green mr-3" />
                <a href="mailto:info@wanderlusthavens.com" className="text-white hover:text-travel-green transition-colors">
                  info@moons.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Moons Limited. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
