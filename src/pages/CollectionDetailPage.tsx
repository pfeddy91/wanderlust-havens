import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { Loader2 } from 'lucide-react';
import { Tour } from '@/types/tour';

// Interface for the dedicated collections table data
interface CollectionDetails {
  id: string;
  name: string;
  slug: string;
  description?: string;
  featured_image?: string;
}

const CollectionDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [collectionDetails, setCollectionDetails] = useState<CollectionDetails | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollectionData = async () => {
      if (!slug) return;

      setLoading(true);
      setError(null);
      setCollectionDetails(null); // Reset on slug change
      setTours([]); // Reset on slug change

      try {
        // 1. Fetch Collection Details from the new 'collections' table using the slug
        const { data: collectionData, error: collectionError } = await supabase
          .from('collections') // *** ASSUMES you created a 'collections' table ***
          .select('*')
          .eq('slug', slug)
          .single();

        if (collectionError || !collectionData) {
          console.error('Error fetching collection details:', collectionError);
          throw new Error(`Collection with slug "${slug}" not found.`);
        }

        setCollectionDetails(collectionData);
        const collectionName = collectionData.name; // Get the actual name

        // 2. Fetch Tours matching the collection name
        const { data: toursData, error: toursError } = await supabase
          .from('tours')
          .select('*') // Select fields needed for the tour cards
          .eq('collection', collectionName); // Filter by the collection name

        if (toursError) {
          console.error('Error fetching tours for collection:', toursError);
          throw new Error('Failed to fetch tours for this collection.');
        }

        // 3. Optionally fetch related images/countries for each tour if needed for cards
        // (Similar to getToursByCountry, loop and enrich tour objects)
        // For simplicity, assuming basic tour data is sufficient for the card here

        setTours(toursData || []);

      } catch (err: any) {
        console.error('Error in fetchCollectionData:', err);
        setError(err.message || 'Failed to load collection data.');
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionData();
  }, [slug]);

  // Simple function to get tour image for the card (can be enhanced)
  const getTourImage = (tour: Tour) => {
    return tour.featured_image || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.20))]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !collectionDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.20))] pt-20">
        <h1 className="text-2xl font-bold mb-4">Collection Not Found</h1>
        <p className="mt-2 text-muted-foreground mb-6">{error || "We couldn't find the collection you're looking for."}</p>
        <Link to="/collections" className="bg-travel-green text-white px-6 py-3 rounded-md hover:bg-travel-dark-green transition-colors">
          Explore Other Collections
        </Link>
      </div>
    );
  }


  return (
    <main className="pt-20">
      {/* Collection Hero Section (Example) */}
      <section className="py-16 bg-gray-100 text-center">
          <div className="container mx-auto px-4">
              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{collectionDetails.name}</h1>
              {collectionDetails.description && (
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">{collectionDetails.description}</p>
              )}
          </div>
      </section>

      {/* Tours Grid Section */}
      <div className="container mx-auto px-4 py-16">
        {tours && tours.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* --- Tour Card Rendering (Adapt from DestinationTours if needed) --- */}
            {tours.map((tour) => (
              <Link
                to={`/tours/${tour.slug}`} // Link to the specific tour detail page
                key={tour.id}
                className="block border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group"
              >
                <div className="w-full h-64 relative overflow-hidden">
                  <img
                    src={getTourImage(tour)}
                    alt={tour.title} // Use title
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80'; }}
                  />
                   <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm px-2 py-1 rounded text-white text-sm font-medium">
                    {tour.duration} NIGHTS
                  </div>
                </div>
                <div className="p-4 bg-white">
                   {/* You might need country names here - requires fetching countries based on tour.countries */}
                  {/* <p className="uppercase text-xs tracking-wider mb-1 text-gray-500">{formatCountryName(tour)}</p> */}
                  <h3 className="text-lg font-semibold font-serif mb-2 text-gray-800 group-hover:text-travel-burgundy transition-colors">{tour.title}</h3>
                  <p className="text-sm text-gray-600">From £{tour.guide_price?.toLocaleString() || 'N/A'} per person</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-8">
              We're currently developing new experiences for the "{collectionDetails.name}" collection.
              Check back soon or contact us for custom travel planning.
            </p>
            <Link to="/collections" className="bg-travel-green text-white px-6 py-3 rounded-md hover:bg-travel-dark-green transition-colors">
              Explore Other Collections
            </Link>
          </div>
        )}
      </div>
    </main>
  );
};

export default CollectionDetailPage; 