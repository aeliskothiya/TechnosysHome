import React, { useContext, useState, useEffect, useRef } from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

export const Navbar = () => {
  const navigate = useNavigate();
  const { isLoggedIn, userData, setIsLoggedIn, setUserData, backendUrl } =
    useContext(AppContext);

  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const loginDropdownRef = useRef();

  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(`${backendUrl}/api/auth/logout`);
      if (data.success) {
        setIsLoggedIn(false);
        setUserData(null);
        navigate("/");
        toast.success("Logged out successfully");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  // close login dropdown on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(e.target)) {
        setLoginDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg border-b border-gray-200/50 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-105"
              onClick={() => handleNavigation("/")}
            >
              <img
                src={assets.navbarlogo}
                className="w-10 h-10 rounded-full object-cover"
                alt="Logo"
              />
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden md:block">
                Technosys
              </span>
            </div>

            <div className="flex items-center gap-4">
              {isLoggedIn && userData ? (
                <button
                  onClick={logout}
                  className="flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2 text-red-600 hover:bg-red-50 transition-all"
                >
                  Logout
                </button>
              ) : (
                <div className="relative" ref={loginDropdownRef}>
                  <button
                    onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                    className="flex items-center gap-2 border border-gray-500 rounded-full px-6 py-2 text-gray-800 hover:bg-gray-100 transition-all shadow-sm"
                  >
                    Login
                    <img src={assets.arrow_icon} alt="Arrow" className="w-4 h-4" />
                  </button>

                  {loginDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <button
                        onClick={() => {
                          handleNavigation('/login');
                          setLoginDropdownOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      >
                        Login as Technician
                      </button>
                      <button
                        onClick={() => {
                          handleNavigation('/login-customer');
                          setLoginDropdownOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-t border-gray-100"
                      >
                        Login as Customer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </header>

      <div className="h-20" />
    </>
  );
};

export default Navbar;
