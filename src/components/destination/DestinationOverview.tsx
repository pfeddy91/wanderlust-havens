
import React from 'react';
import { Button } from '@/components/ui/button';

interface DestinationOverviewProps {
  country: {
    name: string;
    description: string | null;
  };
}

const DestinationOverview = ({ country }: DestinationOverviewProps) => {
  // Hardcoded content for the overview section
  const overviewContent = {
    tagline: `In ${country.name}, the only search engine you'll need is the stars.`,
    whyTravel: `Some travel operators will set you down in a nice but not particularly special hotel. You'll wait around for taxis that lead you through choked roads and throw you out in the medina of Marrakech. You'll be there, but you'll feel apart from it. Almost involved; as if you're living in a simulation. With our bespoke ${country.name} itineraries, however, we work closely with local contacts and guides; seamlessly conveying you from stupendous hotels to immersive cooking tours, desert sidecar rides, and unforgettable experiences in breathtaking landscapes. You'll stop for mint tea with village locals; visit secret, hidden gems and more. We specialize in luxury ${country.name} holidays for a reason.`
  };

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="flex flex-col items-center">
        <div className="flex flex-col text-center max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-8">
            WHY SHOULD YOU TRAVEL ON A PRIVATE {country.name.toUpperCase()} TOUR WITH US?
          </h2>
          
          <p className="text-xl italic font-serif mb-8">
            {overviewContent.tagline}
          </p>
          
          <p className="text-base md:text-lg leading-relaxed mb-8">
            {country.description || overviewContent.whyTravel}
          </p>
          
          <div className="mt-8">
            <Button className="bg-black hover:bg-black/90 text-white px-8 py-6 text-base rounded-none">
              START PLANNING
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationOverview;
