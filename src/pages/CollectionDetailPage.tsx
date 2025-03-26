import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';

interface Vibe {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

interface Tour {
  id: string;
  name: string;
  slug: string;
  duration: number;
  guide_price: number;
  featured_image?: string;
  country_name1?: string;
  country_name2?: string;
}

const CollectionDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVibeAndTours = async () => {
      try {
        setLoading(true);
        
        // Fetch vibe details
        const { data: vibeData, error: vibeError } = await supabase
          .from('vibes')
          .select('id, name, description, image_url')
          .eq('slug', slug)
          .single();

        if (vibeError) {
          console.error('Error fetching vibe:', vibeError);
          return;
        }

        setVibe(vibeData);

        // Fetch tours with this vibe
        const { data: toursData, error: toursError } = await supabase
          .from('tour_vibes')
          .select(`
            tour_id,
            tours:tour_id(
              id, 
              name, 
              slug, 
              duration, 
              guide_price,
              featured_image,
              country_name1,
              country_name2
            )
          `)
          .eq('vibe_id', vibeData.id);

        if (toursError) {
          console.error('Error fetching tours:', toursError);
          return;
        }

        // Extract tour data from the nested structure
        const formattedTours = toursData
          .map(item => item.tours)
          .filter(tour => tour !== null);

        setTours(formattedTours);
      } catch (error) {
        console.error('Error in fetchVibeAndTours:', error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchVibeAndTours();
    }
  }, [slug]);

  // Format country names
  const formatCountryName = (tour: Tour) => {
    if (tour.country_name1 && tour.country_name2) {
      return `${tour.country_name1} & ${tour.country_name2}`;
    }
    return tour.country_name1 || 'Multiple Countries';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vibe) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold">Collection not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn't find the collection you're looking for.</p>
        <Link to="/" className="mt-4 text-primary hover:underline">Go back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-20">
        {/* Hero section */}
        <div 
          className="relative h-[40vh] bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${vibe.image_url || `https://source.unsplash.com/featured/?${vibe.name},travel`})` 
          }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="absolute inset-0 flex items-center justify-center text-center text-white px-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{vibe.name}</h1>
              {vibe.description && (
                <p className="max-w-2xl mx-auto text-lg">{vibe.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tours grid */}
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-serif font-bold mb-12 text-center">
            {tours.length > 0 
              ? `Discover Our ${vibe.name} Experiences` 
              : `No ${vibe.name} Experiences Available Yet`}
          </h2>
          
          {tours.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tours.map((tour) => (
                <Link 
                  key={tour.id} 
                  to={`/tours/${tour.slug}`}
                  className="block h-[600px] relative overflow-hidden group cursor-pointer"
                >
                  <div className="absolute top-4 right-6 z-10 text-white font-serif tracking-wider text-lg">
                    {tour.duration} NIGHTS
                  </div>
                  
                  <div className="w-full h-full relative">
                    <img 
                      src={tour.featured_image || `https://source.unsplash.com/featured/?${tour.name},travel`}
                      alt={tour.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                      <div className="absolute bottom-0 left-0 p-8 text-white">
                        <p className="uppercase text-sm tracking-wider mb-2 font-sans">{formatCountryName(tour)}</p>
                        <h3 className="text-2xl font-bold uppercase font-serif tracking-wide mb-6">{tour.name}</h3>
                        <p className="text-sm mb-8 font-serif">From £{tour.guide_price.toLocaleString()} per person</p>
                        
                        <div className="inline-block border border-white px-8 py-3 uppercase tracking-wider text-sm font-sans backdrop-blur-sm bg-white/10 transition-colors group-hover:bg-white/20">
                          EXPLORE MOON
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-travel-charcoal/70 mb-8">
                We're currently developing new experiences for this collection. 
                Check back soon or contact us for custom travel planning.
              </p>
              <Link to="/collections" className="bg-travel-green text-white px-6 py-3 rounded-md hover:bg-travel-dark-green transition-colors">
                Explore Other Collections
              </Link>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CollectionDetailPage; 