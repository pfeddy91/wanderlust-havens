
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getCountryBySlug, getToursByCountry } from '@/services/honeymoonService';
import DestinationHero from '@/components/destination/DestinationHero';
import DestinationTours from '@/components/destination/DestinationTours';
import { Loader2 } from 'lucide-react';

const Destination = () => {
  const { slug } = useParams<{ slug: string }>();
  const [country, setCountry] = useState<any>(null);
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      if (slug) {
        try {
          const countryData = await getCountryBySlug(slug);
          setCountry(countryData);
          
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!country) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold">Destination not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn't find the destination you're looking for.</p>
        <a href="/" className="mt-4 text-primary hover:underline">Go back home</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <DestinationHero country={country} />
        
        {/* Tours Section */}
        <section id="tours" className="bg-gray-50 py-16">
          <DestinationTours tours={tours} country={country} />
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Destination;
