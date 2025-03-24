
import React from 'react';
import { Tour } from '@/types/tour';
import { Calendar, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TourSummaryProps {
  tour: Tour;
}

const TourSummary = ({ tour }: TourSummaryProps) => {
  // Format price to show thousands separator
  const formattedPrice = tour.guide_price.toLocaleString();
  
  // Get ideal travel months (placeholder - in a real app this would come from the database)
  const idealMonths = "March to June | Sept to Nov";
  
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h2 className="mb-8 font-serif text-4xl font-bold uppercase tracking-wide">
          Overview
        </h2>
        
        <div className="prose prose-lg max-w-none font-serif text-gray-700">
          <p className="text-xl leading-relaxed">{tour.summary}</p>
        </div>
      </div>
      
      <div className="lg:col-span-1">
        <Card className="overflow-hidden border-0 shadow-xl max-w-[280px] mx-auto">
          <CardContent className="p-0">
            <div className="bg-primary p-5 text-white">
              <h3 className="text-xl font-serif font-bold">Tour Details</h3>
            </div>
            
            <div className="space-y-5 p-5">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Duration</p>
                  <p className="font-serif text-base">{tour.duration} nights</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Best time to travel</p>
                  <p className="font-serif text-base">{idealMonths}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Guide price from</p>
                  <p className="font-serif text-base">£{formattedPrice} per person</p>
                </div>
              </div>
              
              <div className="mt-5 pt-3">
                <button className="w-full rounded-none bg-primary py-3 text-white transition-colors hover:bg-primary/90 font-serif text-base tracking-wider">
                  ENQUIRE NOW
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TourSummary;
