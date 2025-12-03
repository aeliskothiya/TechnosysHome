import React, { useContext, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { assets } from "../assets/assets";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";
import {
  LayoutDashboard,
  Wrench,
  Users,
  ClipboardList,
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
  User,
  ChevronRight,
  CreditCard,
  Menu,
  X,
  Package,
  FolderOpen,
  Star,
} from "lucide-react";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, userData, setIsLoggedIn, setUserData, backendUrl } =
    useContext(AppContext);
  
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [techDropdownOpen, setTechDropdownOpen] = useState(false);
  const [mobileTechDropdownOpen, setMobileTechDropdownOpen] = useState(false);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest(".user-dropdown-group")) {
        setUserDropdownOpen(false);
      }
      if (!e.target.closest(".mobile-menu-group")) {
        setMobileMenuOpen(false);
      }
      if (!e.target.closest(".tech-dropdown-group")) {
        setTechDropdownOpen(false);
      }
      if (!e.target.closest(".mobile-tech-dropdown-group")) {
        setMobileTechDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Logout function
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
        toast.error(data.message || "Logout failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  };

  // Technician dropdown items
  const technicianItems = [
    { 
      name: "Technician Requests", 
      path: "/admin/technician-requests", 
      icon: <ClipboardList size={18} /> 
    },
    { 
      name: "Technician List", 
      path: "/admin/technicians", 
      icon: <Users size={18} /> 
    },
    { 
      name: "Technician Complaints", 
      path: "/admin/technician-complaints", 
      icon: <MessageSquare size={18} /> 
    },
  ];

  // Check if current path is under technicians
  const isTechnicianActive = technicianItems.some(item => 
    location.pathname === item.path || location.pathname.startsWith(item.path + "/")
  );

  // Navigation items
  const navItems = [
    { name: "Customers", path: "/admin/customers", icon: <Users size={20} /> },
    { name: "Categories", path: "/admin/categories", icon: <FolderOpen size={20} /> },
    { name: "Subscriptions", path: "/admin/subscriptions", icon: <CreditCard size={20} /> },
    { name: "Feedbacks", path: "/admin/feedbacks", icon: <Star size={20} /> },
  ];

  return (
    <>
      {/* Admin Navbar */}
      <div className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-200/50 text-gray-900 fixed top-0 z-50 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <div 
                className="flex items-center cursor-pointer transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/admin/dashboard")}
              >
                <img
                  src={assets.navbarlogo}
                  alt="Logo"
                  className="w-10 h-10"
                />
                <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Technosys
                </span>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex space-x-1">
                {/* Dashboard */}
                {/* <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                        : "text-gray-700 hover:bg-gray-100/80 hover:text-blue-600"
                    }`
                  }
                >
                  <LayoutDashboard size={20} className="mr-2" />
                  Dashboard
                </NavLink> */}

                {/* Technicians Dropdown */}
                <div className="relative tech-dropdown-group">
                  <button
                    onClick={() => setTechDropdownOpen(!techDropdownOpen)}
                    className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 ${
                      isTechnicianActive
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                        : "text-gray-700 hover:bg-gray-100/80 hover:text-blue-600"
                    }`}
                  >
                    <Wrench size={20} className="mr-2" />
                    Technicians
                    <ChevronDown 
                      size={18} 
                      className={`ml-2 transition-transform duration-200 ${
                        techDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown menu */}
                  {techDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 py-2 z-50 animate-scaleIn">
                      {technicianItems.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center px-4 py-3 text-sm transition-all duration-200 ${
                              isActive
                                ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-r-2 border-blue-600 font-semibold"
                                : "text-gray-700 hover:bg-gray-50/80 hover:text-blue-600"
                            }`
                          }
                          onClick={() => setTechDropdownOpen(false)}
                        >
                          <span className="mr-3 text-blue-500">{item.icon}</span>
                          {item.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>

                {/* Other navigation items */}
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

            {/* Right side - User menu */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-gray-100/80 transition-all duration-300 mobile-menu-group"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* User dropdown */}
              <div className="relative user-dropdown-group">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  {userData?.name?.charAt(0).toUpperCase() || <User size={18} />}
                </button>

                {/* Dropdown menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 py-2 z-50 animate-scaleIn">
                    <div className="px-4 py-3 border-b border-gray-200/50">
                      <div className="text-sm font-semibold text-gray-900">{userData?.name}</div>
                      <div className="text-xs text-gray-500 truncate">{userData?.email}</div>
                    </div>
                    
                    {/* <NavLink
                      to="/admin/settings"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50/80 hover:text-blue-600 transition-colors duration-200"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <Settings size={18} className="mr-3" />
                      Settings
                    </NavLink> */}
                    
                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
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

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-white/95 backdrop-blur-sm border-t border-gray-200/50 mobile-menu-group animate-fadeIn">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {/* Dashboard */}
                {/* <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                        : "text-gray-700 hover:bg-gray-100/80 hover:text-blue-600"
                    }`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LayoutDashboard size={20} className="mr-3" />
                  Dashboard
                </NavLink> */}

                {/* Mobile Technicians Dropdown */}
                <div className="mobile-tech-dropdown-group">
                  <button
                    onClick={() => setMobileTechDropdownOpen(!mobileTechDropdownOpen)}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                      isTechnicianActive
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                        : "text-gray-700 hover:bg-gray-100/80 hover:text-blue-600"
                    }`}
                  >
                    <div className="flex items-center">
                      <Wrench size={20} className="mr-3" />
                      Technicians
                    </div>
                    <ChevronRight 
                      size={18} 
                      className={`transition-transform duration-200 ${
                        mobileTechDropdownOpen ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {/* Mobile dropdown menu */}
                  {mobileTechDropdownOpen && (
                    <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
                      {technicianItems.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                              isActive
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                                : "text-gray-700 hover:bg-gray-100/80 hover:text-blue-600"
                            }`
                          }
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setMobileTechDropdownOpen(false);
                          }}
                        >
                          <span className="mr-3 text-blue-500">{item.icon}</span>
                          {item.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>

                {/* Other mobile navigation items */}
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                          : "text-gray-700 hover:bg-gray-100/80 hover:text-blue-600"
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for fixed navbar */}
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

export default AdminSidebar;