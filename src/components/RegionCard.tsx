import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Card, CardContent } from '@/components/ui/card';
import ProgressiveImage from '@/components/ui/ProgressiveImage';
import { ImagePresets } from '@/utils/imageOptimization';

interface RegionCardProps {
  region: {
    id: string;
    name: string;
    description?: string | null;
    featured_image?: string | null;
    slug: string;
  };
  onClick?: () => void;
}

const RegionCard = ({ region, onClick }: RegionCardProps) => {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Card 
          className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg"
          onClick={onClick}
        >
          <div className="relative h-60 overflow-hidden">
            {region.featured_image ? (
              <ProgressiveImage
                src={region.featured_image}
                alt={region.name}
                className="w-full h-full"
                optimization={ImagePresets.cardMedium}
                placeholder="shimmer"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground">No image available</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
              <h3 className="text-xl font-semibold text-white p-4">{region.name}</h3>
            </div>
          </div>
        </Card>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-lg font-semibold">{region.name}</h4>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {region.description || "Explore the beautiful region of " + region.name}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default RegionCard;
