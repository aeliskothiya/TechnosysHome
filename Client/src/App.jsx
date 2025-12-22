// import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { Home } from './pages/Home';
// import { Login } from './pages/Login';
// import { EmailVerify } from './pages/EmailVerify';
// import { ResetPassword } from './pages/ResetPassword';
// import { ToastContainer } from 'react-toastify';
// // import 'react-toastify/dist/ReactToastify.css';

// const App = () => {
//   return (
//     <div>
//       <ToastContainer/>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/email-verify" element={<EmailVerify />} />
//        <Route path="/reset-password" element={<ResetPassword />} />
//       </Routes>
//     </div>
//   );
// };

// export default App;

import React, { useEffect, useContext } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Home } from "./pages/Home";
import { Admin } from "./pages/Admin";
import { Login } from "./pages/Login";
import { EmailVerify } from "./pages/EmailVerify";
import { ResetPassword } from "./pages/ResetPassword";
import { ToastContainer } from "react-toastify";
import { AppContext } from "./context/AppContext";
import ServiceOrbitLoader from "./components/ServiceOrbitLoader";
import "react-toastify/dist/ReactToastify.css";
import { Technicion } from "./pages/Technicion";
import { LoginCustomer } from "./pages/LoginCustomer";
import { Customer } from "./pages/Customer";
import { TempPage } from "./pages/TempPage";
import AdminLayout from "./components/AdminLayout";
import TechnicianRequest from "./pages/AdminTechnicianRequest";
import TechnicianDetails from "./pages/TechnicianDetails";
import { AdminCategories } from "./pages/AdminCategories";
import { AdminFeedbacks } from "./pages/AdminFeedbacks";
import { AdminSettings } from "./pages/AdminSettings";
import AdminCustomerList from "./pages/AdminCustomerList";
import AdminTechnicianList from "./pages/AdminTechnicianList";
import TechnicianLayout from "./components/TechnicianLayout";
import TechnicianAvailability from "./pages/TechnicianAvailability";
import TechnicianBookings from "./pages/TechnicianBookings";
import TechnicianSubscription from "./pages/TechnicianSubscription";
import TechnicianFeedbacks from "./pages/TechnicianFeedbacks";
import TechnicianProfile from "./pages/TechnicianProfile";
import TechnicianAnalysis from "./pages/TechnicianAnalysis";
import CustomerProfile from "./pages/CustomerProfile";
import CustomerBookings from "./pages/CustomerBookings";
import CustomerSettings from "./pages/CustomerSettings";
import CustomerLayout from "./components/CustomerLayout";
import CustomerDashboard from "./pages/CustomerDashboard";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import AdminTechnicianCompliant from "./pages/AdminTechnicianCompliant";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import CustomerServiceDetails from "./pages/CustomerServiceDetails";
import ChatPage from "./pages/ChatPage";

// Protected Route Component
const ProtectedRoute = ({ children, role }) => {
  const { isLoggedIn, loadingUser, userData } = useContext(AppContext);

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ServiceOrbitLoader show={true} size={140} />
      </div>
    );
  }
  console.log(
    "ProtectedRoute - isLoggedIn:",
    isLoggedIn,
    "userData:",
    userData
  );

  if (!isLoggedIn) {
    return <Navigate to="/" />;
  }

  // if (role && userData?.role !== role) {
  //   // Redirect to correct dashboard
  //   return <Navigate to={userData?.role === 'admin' ? '/admin' : '/technicion'} />;
  // }

  if (role && userData?.role !== role) {
    // Redirect to correct dashboard based on user role
    if (userData?.role === "admin") return <Navigate to="/admin" />;
    if (userData?.role === "technician") return <Navigate to="/technician" />;
    if (userData?.role === "customer") return <Navigate to="/customer" />;

    return <Navigate to="/" />;
  }

  return children;
};

// Component to handle automatic redirects
const AuthRedirectHandler = () => {
  const { isLoggedIn, loadingUser, userData } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log(
      "AuthRedirectHandler - isLoggedIn:",
      isLoggedIn,
      "loadingUser:",
      loadingUser,
      "pathname:",
      location.pathname
    );

    if (!loadingUser) {
      const publicRoutes = ["/login", "/login-customer", "/reset-password", "/email-verify", "/"];

      // Redirect to login if not authenticated and trying to access protected routes
      if (!isLoggedIn && !publicRoutes.includes(location.pathname)) {
        console.log("Redirecting to login");
        navigate("/");
      }

      if (
        isLoggedIn && publicRoutes.includes(location.pathname)
      ) {
        if (userData?.role === "admin") {
          console.log("Redirecting to admin");

          navigate("/admin/dashboard");
        } 
        if (userData?.role === "technician") {
          console.log("Redirecting to technicain");

          navigate("/technician/dashboard");
        }
        if (userData?.role === "customer") {
          console.log("Redirecting to customer");
          navigate("/customer");
        } 
        // if (!userData?.role) {
        //   console.log("Redirecting to Home");

        //   navigate("/");
        // }
      }
    }
  }, [isLoggedIn, loadingUser, navigate, location.pathname, userData]);

  return null;
};

const App = () => {
  const { isLoggedIn, userData, loadingUser } = useContext(AppContext);

  console.log(
    "App - isLoggedIn:",
    isLoggedIn,
    "userData:",
    userData,
    "loadingUser:",
    loadingUser
  );

  return (
    <div className="App">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <AuthRedirectHandler />
      <Routes>
        {/* 🌐 Public and Auth routes */}
        <Route path="/" element={<Home />} />
         {/* <Route path="/temp" element={<TempPage />} /> */}
        <Route path="/login" element={<Login />} />
        <Route path="/login-customer" element={<LoginCustomer />} />
        <Route path="/email-verify" element={<EmailVerify />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* 🛠️ Protected Admin routes (Sidebar layout) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Nested admin pages shown inside AdminLayout */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Admin />} />
          <Route path="technicians" element={<AdminTechnicianList />} />
          <Route path="technician-requests" element={<TechnicianRequest />} />
          <Route path="technician-complaints" element={<AdminTechnicianCompliant />} />
          <Route path="technicians/:id" element={<TechnicianDetails />} />
          <Route path="customers" element={<AdminCustomerList />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="feedbacks" element={<AdminFeedbacks />} />
          <Route path="settings" element={<AdminSettings />} />

        </Route>

        {/* 👨‍🔧 Technician Panel */}
        <Route
          path="/technician"
          element={
            <ProtectedRoute role="technician">
              <TechnicianLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TechnicianDashboard />} />
          <Route path="availability" element={<TechnicianAvailability />} />
          <Route path="bookings" element={<TechnicianBookings />} />
          <Route path="chat/:bookingId" element={<TechnicianChatWrapper />} />
          <Route path="subscription" element={<TechnicianSubscription />} />
          <Route path="feedbacks" element={<TechnicianFeedbacks />} />
          <Route path="profile" element={<TechnicianProfile />} />
          <Route path="my-analytics" element={<TechnicianAnalysis />} />
        </Route>


        {/* 👥 Customer Panel */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute role="customer">
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="service/:id" element={<CustomerServiceDetails />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="bookings" element={<CustomerBookings />} />
          <Route path="chat/:bookingId" element={<ChatPageWrapper />} />
          <Route path="settings" element={<CustomerSettings />} />
        </Route>



        {/* ⚙️ Temp page (optional) */}
        <Route path="/temp" element={<TempPage />} />

        {/* 🚫 Catch all invalid routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </div>
  );
};

export default App;

// Wrapper to inject bookingId and current user into ChatPage
function ChatPageWrapper() {
  const { userData } = useContext(AppContext);
  const location = useLocation();
  const bookingId = location.pathname.split('/').pop();

  const currentUser = {
    _id: userData?._id || userData?.id,
    role: 'customer',
    name: `${userData?.FirstName || userData?.Name || ''} ${userData?.LastName || ''}`.trim() || 'Customer',
  };

  return <ChatPage bookingId={bookingId} currentUser={currentUser} />;
}

function TechnicianChatWrapper() {
  const { userData } = useContext(AppContext);
  const location = useLocation();
  const bookingId = location.pathname.split('/').pop();

  const currentUser = {
    _id: userData?._id || userData?.id,
    role: 'technician',
    name: userData?.Name || 'Technician',
  };

  return <ChatPage bookingId={bookingId} currentUser={currentUser} />;
}
