// import React, { useContext, useState } from "react";
// import { NavLink, useNavigate, useLocation } from "react-router-dom";
// import { assets } from "../assets/assets";
// import { AppContext } from "../context/AppContext";
// import { toast } from "react-toastify";
// import axios from "axios";
// import {
//   LayoutDashboard,
//   Wrench,
//   Users,
//   ClipboardList,
//   MessageSquare,
//   Settings,
//   LogOut,
//   ChevronDown,
//   User,
// } from "lucide-react";

// const AdminSidebar = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { isLoggedIn, userData, setIsLoggedIn, setUserData, backendUrl } =
//     useContext(AppContext);
  
//   const [userDropdownOpen, setUserDropdownOpen] = useState(false);
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

//   // Close dropdowns when clicking outside
//   React.useEffect(() => {
//     const handleClick = (e) => {
//       if (!e.target.closest(".user-dropdown-group")) {
//         setUserDropdownOpen(false);
//       }
//       if (!e.target.closest(".mobile-menu-group")) {
//         setMobileMenuOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClick);
//     return () => document.removeEventListener("mousedown", handleClick);
//   }, []);

//   // Logout function
//   const logout = async () => {
//     try {
//       axios.defaults.withCredentials = true;
//       const { data } = await axios.post(`${backendUrl}/api/auth/logout`);
//       if (data.success) {
//         setIsLoggedIn(false);
//         setUserData(null);
//         navigate("/login");
//         toast.success("Logged out successfully");
//       } else {
//         toast.error(data.message || "Logout failed");
//       }
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Logout failed");
//     }
//   };

//   // Navigation items
//   const navItems = [
//     // { name: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
//     { name: "Technicians", path: "/admin/technicians", icon: <Wrench size={18} /> },
//     { name: "Customers", path: "/admin/customers", icon: <Users size={18} /> },
//     { name: "Categories", path: "/admin/categories", icon: <ClipboardList size={18} /> },
//     { name: "Feedbacks", path: "/admin/feedbacks", icon: <MessageSquare size={18} /> },
//   ];

//   return (
//     <>
//       {/* Admin Navbar */}
//       <div className="w-full bg-gray-900 text-white shadow-lg fixed top-0 z-50">
//         {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> */}
//         <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">

//           <div className="flex justify-between items-center h-16">
//             {/* Left side - Logo and Navigation */}
//             <div className="flex items-center">
//               {/* Logo */}
//               <div 
//                 className="flex items-center cursor-pointer mr-8"
//                 onClick={() => navigate("/admin/dashboard")}
//               >
//                 <img
//                   src={assets.navbarlogo}
//                   alt="Logo"
//                   className="w-10 h-10"
//                 />
//                 {/* <span className="ml-3 text-xl font-bold text-white">
//                   Technosys Admin
//                 </span> */}
//               </div>

//               {/* Desktop Navigation */}
//               <nav className="hidden md:flex space-x-1">
//                 {navItems.map((item) => (
//                   <NavLink
//                     key={item.name}
//                     to={item.path}
//                     className={({ isActive }) =>
//                       `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
//                         isActive
//                           ? "bg-blue-600 text-white shadow-md"
//                           : "text-gray-300 hover:bg-gray-800 hover:text-white"
//                       }`
//                     }
//                   >
//                     <span className="mr-2">{item.icon}</span>
//                     {item.name}
//                   </NavLink>
//                 ))}
//               </nav>
//             </div>

//             {/* Right side - User menu */}
//             <div className="flex items-center space-x-4">
//               {/* Mobile menu button */}
//               <button
//                 onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
//                 className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white mobile-menu-group"
//               >
//                 <svg
//                   className="h-6 w-6"
//                   stroke="currentColor"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth="2"
//                     d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
//                   />
//                 </svg>
//               </button>

//               {/* User dropdown */}
//               <div className="relative user-dropdown-group">
//                 <button
//                   onClick={() => setUserDropdownOpen(!userDropdownOpen)}
//                   className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white p-1 hover:bg-gray-800 transition-colors"
//                 >
//                   <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-sm">
//                     {userData?.name?.charAt(0).toUpperCase() || <User size={16} />}
//                   </div>
//                   {/* <span className="hidden lg:block text-gray-300"> */}
//                     {/* {userData?.name || "Admin"} */}
//                   {/* </span> */}
//                   {/* <ChevronDown size={16} className="text-gray-400" /> */}
//                 </button>

//                 {/* Dropdown menu */}
//                 {userDropdownOpen && (
//                   <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
//                     <NavLink
//                       to="/admin/settings"
//                       className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
//                       onClick={() => setUserDropdownOpen(false)}
//                     >
//                       <Settings size={16} className="mr-3" />
//                       Settings
//                     </NavLink>
//                     <button
//                       onClick={() => {
//                         logout();
//                         setUserDropdownOpen(false);
//                       }}
//                       className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors border-t border-gray-100"
//                     >
//                       <LogOut size={16} className="mr-3" />
//                       Logout
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Mobile Navigation Menu */}
//           {mobileMenuOpen && (
//             <div className="md:hidden bg-gray-800 border-t border-gray-700 mobile-menu-group">
//               <div className="px-2 pt-2 pb-3 space-y-1">
//                 {navItems.map((item) => (
//                   <NavLink
//                     key={item.name}
//                     to={item.path}
//                     className={({ isActive }) =>
//                       `flex items-center px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
//                         isActive
//                           ? "bg-blue-600 text-white shadow-md"
//                           : "text-gray-300 hover:bg-gray-700 hover:text-white"
//                       }`
//                     }
//                     onClick={() => setMobileMenuOpen(false)}
//                   >
//                     <span className="mr-3">{item.icon}</span>
//                     {item.name}
//                   </NavLink>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Spacer for fixed navbar */}
//       <div className="h-16"></div>
//     </>
//   );
// };

// export default AdminSidebar;

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
        navigate("/login");
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
      icon: <ClipboardList size={16} /> 
    },
    { 
      name: "Technician List", 
      path: "/admin/technicians", 
      icon: <Users size={16} /> 
    },
    { 
      name: "Technician Complaints", 
      path: "/admin/technician-complaints", 
      icon: <MessageSquare size={16} /> 
    },
  ];

  // Check if current path is under technicians
  const isTechnicianActive = technicianItems.some(item => 
    location.pathname === item.path || location.pathname.startsWith(item.path + "/")
  );

  // Navigation items
  const navItems = [
    { name: "Customers", path: "/admin/customers", icon: <Users size={18} /> },
    { name: "Categories", path: "/admin/categories", icon: <ClipboardList size={18} /> },
    { name: "Feedbacks", path: "/admin/feedbacks", icon: <MessageSquare size={18} /> },
  ];

  return (
    <>
      {/* Admin Navbar */}
      <div className="w-full bg-gray-900 text-white shadow-lg fixed top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center">
              {/* Logo */}
              <div 
                className="flex items-center cursor-pointer mr-8"
                onClick={() => navigate("/admin/dashboard")}
              >
                <img
                  src={assets.navbarlogo}
                  alt="Logo"
                  className="w-10 h-10"
                />
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-1">
                {/* Technicians Dropdown */}
                <div className="relative tech-dropdown-group">
                  <button
                    onClick={() => setTechDropdownOpen(!techDropdownOpen)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isTechnicianActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <Wrench size={18} className="mr-2" />
                    Technicians
                    <ChevronDown 
                      size={16} 
                      className={`ml-2 transition-transform duration-200 ${
                        techDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown menu */}
                  {techDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg py-2 z-50 border border-gray-200">
                      {technicianItems.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center px-4 py-2 text-sm transition-colors ${
                              isActive
                                ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            }`
                          }
                          onClick={() => setTechDropdownOpen(false)}
                        >
                          <span className="mr-3">{item.icon}</span>
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
                      `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
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
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white mobile-menu-group"
              >
                <svg
                  className="h-6 w-6"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                  />
                </svg>
              </button>

              {/* User dropdown */}
              <div className="relative user-dropdown-group">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white p-1 hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-sm">
                    {userData?.name?.charAt(0).toUpperCase() || <User size={16} />}
                  </div>
                </button>

                {/* Dropdown menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <NavLink
                      to="/admin/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <Settings size={16} className="mr-3" />
                      Settings
                    </NavLink>
                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors border-t border-gray-100"
                    >
                      <LogOut size={16} className="mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-gray-800 border-t border-gray-700 mobile-menu-group">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {/* Mobile Technicians Dropdown */}
                <div className="mobile-tech-dropdown-group">
                  <button
                    onClick={() => setMobileTechDropdownOpen(!mobileTechDropdownOpen)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                      isTechnicianActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <Wrench size={18} className="mr-3" />
                      Technicians
                    </div>
                    <ChevronRight 
                      size={16} 
                      className={`transition-transform duration-200 ${
                        mobileTechDropdownOpen ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {/* Mobile dropdown menu */}
                  {mobileTechDropdownOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-600 pl-2">
                      {technicianItems.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? "bg-blue-600 text-white shadow-md"
                                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                            }`
                          }
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setMobileTechDropdownOpen(false);
                          }}
                        >
                          <span className="mr-3">{item.icon}</span>
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
                      `flex items-center px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
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
    </>
  );
};

export default AdminSidebar;