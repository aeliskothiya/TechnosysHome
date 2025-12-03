import React from 'react';
import { Navbar } from '../components/Navbar';
import CustomerDashboard from "./CustomerDashboard";

export const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      
      {/* Navbar fixed at top */}
      <Navbar />

      {/* Prevent overlap with navbar */}
      <div className="pt-10">
        <CustomerDashboard />
      </div>

    </div>
  );
};
