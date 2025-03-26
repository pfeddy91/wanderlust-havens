import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';

interface Vibe {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}

const Collections = () => {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVibes = async () => {
      try {
        const { data, error } = await supabase
          .from('vibes')
          .select('id, name, slug, description, image_url')
          .order('name');

        if (error) {
          console.error('Error fetching vibes:', error);
          return;
        }

        setVibes(data || []);
      } catch (error) {
        console.error('Error in fetchVibes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVibes();
  }, []);

  return (
    <section id="collections" className="py-16 bg-travel-charcoal text-white">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-serif font-bold mb-6 text-center">Travel Collections</h2>
        <p className="text-center text-white/80 max-w-2xl mx-auto mb-12">
          Discover our curated collections of experiences tailored to your travel style and preferences.
        </p>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-64 bg-gray-700 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vibes.map((vibe) => (
              <Link
                key={vibe.id}
                to={`/collections/${vibe.slug}`}
                className="group block"
              >
                <div className="relative overflow-hidden rounded-lg h-64 mb-4">
                  <img
                    src={vibe.image_url || `https://source.unsplash.com/featured/?${vibe.name},travel`}
                    alt={vibe.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end">
                    <div className="p-6">
                      <h3 className="text-2xl font-serif font-medium mb-2">{vibe.name}</h3>
                      {vibe.description && (
                        <p className="text-white/80 line-clamp-2">{vibe.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Collections; 