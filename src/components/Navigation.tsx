import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import DestinationsPopup from './DestinationsPopup';

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [destinationsPopupOpen, setDestinationsPopupOpen] = React.useState(false);

  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        {/* Temporarily comment out or modify this link */}
        {/* <li><Link to="/destinations">Destinations</Link></li> */}
        <li><Link to="/">Destinations (Temporarily Disabled)</Link></li>
        {/* Other navigation items */}
      </ul>
      {/* Mobile menu destinations link */}
      {mobileMenuOpen && (
        <button 
          onClick={() => {
            setMobileMenuOpen(false);
            setDestinationsPopupOpen(true);
          }}
          className="text-2xl font-serif py-3 w-full text-left flex justify-between items-center"
        >
          Destinations
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      {/* Destinations Popup */}
      {destinationsPopupOpen && (
        <DestinationsPopup onClose={() => setDestinationsPopupOpen(false)} />
      )}
    </nav>
  );
};

export default Navigation; 