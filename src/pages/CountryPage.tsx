import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import { DestinationSEO } from '@/components/SEO';
import DestinationHero from '@/components/destination/DestinationHero';
import DestinationTours from '@/components/destination/DestinationTours';
import DestinationImages from '@/components/destination/DestinationImages';
import { Tour } from '@/types/tour';

interface Country {
  id: string;
  name: string;
  slug: string;
  featured_image: string | null;
  description?: string | null;
  rationale?: string | null;
  region_id?: string | null;
  best_period?: string | null;
  distance?: string | null;
  comfort?: string | null;
}

const CountryPage = () => {
  const { countrySlug } = useParams<{ countrySlug: string }>();
  const [country, setCountry] = useState<Country | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountryData = async () => {
      if (!countrySlug) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch country data
        const { data: countryData, error: countryError } = await supabase
          .from('countries')
          .select('*')
          .eq('slug', countrySlug)
          .single();

        if (countryError) {
          throw new Error(`Country not found: ${countryError.message}`);
        }

        setCountry(countryData);

        // Fetch tours for this country
        const { data: toursData, error: toursError } = await supabase
          .from('tours')
          .select(`
            *,
            tour_images (
              id,
              image_url,
              is_primary,
              is_featured,
              display_order
            )
          `)
          .contains('countries', [countryData.name])
          .order('recommendation_metric', { ascending: false });

        if (toursError) {
          console.error('Error fetching tours:', toursError);
        } else {
          setTours(toursData || []);
        }

      } catch (err) {
        console.error('Error fetching country data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCountryData();
  }, [countrySlug]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error || !country) {
    return <div className="flex justify-center items-center h-screen text-red-600">Error: {error || 'Country not found'}</div>;
  }

  return (
    <main className="pt-20">
      <DestinationSEO 
        countryName={country.name}
        countrySlug={country.slug}
        description={country.description || undefined}
        image={country.featured_image || undefined}
        tours={tours}
      />
      <DestinationHero country={country} />
      <DestinationImages countryId={country.id} countryName={country.name} />
      <DestinationTours tours={tours} country={country} />
    </main>
  );
};

export default CountryPage; 