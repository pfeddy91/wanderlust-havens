
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-travel-cream px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-6xl md:text-8xl font-serif font-medium text-travel-green mb-6">404</h1>
        <p className="text-2xl md:text-3xl text-travel-gray mb-8">
          This destination isn't on our map yet.
        </p>
        <p className="text-travel-gray mb-8">
          The page you're looking for doesn't exist or has been moved to another location.
        </p>
        <Button 
          className="bg-travel-coral hover:bg-travel-coral/90 text-white rounded-sm inline-flex items-center px-6 py-4"
          onClick={() => window.location.href = '/'}
        >
          <Home className="h-5 w-5 mr-2" />
          Return Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
