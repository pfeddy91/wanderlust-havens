import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient';
import ProgressiveImage from '@/components/ui/ProgressiveImage';
import { ImagePresets } from '@/utils/imageOptimization';

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
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-serif font-bold mb-6">We are still working on this one!</h2>
        <p className="text-white/80 max-w-2xl mx-auto mb-12">
          But we thought you'd like some puppies!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZHNnbWZkY2huZ3N4OG9hZXY0NTlyc2VvaDRnbWQxaWxxMGpqNnI1MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZFFVNwIbjsKtP3lHYK/giphy.gif",
            "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdW51YW9lczY4dTc5N2trNGt5eHdubHVuanZ6Z3ViMjQ4Yjd6NHU3NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IdgY2UlsldmhsxHpec/giphy.gif",
            "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExeTJ2YjVmODdpZ203eHR3eGRmZGthY25sbzFyNmkzaWo2Nnh5djhidCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/AOn4zIJcD4xLa/giphy.gif",
            "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2N2OGtxNmt0YTM1MnNyazdmeDdqNWQwZnM0amowMG82eWozcnE5cCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/W4cOM0Qn41SSuUbaZF/giphy.gif",
            "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGFqZzUwaTlyODkydHEzNGQ1czMwNXN4MjY2bXF2bmhnNTU3enp1aiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/v3dCRTCI1WwxgAnRzt/giphy.gif",
            "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2JrZWw3MHBmNTVvcG12anprOGpydDh5ZWtsNmpqbmx2bHQ1NzVkdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8J4w2i7kP7ceQ/giphy.gif" // Added new GIF here
          ].map((gif, index) => (
            <div key={index} className="overflow-hidden rounded-lg h-64 mb-4">
              <ProgressiveImage
                src={gif}
                alt={`Puppy GIF ${index + 1}`}
                className="w-full h-full"
                placeholder="shimmer"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Collections;