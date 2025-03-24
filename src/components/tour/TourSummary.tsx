
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
        <Card className="overflow-hidden border-0 shadow-xl">
          <CardContent className="p-0">
            <div className="bg-primary p-8 text-white">
              <h3 className="text-2xl font-serif font-bold">Tour Details</h3>
            </div>
            
            <div className="space-y-8 p-8">
              <div className="flex items-center space-x-4">
                <Clock className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Duration</p>
                  <p className="font-serif text-lg">{tour.duration} nights</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Calendar className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Best time to travel</p>
                  <p className="font-serif text-lg">{idealMonths}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <DollarSign className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Guide price from</p>
                  <p className="font-serif text-lg">£{formattedPrice} per person</p>
                </div>
              </div>
              
              <div className="mt-8 pt-4">
                <button className="w-full rounded-none bg-primary py-4 text-white transition-colors hover:bg-primary/90 font-serif text-lg tracking-wider">
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
