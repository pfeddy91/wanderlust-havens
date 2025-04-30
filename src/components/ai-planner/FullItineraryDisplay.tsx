import React from 'react';
import { FullItinerary } from '@/types/aiPlanner'; // Adjust path
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // shadcn Accordion for daily schedule

interface FullItineraryDisplayProps {
  fullItinerary: FullItinerary;
  // onExport?: () => void; // Add later for export functionality
}

const FullItineraryDisplay: React.FC<FullItineraryDisplayProps> = ({ fullItinerary }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-4xl font-serif font-bold mb-4 text-center">{fullItinerary.title}</h2>
       {/* Optional: Featured Image */}
       {fullItinerary.featured_image && (
          <img
              src={fullItinerary.featured_image}
              alt={fullItinerary.title}
              className="w-full h-80 object-cover rounded-lg mb-6 shadow-md"
          />
       )}

      <div className="bg-card p-6 rounded-lg shadow mb-8 border">
         <h3 className="text-2xl font-semibold font-serif mb-3">Summary</h3>
         <p className="text-muted-foreground mb-4">{fullItinerary.summary}</p>
         {/* Display other top-level details like price if needed */}
          {fullItinerary.guide_price && (
              <p className="text-lg font-medium">
                  Guide Price: £{fullItinerary.guide_price.toLocaleString()} per person
              </p>
          )}
      </div>


      {/* Daily Schedule */}
      <div className="mb-8">
         <h3 className="text-2xl font-semibold font-serif mb-4">Daily Itinerary</h3>
         <Accordion type="single" collapsible className="w-full">
             {fullItinerary.daily_schedule?.map((day) => (
                 <AccordionItem value={`day-${day.day}`} key={day.day}>
                    <AccordionTrigger className="text-xl hover:no-underline">
                        Day {day.day}: {day.title}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 space-y-3 text-base">
                       <p>{day.description}</p>
                       {day.activities && day.activities.length > 0 && (
                            <div>
                                <h4 className="font-semibold mt-2">Activities:</h4>
                                <ul className="list-disc list-inside text-muted-foreground">
                                    {day.activities.map((activity, index) => (
                                        <li key={index}>{activity}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                         {day.accommodation && (
                            <p className="mt-2"><strong>Accommodation:</strong> {day.accommodation}</p>
                        )}
                    </AccordionContent>
                 </AccordionItem>
             ))}
         </Accordion>
      </div>

      {/* TODO: Add sections for Map, Highlights, etc. */}


       {/* TODO: Add Export Button and functionality later */}
      <div className="text-center mt-10">
          <Button size="lg" variant="outline">Export as PDF (Coming Soon)</Button>
      </div>

    </div>
  );
};

export default FullItineraryDisplay; 