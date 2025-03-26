import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DestinationHero from '@/components/destination/DestinationHero';
import DestinationTours from '@/components/destination/DestinationTours';
import DestinationImages from '@/components/destination/DestinationImages';
import { supabase } from '../../utils/supabaseClient';

// Add more component imports as needed

const CountryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [country, setCountry] = useState<any>(null);
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountry = async () => {
      try {
        // Fetch country data
        const response = await fetch(`/api/countries/slug/${slug}`);
        if (!response.ok) throw new Error('Country not found');
        
        const data = await response.json();
        setCountry(data);
        
        // Fetch related tours
        const toursResponse = await fetch(`/api/countries/${data.id}/tours`);
        if (toursResponse.ok) {
          const toursData = await toursResponse.json();
          setTours(toursData);
        }
      } catch (error) {
        console.error('Error fetching country:', error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCountry();
    }
  }, [slug]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        console.log(`Fetching images for country ID: ${country.id}`);
        
        // Debug Supabase
        console.log('Supabase instance available:', !!supabase);
        
        // Query the destination_images table where country_id matches
        const { data, error } = await supabase
          .from('destination_images')
          .select('*')
          .eq('country_id', country.id);
        
        console.log('Raw Supabase response:', { data, error });
        
        // Rest of the function...
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoading(false);
      }
    };

    if (country) {
      fetchImages();
    }
  }, [country]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!country) {
    return <div className="text-center p-12">Country not found</div>;
  }

  console.log('Country data being passed to components:', { 
    id: country.id,
    name: country.name 
  });

  return (
    <div>
      <DestinationHero country={country} />
      <DestinationImages countryId={country.id} countryName={country.name} />
      <DestinationTours tours={tours} country={country} />
      {/* Add more components as needed */}
    </div>
  );
};

export default CountryPage; 