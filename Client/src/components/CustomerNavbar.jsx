import React, { useContext, useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  LogOut,
  Settings,
  History,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets";

const backendUrl = "http://localhost:4000";

const CustomerNavbar = () => {
  const navigate = useNavigate();
  const { userData, setIsLoggedIn, setUserData } = useContext(AppContext);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef();
  const mobileMenuRef = useRef();

  // Logout
  const logout = async () => {
    try {
      await axios.post(
        `${backendUrl}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch {}

    setIsLoggedIn(false);
    setUserData(null);
    setMobileMenuOpen(false);
    setProfileOpen(false);
    // Redirect to the customer login page (client-side) so app routing stays consistent
    navigate("/");
    
  };

  // Navigation & close menus
  const handleNavigation = (path) => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
    navigate(path);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }

      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target) &&
        mobileMenuOpen
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileMenuOpen]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg border-b border-gray-200/50 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-between">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-105"
              onClick={() => handleNavigation("/customer/dashboard")}
            >
              <img
                src={assets.navbarlogo}
                className="w-10 h-10 rounded-full object-cover"
                alt="Technosys Logo"
              />
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden md:block">
                Technosys
              </span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Desktop Profile */}
              <div className="hidden md:block relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center font-semibold shadow-md">
                    {userData?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-gray-600 transition-transform duration-200 ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-2xl py-2 animate-scaleIn z-50">
                    <div className="px-4 py-3 border-b border-gray-200/50">
                      <p className="font-semibold text-gray-900 truncate">
                        {userData?.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {userData?.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => handleNavigation("/customer/profile")}
                        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-blue-50 text-gray-700 transition-all"
                      >
                        <User size={18} className="text-blue-500" /> Profile
                      </button>
                      <button
                        onClick={() => handleNavigation("/customer/bookings")}
                        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-blue-50 text-gray-700 transition-all"
                      >
                        <History size={18} className="text-blue-500" /> My
                        Bookings
                      </button>
                      {/* <button
                        onClick={() => handleNavigation("/customer/settings")}
                        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-blue-50 text-gray-700 transition-all"
                      >
                        <Settings size={18} className="text-blue-500" />{" "}
                        Settings
                      </button> */}
                    </div>

                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 border-t border-gray-200/50 transition-all"
                    >
                      <LogOut size={18} /> Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-200"
              >
                {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden absolute top-20 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 shadow-xl animate-fadeIn"
          >
            <div className="px-6 py-4 border-b border-gray-200/50 bg-gray-50/60">
              <p className="font-semibold text-gray-900">{userData?.name}</p>
              <p className="text-sm text-gray-500">{userData?.email}</p>
            </div>

            <div className="py-2">
              <button
                onClick={() => handleNavigation("/customer/profile")}
                className="flex w-full items-center gap-4 px-6 py-3 border-b border-gray-200/50 text-gray-700 hover:bg-blue-50 transition-all"
              >
                <User size={20} /> Profile
              </button>
              <button
                onClick={() => handleNavigation("/customer/bookings")}
                className="flex w-full items-center gap-4 px-6 py-3 border-b border-gray-200/50 text-gray-700 hover:bg-blue-50 transition-all"
              >
                <History size={20} /> My Bookings
              </button>
              <button
                onClick={() => handleNavigation("/customer/settings")}
                className="flex w-full items-center gap-4 px-6 py-3 border-b border-gray-200/50 text-gray-700 hover:bg-blue-50 transition-all"
              >
                <Settings size={20} /> Settings
              </button>
              <button
                onClick={logout}
                className="flex w-full items-center gap-4 px-6 py-3 text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut size={20} /> Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="h-20" />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.25s ease-out; }
      `}</style>
    </>
  );
};

export default CustomerNavbar;
