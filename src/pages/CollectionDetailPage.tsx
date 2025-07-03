import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { Loader2 } from 'lucide-react';
import { Tour } from '@/types/tour';
import SEO from '@/components/SEO';
import { Carousel, Card, CardType as AppleCardDataType } from '@/components/ui/apple-cards-carousel';
import { Button } from '@/components/ui/button';
import { optimizeImageUrl, ImagePresets } from '@/utils/imageOptimization';
import ProgressiveImage from '@/components/ui/ProgressiveImage';

// Interface for the dedicated collections table data
interface CollectionDetails {
  id: string;
  name: string;
  slug: string;
  description?: string;
  featured_image?: string;
}

// Extended Tour interface with country names
interface TourWithCountries extends Tour {
  country_names?: string[];
}

// Interface for region with tours
interface RegionWithTours {
  id: string;
  name: string;
  tours: TourWithCountries[];
}

const CollectionDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [collectionDetails, setCollectionDetails] = useState<CollectionDetails | null>(null);
  const [regionTours, setRegionTours] = useState<RegionWithTours[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollectionData = async () => {
      if (!slug) return;

      setLoading(true);
      setError(null);
      setCollectionDetails(null);
      setRegionTours([]);

      try {
        // 1. Fetch Collection Details from the new 'collections' table using the slug
        const { data: collectionData, error: collectionError } = await supabase
          .from('collections')
          .select('*')
          .eq('slug', slug)
          .single();

        if (collectionError || !collectionData) {
          console.error('Error fetching collection details:', collectionError);
          throw new Error(`Collection with slug "${slug}" not found.`);
        }

        setCollectionDetails(collectionData);
        const collectionName = collectionData.name;

        // 2. Fetch Tours with their regions and country names using a more complex query
        const { data: toursData, error: toursError } = await supabase
          .rpc('get_collection_tours_with_countries', {
            collection_name: collectionName
          });

        if (toursError) {
          console.error('Error fetching tours for collection:', toursError);
          // Fallback to simpler query if RPC doesn't exist
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('tours')
            .select(`
              *,
              tour_images(id, image_url, alt_text, is_featured, is_primary, display_order),
              regions(id, name)
            `)
            .eq('collection', collectionName)
            .not('region_id', 'is', null);

          if (fallbackError) {
            throw new Error('Failed to fetch tours for this collection.');
          }

          // For fallback, we'll get country names separately
          const enrichedTours = await Promise.all(
            (fallbackData || []).map(async (tour: any) => {
              if (tour.countries && tour.countries.length > 0) {
                const { data: countryData } = await supabase
                  .from('countries')
                  .select('name')
                  .in('id', tour.countries);
                
                return {
                  ...tour,
                  country_names: countryData?.map(c => c.name) || [],
                  tour_images: tour.tour_images || []
                };
              }
              return {
                ...tour,
                country_names: [],
                tour_images: tour.tour_images || []
              };
            })
          );

          // Group by region
          const regionMap = new Map<string, RegionWithTours>();
          
          enrichedTours.forEach((tour: any) => {
            if (tour.regions) {
              const regionName = tour.regions.name;
              const regionId = tour.regions.id;
              
              if (!regionMap.has(regionName)) {
                regionMap.set(regionName, {
                  id: regionId,
                  name: regionName,
                  tours: []
                });
              }
              
              regionMap.get(regionName)!.tours.push(tour);
            }
          });

          const sortedRegions = Array.from(regionMap.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
          );

          setRegionTours(sortedRegions);
          return;
        }

        // If RPC succeeds, process the data
        const regionMap = new Map<string, RegionWithTours>();
        
        toursData?.forEach((tour: any) => {
          if (tour.region_name) {
            const regionName = tour.region_name;
            const regionId = tour.region_id;
            
            if (!regionMap.has(regionName)) {
              regionMap.set(regionName, {
                id: regionId,
                name: regionName,
                tours: []
              });
            }
            
            regionMap.get(regionName)!.tours.push({
              ...tour,
              tour_images: tour.tour_images || []
            });
          }
        });

        // Convert to array and sort alphabetically
        const sortedRegions = Array.from(regionMap.values()).sort((a, b) => 
          a.name.localeCompare(b.name)
        );

        setRegionTours(sortedRegions);

      } catch (err: any) {
        console.error('Error in fetchCollectionData:', err);
        setError(err.message || 'Failed to load collection data.');
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionData();
  }, [slug]);

  // Function to get the best image for a tour (copied from DestinationTours)
  const getTourImage = (tour: TourWithCountries) => {
    let imageUrl = '';
    
    if (tour.tour_images && tour.tour_images.length > 0) {
      const primaryImage = tour.tour_images.find((img) => img.is_primary);
      if (primaryImage) imageUrl = primaryImage.image_url;
      
      if (!imageUrl) {
        const featuredImage = tour.tour_images.find((img) => img.is_featured);
        if (featuredImage) imageUrl = featuredImage.image_url;
      }
      
      if (!imageUrl) {
        const sortedImages = [...tour.tour_images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        if (sortedImages.length > 0) imageUrl = sortedImages[0].image_url;
      }
    }
    
    if (!imageUrl) {
      imageUrl = tour.featured_image || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';
    }
    
    return imageUrl;
  };

  // Get primary country name for display
  const getPrimaryCountryName = (tour: TourWithCountries) => {
    if (tour.country_names && tour.country_names.length > 0) {
      return tour.country_names[0]; // Use first country as primary
    }
    return 'Destination'; // Fallback
  };

  // Custom tour card component (copied and adapted from DestinationTours)
  const CustomTourCard = ({ tour }: { tour: TourWithCountries }) => {
    const primaryCountry = getPrimaryCountryName(tour);
    
    return (
      <Link 
        to={`/tours/${tour.slug}`} 
        className="relative z-10 flex h-[26rem] w-[218px] flex-col items-start justify-between overflow-hidden rounded-xl bg-gray-100 shadow-lg transition-all hover:shadow-xl md:h-[39rem] md:w-[20.9rem] dark:bg-neutral-900"
      >
        {/* Top Gradient Overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-2/3 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
        
        {/* Bottom Gradient Overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Top Content - Country and Title */}
        <div className="relative z-30 p-6">
          <p className="text-left font-sans text-xs font-medium uppercase tracking-wider text-white/80 md:text-sm">
            {primaryCountry}
          </p>
          <p className="mt-1 max-w-xs text-left font-serif text-lg font-semibold [text-wrap:balance] text-white md:text-2xl">
            {(tour as any).title || 'Luxury Honeymoon'}
          </p>
        </div>

        {/* Bottom Content - Price, Duration and Button */}
        <div className="relative z-30 p-6 space-y-3">
          <p className="text-left text-base font-bold text-white font-serif">
            From £{tour.guide_price?.toLocaleString()} per person | {tour.duration} Nights
          </p>
          <div className="inline-block border border-white/80 px-4 py-2 rounded-lg uppercase tracking-wider font-serif text-lg font-medium text-white backdrop-blur-sm bg-white/10 transition-all hover:bg-white/20 hover:border-white">
            Explore Moon
          </div>
        </div>

        {/* Background Image */}
        <div className="absolute inset-0 z-10">
          <ProgressiveImage
            src={getTourImage(tour)}
            alt={(tour as any).title || 'Tour image'}
            className="w-full h-full"
            optimization={ImagePresets.destinationCard}
            placeholder="shimmer"
            loading="lazy"
          />
        </div>
      </Link>
    );
  };

  // Mobile carousel component
  const MobileCarousel = ({ tours }: { tours: TourWithCountries[] }) => {
    return (
      <div className="md:hidden">
        <div 
          className="flex gap-4 overflow-x-auto scrollbar-hide py-4 scroll-smooth px-4"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {tours.map((tour, index) => (
            <div key={`${tour.id}-${index}`} className="flex-shrink-0">
              <CustomTourCard tour={tour} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Generate region-specific descriptions
  const getRegionDescription = (regionName: string, collectionName: string) => {
    const descriptions: { [key: string]: string } = {
      'Africa': `These luxury ${regionName} honeymoons are part of our ${collectionName} collection, where epic safaris meet dramatic landscapes. From the vast Serengeti to the mystical Atlas Mountains, discover adventures that will ignite your souls together.`,
      'Asia': `These luxury ${regionName} honeymoons are part of our ${collectionName} collection, where ancient cultures blend with untamed wilderness. Trek through Himalayan peaks, explore hidden temples, and dive into vibrant underwater worlds across the continent's most thrilling destinations.`,
      'Caribbean & Central America': `These luxury ${regionName} honeymoons are part of our ${collectionName} collection, where tropical adventures await beyond the beaches. Discover volcanic landscapes, pristine rainforests, and coral reefs that offer excitement and wonder in paradise.`,
      'Europe': `These luxury ${regionName} honeymoons are part of our ${collectionName} collection, where history meets adventure across diverse landscapes. From dramatic Nordic fjords to rugged Mediterranean coastlines, explore the continent's most captivating and active destinations.`,
      'North America & Hawaii': `These luxury ${regionName} honeymoons are part of our ${collectionName} collection, where vast wilderness and volcanic islands create unforgettable adventures. Experience everything from glacial expeditions to tropical volcano hikes across these diverse and thrilling landscapes.`,
      'Oceania & Pacific': `These luxury ${regionName} honeymoons are part of our ${collectionName} collection, where pristine wilderness meets endless ocean adventures. Dive the Great Barrier Reef, trek through ancient rainforests, and explore remote islands that few have discovered.`,
      'South America': `These luxury ${regionName} honeymoons are part of our ${collectionName} collection, where ancient civilizations meet raw natural power. From the mystical heights of Machu Picchu to the untamed Amazon, embark on journeys that will challenge and inspire you both.`
    };
    
    return descriptions[regionName] || `These luxury ${regionName} honeymoons are part of our ${collectionName} collection, offering unique adventures tailored to your travel style.`;
  };

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
      <SEO 
        title={`${collectionDetails.name} | Honeymoon Collection`}
        description={collectionDetails.description || `Explore our curated '${collectionDetails.name}' honeymoon collection. Find unique tours and experiences tailored to your travel style.`}
        keywords={`${collectionDetails.name}, honeymoon collection, luxury travel, romantic getaways, ${collectionDetails.name} honeymoons`}
        canonicalUrl={`/collections/${collectionDetails.slug}`}
      />
      
      {/* Collection Hero Section */}
      <section className="py-16 bg-gray-100 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{collectionDetails.name}</h1>
          {collectionDetails.description && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{collectionDetails.description}</p>
          )}
        </div>
      </section>

      {/* Region Sections */}
      {regionTours && regionTours.length > 0 ? (
        regionTours.map((region) => (
          <div key={region.id} className="pt-16 pb-0" style={{ backgroundColor: '#E4EDF3' }}>
            <div className="max-w-7l p-8 md:ml-14 md:mr-auto md:p-0">
              
              {/* Mobile Layout */}
              <div className="md:hidden">
                <div className="mb-8">
                  <h2 className="text-3xl font-serif font-bold mb-4 uppercase">
                    {collectionDetails.name.toUpperCase()}<br/>IN {region.name.toUpperCase()}
                  </h2>
                  <p className="text-base text-gray-700 mb-6 font-serif">
                    {getRegionDescription(region.name, collectionDetails.name)}
                  </p>
                </div>
                <MobileCarousel tours={region.tours} />
              </div>
              
              {/* Desktop Layout */}
              <div className="hidden md:block">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                  <div className="lg:col-span-1">
                    <h2 className="text-3xl font-serif font-bold mb-4 uppercase">
                      {collectionDetails.name.toUpperCase()}<br/>IN {region.name.toUpperCase()}
                    </h2>
                    <p className="text-base text-gray-700 mb-6 font-serif">
                      {getRegionDescription(region.name, collectionDetails.name)}
                    </p>
                  </div>
                  
                  <div className="lg:col-span-3">
                    <div className="w-full min-w-[1200px]">
                      <Carousel items={region.tours.map((tour, index) => (
                        <CustomTourCard key={`${tour.id}-${index}`} tour={tour} />
                      ))} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-16 bg-gray-50">
          <p className="text-gray-600 mb-8">
            We're currently developing new experiences for the "{collectionDetails.name}" collection.
            Check back soon or contact us for custom travel planning.
          </p>
          <Link to="/collections" className="bg-travel-green text-white px-6 py-3 rounded-md hover:bg-travel-dark-green transition-colors">
            Explore Other Collections
          </Link>
        </div>
      )}
    </main>
  );
};

export default CollectionDetailPage; 