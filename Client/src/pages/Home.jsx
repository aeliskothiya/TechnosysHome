import React from 'react';
import { Navbar } from '../components/Navbar';
import { Header } from '../components/Header';
import CustomerDashboard from "./CustomerDashboard";
export const Home = () => {
  return (
    <div
      className='flex flex-col items-center justify-center min-h-screen bg-[url("/bg_img.png")] bg-cover bg-center'
    >
      <Navbar />
      <CustomerDashboard />
    </div>
  );
};
