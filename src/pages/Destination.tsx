import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCountryBySlug, getToursByCountry } from '@/services/honeymoonService';
import DestinationHero from '@/components/destination/DestinationHero';
import DestinationTours from '@/components/destination/DestinationTours';
import SEO from '@/components/SEO';
import { Loader2 } from 'lucide-react';

const Destination = () => {
  const { slug } = useParams<{ slug: string }>();
  const [country, setCountry] = useState<any>(null);
  const [region, setRegion] = useState<any>(null);
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      if (slug) {
        try {
          const countryData = await getCountryBySlug(slug);
          setCountry(countryData);
          
          // Extract region data if available (from the join in honeymoonService)
          if (countryData?.regions) {
            setRegion(countryData.regions);
          }
          
          if (countryData?.id) {
            const toursData = await getToursByCountry(countryData.id);
            setTours(toursData);
          }
        } catch (error) {
          console.error('Error fetching destination data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.20))]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!country) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.20))] pt-20">
        <h1 className="text-2xl font-bold">Destination not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn't find the destination you're looking for.</p>
        <a href="/" className="mt-4 text-primary hover:underline">Go back home</a>
      </div>
    );
  }

  return (
    <main className="pt-20">
      <SEO 
        isDestination={true}
        countryName={country.name}
        regionName={region?.name}
        description={country.description}
        canonicalUrl={`/destinations/${country.slug}`}
        ogImage={country.featured_image}
      />
      
      {/* Hero Section */}
      <DestinationHero country={country} />
      
      {/* Tours Section */}
      <DestinationTours tours={tours} country={country} />
    </main>
  );
};

export default Destination;
