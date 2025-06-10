import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient'; // Adjust path if needed
import { Loader2 } from 'lucide-react';

// Interface for a Collection object - Should match your collections table structure
interface Collection {
  id: string; // Added ID from the table
  name: string;
  slug: string;
  featured_image?: string | null; // Allow null from DB
  description?: string | null; // Allow null from DB
}

// Removed slugify helper function

const AllCollections = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      try {
        // Fetch directly from the new 'collections' table
        const { data: collectionsData, error } = await supabase
          .from('collections')
          .select('id, name, slug, description, featured_image') // Select desired columns
          .order('name'); // Order alphabetically by name

        if (error) {
          console.error('Error fetching collections table:', error);
          throw error;
        }

        // Set the fetched data directly
        setCollections(collectionsData || []);

      } catch (error) {
        console.error('Error in fetchCollections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []); // Empty dependency array means this runs once on mount

  const handleCollectionClick = (collection: Collection) => {
    // Navigate using the slug fetched from the collections table
    navigate(`/collections/${collection.slug}`);
  };

  // Removed getTileStyle function as it's not needed for uniform 2x2 layout

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Hero section */}
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            Explore Our Honeymoon Collections
          </h2>
          <p className="text-base text-gray-700 max-w-2xl mx-auto font-serif">
            Find the perfect theme for your unforgettable journey, curated based on your desired travel style.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : collections.length === 0 ? (
           <p className="text-center text-gray-600 font-serif">No collections found.</p>
        ) : (
          <div className="grid-container">
            {/* Desktop Grid Layout - Adjusted for 2x2 tiles */}
            {/* Define 4 columns total, with taller auto rows */}
            <div className="hidden md:grid grid-cols-4 auto-rows-[300px] gap-4">
              {collections.map((collection, index) => {
                return (
                  <div
                    key={collection.slug}
                    // Add classes to make each item span 2 columns and 2 rows
                    className="relative overflow-hidden rounded-lg cursor-pointer group col-span-2 row-span-2"
                    onClick={() => handleCollectionClick(collection)}
                  >
                    <img
                      src={collection.featured_image || `https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80`} // Default fallback
                      alt={collection.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => { // Handle image loading errors
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent flex items-end justify-start p-6">
                      <h3 className="text-white font-serif text-2xl font-medium drop-shadow-md">
                        {collection.name}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Layout - Remains a Simple 2-column Grid */}
            <div className="grid md:hidden grid-cols-2 gap-3">
              {collections.map((collection) => (
                <div
                  key={collection.slug}
                  className="relative overflow-hidden rounded-lg cursor-pointer aspect-[4/3]" // Aspect ratio for mobile
                  onClick={() => handleCollectionClick(collection)}
                >
                  <img
                    src={collection.featured_image || `https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80`} // Default fallback
                    alt={collection.name}
                    className="w-full h-full object-cover"
                     onError={(e) => { // Handle image loading errors
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';
                      }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-start p-4">
                    <h3 className="text-white font-serif text-lg font-medium drop-shadow-md">
                      {collection.name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AllCollections; 