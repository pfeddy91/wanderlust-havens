import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header'; // Assuming Header is in the same directory
import Footer from './Footer'; // Assuming Footer is in the same directory
import { Toaster } from "@/components/ui/toaster"; // Add import
import { Toaster as Sonner } from "@/components/ui/sonner"; // Add import

const Layout: React.FC = () => {
  const location = useLocation();

  // Define the path where the header and footer should be hidden
  const isPlannerPage = location.pathname === '/planner'; 
  // You can add more paths here later if needed: 
  // const pathsToHideLayout = ['/planner', '/another-fullscreen-page'];
  // const hideLayout = pathsToHideLayout.includes(location.pathname);

  return (
    // The main div doesn't need flex/min-h-screen if Planner handles its own height
    // and other pages rely on Header/Footer structure. Let's simplify.
    <> 
      {/* Conditionally render Header, Footer, and Toasters */}
      {!isPlannerPage && (
        <>
          <Header />
          <main className="flex-grow"> 
            <Outlet />
          </main>
          <Footer />
          <Toaster /> 
          <Sonner /> 
        </>
      )}

      {/* If it IS the planner page, render only the Outlet */}
      {isPlannerPage && (
         <Outlet /> // Outlet renders PlannerPage -> AiPlannerContainer -> PlannerLandingPage (which has min-h-screen)
      )}
    </>
  );
};

export default Layout;