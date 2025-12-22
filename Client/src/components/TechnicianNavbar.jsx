import React, { useContext, useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
  CalendarCheck,
  Clock,
  Star,
  Layers,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Home,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { assets } from "../assets/assets";

const TechnicianSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, setIsLoggedIn, setUserData, backendUrl, realtimeSubscribe } =
    useContext(AppContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [coinBalance, setCoinBalance] = useState(null);

  // Fetch wallet only once on mount
  useEffect(() => {
    if (!userData?.id) return;

    const fetchWallet = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/user/wallet`, {
          withCredentials: true,
        });

        if (res.data?.success) {
          setCoinBalance(res.data.data?.BalanceCoins ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch wallet", err?.response?.data || err.message);
      }
    };

    fetchWallet();
  }, [userData?.id, backendUrl]); // Only run when user logs in

  // Subscribe to realtime wallet changes
  useEffect(() => {
    if (!userData?.id || !realtimeSubscribe) return;

    // console.log('Setting up wallet realtime subscription for user:', userData.id);

    const unsubscribe = realtimeSubscribe("TechnicianWallet", (payload) => {
      try {
        // console.log('Received TechnicianWallet event:', payload);
        const doc = payload?.doc;
        if (!doc) return;

        const docTechId = String(doc?.TechnicianID || "");
        const currentId = String(userData?.id || "");

        if (docTechId !== currentId) return;

        // Update balance from realtime event
        if (doc?.BalanceCoins !== undefined) {
          setCoinBalance(Number(doc.BalanceCoins));
        }
      } catch (e) {
        console.error("Realtime wallet handler error", e);
      }
    });

    return () => unsubscribe && unsubscribe();
  }, [userData?.id, realtimeSubscribe]);

  // Listen for custom wallet update events (fallback when realtime doesn't work)
  useEffect(() => {
    const handleWalletUpdate = (event) => {
      // console.log('📢 Custom walletUpdated event received:', event.detail);
      if (event.detail?.balance !== undefined) {
        setCoinBalance(Number(event.detail.balance));
      }
    };

    window.addEventListener('walletUpdated', handleWalletUpdate);
    return () => window.removeEventListener('walletUpdated', handleWalletUpdate);
  }, [backendUrl]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".profile-menu")) setProfileMenuOpen(false);
      if (!e.target.closest(".mobile-menu")) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logout
  const logout = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(`${backendUrl}/api/auth/logout`);
      if (data.success) {
        setIsLoggedIn(false);
        setUserData(null);
        navigate("/");
        toast.success("Logged out successfully");
      } else toast.error(data.message || "Logout failed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  };

  const CoinBadge = ({ coins }) => (
    <div className="text-gray-900 bg-gray-900 py-1.5 px-2  rounded-full flex items-center space-x-2 transition-all duration-300 hover:scale-105">
      <div className="w-6 h-6 bg-yellow-300 rounded-full flex items-center justify-center shadow-inner">
        <span className="text-black font-bold text-xs">C</span>
      </div>
      <span className="font-bold text-white text-sm">{Number(coins).toFixed(2)}</span>
    </div>
  );

  // Technician nav items
  const navItems = [
    // { name: "Dashboard", path: "/technician/dashboard", icon: <Home size={20} /> },
    { name: "Availability", path: "/technician/availability", icon: <Clock size={20} /> },
    { name: "Bookings", path: "/technician/bookings", icon: <CalendarCheck size={20} /> },
    { name: "Subscription", path: "/technician/subscription", icon: <CreditCard size={20} /> },
    { name: "Feedback", path: "/technician/feedbacks", icon: <MessageSquare size={20} /> },
    { name: "My Analytics", path: "/technician/my-analytics", icon: <Settings size={20} /> },
  ];

  return (
    <>
      {/* Technician Navbar */}
      <div className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-200/50 text-gray-900 fixed top-0 z-50 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left - Logo & Navigation */}
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <div
                onClick={() => navigate("/technician/dashboard")}
                className="flex items-center cursor-pointer transition-all duration-300 hover:scale-105"
              >
                <img src={assets.navbarlogo} alt="Logo" className="w-10 h-10" />
                <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Technosys
                </span>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex space-x-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                          : "text-gray-700 hover:bg-gray-100/80 hover:text-blue-600"
                      }`
                    }
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Right - Profile menu */}
            <div className="flex items-center space-x-4">
              {/* Coin balance badge */}
              <div className="hidden sm:flex">
                <CoinBadge coins={coinBalance ?? 0} />
              </div>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100/80 transition-all duration-300"
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* Profile menu */}
              <div className="relative profile-menu">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  {userData?.name?.charAt(0).toUpperCase() || <User size={18} />}
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 py-2 z-50 animate-scaleIn">
                    <div className="px-4 py-3 border-b border-gray-200/50">
                      <div className="text-sm font-semibold text-gray-900">{userData?.name}</div>
                      <div className="text-xs text-gray-500 truncate">{userData?.email}</div>
                    </div>
                    
                    <NavLink
                      to="/technician/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-600 transition-colors duration-200"
                    >
                      <User size={18} className="mr-3" />
                      Profile
                    </NavLink>
                    
                    {/* <NavLink
                      to="/technician/my-analytics"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-600 transition-colors duration-200"
                    >
                      <Settings size={18} className="mr-3" />
                      Settings
                    </NavLink> */}
                    
                    <button
                      onClick={() => {
                        logout();
                        setProfileMenuOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-red-50/80 hover:text-red-600 border-t border-gray-200/50 transition-colors duration-200"
                    >
                      <LogOut size={18} className="mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="lg:hidden bg-white/95 backdrop-blur-sm border-t border-gray-200/50 mobile-menu animate-fadeIn">
              <div className="px-2 py-4 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                          : "text-gray-700 hover:bg-gray-100/80 hover:text-blue-600"
                      }`
                    }
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </NavLink>
                ))}
                
                {/* Mobile Coin Balance - show only on extra-small screens when the top navbar coin is hidden */}
                <div className="px-4 py-3 border-t border-gray-200/50 mt-4 sm:hidden">
                  <div className="flex justify-center">
                    <CoinBadge coins={coinBalance ?? 0} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="h-16"></div>

      {/* Add custom animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default TechnicianSidebar;