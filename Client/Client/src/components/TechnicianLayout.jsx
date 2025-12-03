import React from "react";
import TechnicianSidebar from "./TechnicianNavbar";
import { Outlet } from "react-router-dom";

const TechnicianLayout = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <TechnicianSidebar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Outlet /> {/* 👈 This is where nested technician pages render */}
        </div>
      </div>
    </div>
  );
};

export default TechnicianLayout;
