// src/components/CustomerLayout.jsx
import React from "react";
import CustomerNavbar from "./CustomerNavbar";
import { Outlet } from "react-router-dom";

const CustomerLayout = () => {
  return (
    <div className="min-h-screen bg-gray-100 font-inter">
      {/* Global Navbar */}
      <CustomerNavbar />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full py-6 px-4 sm:px-6 lg:px-8">
        <Outlet /> {/* Child pages appear here */}
      </main>
    </div>
  );
};

export default CustomerLayout;
