import React from 'react';
import { Tour } from '@/types/tour';
import { Calendar, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
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
        <h2 className="mb-6 font-serif text-3xl font-bold uppercase tracking-wide">
          Overview
        </h2>
        
        <div className="prose prose-lg max-w-none font-serif text-gray-700">
          <p className="text-xl leading-relaxed">{tour.summary}</p>
        </div>
      </div>
      
      <div className="lg:col-span-1">
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="bg-primary p-6 text-white">
              <h3 className="text-xl font-bold">Tour Details</h3>
            </div>
            
            <div className="space-y-6 p-6">
              <div className="flex items-center space-x-4">
                <Clock className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{tour.duration} nights</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Calendar className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-gray-500">Best time to travel</p>
                  <p className="font-medium">{idealMonths}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <DollarSign className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm text-gray-500">Guide price from</p>
                  <p className="font-medium">£{formattedPrice} per person</p>
                </div>
              </div>
              
              <div className="mt-6 pt-6">
                <button className="w-full rounded bg-primary py-3 text-white transition-colors hover:bg-primary/90">
                  ENQUIRE NOW
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mt-6 overflow-hidden border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="bg-green-700 p-6 text-white">
              <h3 className="text-xl font-bold">Price includes:</h3>
            </div>
            
            <div className="space-y-3 p-6">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                <p>Scheduled international flights</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                <p>In-destination transfers</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                <p>Activities and excursions as detailed</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                <p>All accommodation</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                <p>24-hour support while you travel</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TourSummary;
