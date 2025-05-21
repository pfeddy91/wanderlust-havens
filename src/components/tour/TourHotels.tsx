import React from 'react';

// Define or import your Hotel and HotelImage types
// For example, place these in a file like 'src/types/hotel.ts'
// export interface HotelImage {
//   id: string;
//   image_url: string;
//   alt_text?: string;
// }
//
// export interface Hotel {
//   id: string;
//   name: string;
//   description: string;
//   images: HotelImage[];
//   // city?: string; // If city is a separate field
// }

// Assuming Hotel type is imported or defined elsewhere:
import { Hotel } from '@/types/hotel'; // Adjust path as needed

interface TourHotelsProps {
  hotels?: Hotel[];
  // tourGeminiSummary?: string | null; // REMOVE THIS LINE - No longer needed
}

const TourHotels: React.FC<TourHotelsProps> = ({ hotels }) => { // REMOVE tourGeminiSummary from destructuring
  if (!hotels || hotels.length === 0) {
    // Optionally, you could render a message if there are no hotels
    // return <p className="text-center text-muted-foreground">Hotel information coming soon.</p>;
    return null;
  }

  return (
    <section id="wheretostay" className="py-16 bg-white"> {/* Changed to bg-white to match screenshot context */}
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 uppercase tracking-wider">WHERE TO REST YOUR HEAD</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hotels.map((hotel) => (
            <div key={hotel.id} className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-xl">
              {hotel.images && hotel.images.length > 0 && (
                <div className="w-full h-64 overflow-hidden">
                  <img
                    src={hotel.images[0].image_url}
                    alt={hotel.images[0].alt_text || hotel.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">{hotel.name}</h3>
                <p className="text-gray-600 text-sm mb-4 flex-grow">
                  {/* Use hotel.gemini_short_summary for description */}
                  {hotel.gemini_short_summary && typeof hotel.gemini_short_summary === 'string' 
                    ? (hotel.gemini_short_summary.length > 120 
                        ? `${hotel.gemini_short_summary.substring(0, 117)}...` 
                        : hotel.gemini_short_summary)
                    : 'Summary not available.' /* Fallback if hotel.gemini_short_summary is null/undefined */
                  }
                </p>
                <a
                  href="#" // Replace with actual link to hotel details or booking
                  className="mt-auto text-primary font-medium hover:underline text-xs uppercase tracking-wider self-start"
                >
                  VIEW HOTEL
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TourHotels; 