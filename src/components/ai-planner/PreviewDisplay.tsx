import React from 'react';
import { ItineraryPreview } from '@/types/aiPlanner'; // Adjust path
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"; // Use shadcn Card

interface PreviewDisplayProps {
  itineraryPreview: ItineraryPreview;
  onUnlock: () => void; // Function to call when unlock is clicked
  // guide_price?: number; // Consider adding if guide_price is available here
}

const PreviewDisplay: React.FC<PreviewDisplayProps> = ({ itineraryPreview, onUnlock }) => {
  // --- Potential Issue Check ---
  // The ItineraryPreview interface from the edge function currently doesn't include guide_price.
  // If you want to display it here, ensure your SQL function 'match_itineraries_filtered'
  // returns 'guide_price' and update the ItineraryPreview interface in:
  // - supabase/functions/findMatchingItinerary/index.ts
  // - src/types/aiPlanner.ts
  const guidePrice = (itineraryPreview as any).guide_price; // Accessing potentially missing prop

  return (
    // Container to add some vertical padding and ensure background visibility
    <div className="container mx-auto py-10 px-4">
        <div className="max-w-2xl mx-auto bg-card text-card-foreground rounded-lg shadow-lg overflow-hidden">
             {/* Added loading="lazy" for potentially large images */}
             {itineraryPreview.featured_image && (
                <img
                    src={itineraryPreview.featured_image}
                    alt={itineraryPreview.title}
                    className="w-full h-60 md:h-72 object-cover" // Adjusted height slightly
                    loading="lazy"
                />
            )}
            <CardHeader className="p-6">
                 {/* Using text-primary for potentially more visual hierarchy */}
                 <CardTitle className="text-2xl md:text-3xl font-serif font-semibold text-primary">{itineraryPreview.title}</CardTitle>
                 {/* Display guide price only if it exists and is a positive number */}
                 {typeof guidePrice === 'number' && guidePrice > 0 && (
                    <CardDescription className="text-base md:text-lg pt-1">
                        Guide Price: ~£{guidePrice.toLocaleString()} per person
                    </CardDescription>
                 )}
                 {/* Display Similarity Score (Optional) - good for debugging/interest */}
                 {/*
                 {typeof itineraryPreview.similarity === 'number' && (
                     <CardDescription className="text-xs pt-1">
                         Match Score: {Math.round(itineraryPreview.similarity * 100)}%
                     </CardDescription>
                 )}
                 */}
            </CardHeader>
            <CardContent className="px-6 pb-6">
                {/* Increased text size slightly */}
                <p className="text-base text-muted-foreground">{itineraryPreview.summary}</p>
            </CardContent>
            <CardFooter className="flex flex-col items-center justify-center p-6 bg-muted/40 border-t">
                 {/* Making button slightly larger and more prominent */}
                 <Button size="lg" onClick={onUnlock} className="w-full sm:w-auto px-10 py-3 text-lg font-semibold">
                    Unlock Full Itinerary & Details
                 </Button>
                 <p className="text-center text-xs text-muted-foreground mt-3 px-4">
                    Clicking unlocks the detailed day-by-day plan & final pricing options.
                 </p>
            </CardFooter>
        </div>
        {/* Moved the disclaimer outside the card */}
        <p className="text-center text-sm text-muted-foreground mt-6 max-w-xl mx-auto">
            Guide price is an estimate. Further customization and final pricing based on availability and your specific travel dates will be available after unlocking.
        </p>
    </div>
  );
};

export default PreviewDisplay; 