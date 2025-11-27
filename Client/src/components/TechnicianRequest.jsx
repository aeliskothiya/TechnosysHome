// import React, { useState, useEffect, useContext } from 'react';
// import { AppContext } from '../context/AppContext';
// import axios from 'axios';
// import { toast } from 'react-toastify';

// const TechnicianRequest = () => {
//   const { backendUrl, userData } = useContext(AppContext);
//   const [technicians, setTechnicians] = useState([]);
//   const [filter, setFilter] = useState('all');
//   const [loading, setLoading] = useState(true);
//   const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
//   const [rejectReason, setRejectReason] = useState('');
//   const [showRejectModal, setShowRejectModal] = useState(null);

//   useEffect(() => {
//     fetchTechnicians();
//     fetchStats();
//   }, [filter]);

// //   const fetchTechnicians = async () => {
// //     try {
// //       setLoading(true);
// //       const url = filter === 'all'
// //         ? `${backendUrl}/api/admin/technicians`
// //         : `${backendUrl}/api/admin/technicians?status=${filter}`;

// //       const { data } = await axios.get(url, { withCredentials: true });

// //       if (data.success) {
// //         setTechnicians(data.technicians);
// //       }
// //     } catch (error) {
// //       toast.error(error.response?.data?.message || 'Failed to fetch technicians');
// //     } finally {
// //       setLoading(false);
// //     }
// //   };
// const fetchTechnicians = async () => {
//   try {
//     setLoading(true);
//     console.log('Fetching technicians with filter:', filter);

//     const url = filter === 'all'
//       ? `${backendUrl}/api/admin/technicians`
//       : `${backendUrl}/api/admin/technicians?status=${filter}`;

//     console.log('API URL:', url);

//     const { data } = await axios.get(url, {
//       withCredentials: true,
//       timeout: 10000 // 10 second timeout
//     });

//     console.log('API response:', data);

//     if (data.success) {
//       setTechnicians(data.technicians);
//     } else {
//       toast.error(data.message || 'Failed to fetch technicians');
//     }
//   } catch (error) {
//     console.error('Full error details:', error);

//     if (error.response) {
//       // Server responded with error status
//       console.error('Response data:', error.response.data);
//       console.error('Response status:', error.response.status);
//       console.error('Response headers:', error.response.headers);

//       if (error.response.status === 401) {
//         toast.error('Authentication failed. Please login again.');
//       } else if (error.response.status === 403) {
//         toast.error('Access denied. Admin privileges required.');
//       } else {
//         toast.error(error.response.data?.message || 'Failed to fetch technicians');
//       }
//     } else if (error.request) {
//       // Request was made but no response received
//       console.error('No response received:', error.request);
//       toast.error('Network error. Please check your connection.');
//     } else {
//       // Something else happened
//       console.error('Error message:', error.message);
//       toast.error('An unexpected error occurred');
//     }
//   } finally {
//     setLoading(false);
//   }
// };

//   const fetchStats = async () => {
//     try {
//       const { data } = await axios.get(`${backendUrl}/api/admin/stats`, {
//         withCredentials: true
//       });

//       if (data.success) {
//         setStats(data.stats);
//       }
//     } catch (error) {
//       console.error('Failed to fetch stats:', error);
//     }
//   };

//   const handleApprove = async (id) => {
//     try {
//       const { data } = await axios.patch(
//         `${backendUrl}/api/admin/technicians/${id}/approve`,
//         {},
//         { withCredentials: true }
//       );

//       if (data.success) {
//         toast.success('Technician approved successfully');
//         fetchTechnicians();
//         fetchStats();
//       }
//     } catch (error) {
//       toast.error(error.response?.data?.message || 'Failed to approve technician');
//     }
//   };

//   const handleReject = async (id) => {
//     try {
//       const { data } = await axios.patch(
//         `${backendUrl}/api/admin/technicians/${id}/reject`,
//         { reason: rejectReason },
//         { withCredentials: true }
//       );

//       if (data.success) {
//         toast.success('Technician rejected successfully');
//         setShowRejectModal(null);
//         setRejectReason('');
//         fetchTechnicians();
//         fetchStats();
//       }
//     } catch (error) {
//       toast.error(error.response?.data?.message || 'Failed to reject technician');
//     }
//   };

//   const getStatusBadge = (status) => {
//     const styles = {
//       Pending: 'bg-yellow-100 text-yellow-800',
//       Approved: 'bg-green-100 text-green-800',
//       Rejected: 'bg-red-100 text-red-800'
//     };

//     return (
//       <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
//         {status}
//       </span>
//     );
//   };

//   if (userData?.role !== 'admin') {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
//           <p className="text-gray-600">Admin privileges required to view this page.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto">
//         <h1 className="text-3xl font-bold text-gray-900 mb-8">Technician Management</h1>

//         {/* Statistics Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h3 className="text-lg font-semibold text-gray-600">Total</h3>
//             <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h3 className="text-lg font-semibold text-gray-600">Pending</h3>
//             <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h3 className="text-lg font-semibold text-gray-600">Approved</h3>
//             <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
//           </div>
//           <div className="bg-white p-6 rounded-lg shadow">
//             <h3 className="text-lg font-semibold text-gray-600">Rejected</h3>
//             <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
//           </div>
//         </div>

//         {/* Filter Buttons */}
//         <div className="flex space-x-4 mb-6">
//           <button
//             onClick={() => setFilter('all')}
//             className={`px-4 py-2 rounded-lg ${
//               filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
//             }`}
//           >
//             All ({stats.total})
//           </button>
//           <button
//             onClick={() => setFilter('Pending')}
//             className={`px-4 py-2 rounded-lg ${
//               filter === 'Pending' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 border'
//             }`}
//           >
//             Pending ({stats.pending})
//           </button>
//           <button
//             onClick={() => setFilter('Approved')}
//             className={`px-4 py-2 rounded-lg ${
//               filter === 'Approved' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border'
//             }`}
//           >
//             Approved ({stats.approved})
//           </button>
//           <button
//             onClick={() => setFilter('Rejected')}
//             className={`px-4 py-2 rounded-lg ${
//               filter === 'Rejected' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border'
//             }`}
//           >
//             Rejected ({stats.rejected})
//           </button>
//         </div>

//         {/* Technicians Table */}
//         <div className="bg-white rounded-lg shadow overflow-hidden">
//           {loading ? (
//             <div className="p-8 text-center">
//               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//               <p className="mt-4 text-gray-600">Loading technicians...</p>
//             </div>
//           ) : technicians.length === 0 ? (
//             <div className="p-8 text-center">
//               <p className="text-gray-600">No technicians found.</p>
//             </div>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Name
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Email
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Mobile
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Service Category
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Status
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Registered
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Actions
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {technicians.map((tech) => (
//                     <tr key={tech._id}>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm font-medium text-gray-900">{tech.Name}</div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm text-gray-900">{tech.Email}</div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm text-gray-900">{tech.MobileNumber}</div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm text-gray-900">{tech.ServiceCategoryID}</div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         {getStatusBadge(tech.VerifyStatus)}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm text-gray-500">
//                           {new Date(tech.createdAt).toLocaleDateString()}
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                         {tech.VerifyStatus === 'Pending' && (
//                           <div className="flex space-x-2">
//                             <button
//                               onClick={() => handleApprove(tech._id)}
//                               className="text-green-600 hover:text-green-900 bg-green-100 px-3 py-1 rounded"
//                             >
//                               Approve
//                             </button>
//                             <button
//                               onClick={() => setShowRejectModal(tech._id)}
//                               className="text-red-600 hover:text-red-900 bg-red-100 px-3 py-1 rounded"
//                             >
//                               Reject
//                             </button>
//                           </div>
//                         )}
//                         {tech.VerifyStatus !== 'Pending' && (
//                           <span className="text-gray-500">No actions</span>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Reject Modal */}
//       {showRejectModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white p-6 rounded-lg w-full max-w-md">
//             <h3 className="text-lg font-semibold mb-4">Reject Technician</h3>
//             <p className="text-gray-600 mb-4">Please provide a reason for rejection:</p>

//             <textarea
//               value={rejectReason}
//               onChange={(e) => setRejectReason(e.target.value)}
//               placeholder="Reason for rejection..."
//               className="w-full p-3 border border-gray-300 rounded-lg mb-4"
//               rows={3}
//             />

//             <div className="flex justify-end space-x-3">
//               <button
//                 onClick={() => {
//                   setShowRejectModal(null);
//                   setRejectReason('');
//                 }}
//                 className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => handleReject(showRejectModal)}
//                 disabled={!rejectReason.trim()}
//                 className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
//               >
//                 Confirm Reject
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default TechnicianRequest;

import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const TechnicianRequest = () => {
  const { backendUrl, userData } = useContext(AppContext);
  const [technicians, setTechnicians] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchTechnicians();
    fetchStats();
  }, [filter]);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      console.log("Fetching technicians with filter:", filter);

      const url =
        filter === "all"
          ? `${backendUrl}/api/admin/technicians`
          : `${backendUrl}/api/admin/technicians?status=${filter}`;

      console.log("API URL:", url);

      const { data } = await axios.get(url, {
        withCredentials: true,
        timeout: 10000,
      });

      console.log("API response:", data);

      if (data.success) {
        setTechnicians(data.technicians);
      } else {
        toast.error(data.message || "Failed to fetch technicians");
      }
    } catch (error) {
      console.error("Full error details:", error);

      if (error.response) {
        if (error.response.status === 401) {
          toast.error("Authentication failed. Please login again.");
        } else if (error.response.status === 403) {
          toast.error("Access denied. Admin privileges required.");
        } else {
          toast.error(
            error.response.data?.message || "Failed to fetch technicians"
          );
        }
      } else if (error.request) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/admin/technicians/stats`,
        {
          withCredentials: true,
        }
      );

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchTechnicianDetails = async (id) => {
    try {
      // First try to get from existing list
      const existingTech = technicians.find((tech) => tech._id === id);
      if (existingTech) {
        setSelectedTechnician(existingTech);
        setShowDetailsModal(true);
        return;
      }
      const { data } = await axios.get(
        `${backendUrl}/api/admin/technicians/${id}`,
        {
          withCredentials: true,
        }
      );

      if (data.success) {
        setSelectedTechnician(data.technician);
        setShowDetailsModal(true);
      }
    } catch (error) {
      toast.error("Failed to fetch technician details");
    }
  };

  const handleApprove = async (id) => {
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/admin/technicians/${id}/approve`,
        {},
        { withCredentials: true }
      );

      if (data.success) {
        toast.success("Technician approved successfully");

        // ✅ Auto-close modals after approval
        setShowDetailsModal(false);
        setShowRejectModal(null);

        // Refresh list and stats
        fetchTechnicians();
        fetchStats();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to approve technician"
      );
    }
  };

  const handleReject = async (id) => {
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/admin/technicians/${id}/reject`,
        { reason: rejectReason },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success("Technician rejected successfully");

        // ✅ Auto-close all modals after rejection
        setShowRejectModal(null);
        setShowDetailsModal(false);
        setRejectReason("");

        // Refresh data
        fetchTechnicians();
        fetchStats();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to reject technician"
      );
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      Approved: "bg-green-100 text-green-800 border border-green-200",
      Rejected: "bg-red-100 text-red-800 border border-red-200",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  const getActiveStatusBadge = (status) => {
    const styles = {
      Active: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      Deactive: "bg-gray-100 text-gray-800 border border-gray-200",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Function to get photo URL
  // const getPhotoUrl = (photoPath) => {
  //   if (!photoPath) return null;
  //   // If it's already a full URL, return as is
  //   if (photoPath.startsWith('http')) return photoPath;
  //   // If it's a relative path, prepend backend URL
  //   return `${backendUrl}${photoPath}`;
  // };

  // Function to get photo URL - FIXED VERSION
  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;

    // console.log("Original photo path:", photoPath); // Debug log

    // If it's already a full URL, return as is
    if (photoPath.startsWith("http")) return photoPath;

    // If it starts with /uploads, construct the full URL
    if (photoPath.startsWith("/uploads")) {
      const url = `${backendUrl}${photoPath}`;
      // console.log("Constructed photo URL:", url); // Debug log
      return url;
    }

    // If it's just a filename, construct the path
    const url = `${backendUrl}/uploads/photos/${photoPath}`;
    // console.log("Constructed photo URL from filename:", url); // Debug log
    return url;
  };

  // Default avatar component
  // const DefaultAvatar = ({ name, className = "" }) => (
  //   <div
  //     className={`bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold ${className}`}
  //   >
  //     {name?.charAt(0)?.toUpperCase() || "T"}
  //   </div>
  // );
  // Default avatar component - make sure this is correct
  const DefaultAvatar = ({ name, className = "", style = {} }) => (
    <div
      className={`bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold ${className}`}
      style={style}
    >
      {name?.charAt(0)?.toUpperCase() || "T"}
    </div>
  );

  if (userData?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600">
            Admin privileges required to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Technician Management
        </h1>
        <p className="text-gray-600 mb-8">
          Manage technician registrations and account status
        </p>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-600">Total</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-600">Pending</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.pending}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-600">Approved</h3>
            <p className="text-3xl font-bold text-green-600">
              {stats.approved}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-600">Rejected</h3>
            <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: "all", label: "All", count: stats.total },
            { key: "Pending", label: "Pending", count: stats.pending },
            { key: "Approved", label: "Approved", count: stats.approved },
            { key: "Rejected", label: "Rejected", count: stats.rejected },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === item.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        {/* Technicians Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden border">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading technicians...</p>
            </div>
          ) : technicians.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No technicians found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Technician
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {technicians.map((tech) => (
                    <tr key={tech._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            {tech.Photo ? (
                              <div className="relative">
                                <img
                                  src={getPhotoUrl(tech.Photo)}
                                  alt={tech.Name}
                                  className="h-12 w-12 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:border-blue-500 transition-all"
                                  onError={(e) => {
                                    console.error(
                                      "Image failed to load:",
                                      e.target.src
                                    );
                                    // Hide the broken image
                                    e.target.style.display = "none";

                                    // Show default avatar
                                    const parent = e.target.parentElement;
                                    let defaultAvatar =
                                      parent.querySelector(".default-avatar");
                                    if (defaultAvatar) {
                                      defaultAvatar.style.display = "flex";
                                    }
                                  }}
                                />
                                {/* Default avatar - hidden by default */}
                                <DefaultAvatar
                                  name={tech.Name}
                                  className="h-12 w-12 text-lg default-avatar absolute inset-0"
                                  style={{ display: "none" }}
                                />
                              </div>
                            ) : (
                              <DefaultAvatar
                                name={tech.Name}
                                className="h-12 w-12 text-lg"
                              />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">
                              {tech.Name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {tech._id?.toString().slice(-6)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {tech.Email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tech.MobileNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {tech.ServiceCategoryID?.name || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Bank: {tech.BankAccountNo?.slice(-4)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {getStatusBadge(tech.VerifyStatus)}
                          {tech.VerifyStatus === "Approved" && (
                            <div>{getActiveStatusBadge(tech.ActiveStatus)}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(tech.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex flex-col space-y-2">
                          {tech.VerifyStatus === "Pending" && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApprove(tech._id)}
                                className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setShowRejectModal(tech._id)}
                                className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              console.log(
                                "View Details clicked for:",
                                tech._id
                              );
                              fetchTechnicianDetails(tech._id);
                            }}
                            className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Reject Technician Application
            </h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejection. This will be sent to the
              technician.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter detailed reason for rejection..."
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technician Details Modal */}
      {showDetailsModal && selectedTechnician && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Technician Details
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Photo and Basic Info */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="mb-4">
                    {selectedTechnician.Photo ? (
                      <div className="relative">
                        <img
                          src={getPhotoUrl(selectedTechnician.Photo)}
                          alt={selectedTechnician.Name}
                          className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mx-auto"
                          onError={(e) => {
                            console.error(
                              "Details modal image failed to load:",
                              e.target.src
                            );
                            e.target.style.display = "none";
                            const defaultAvatar = document.getElementById(
                              "details-default-avatar"
                            );
                            if (defaultAvatar) {
                              defaultAvatar.style.display = "flex";
                            }
                          }}
                        />
                        <DefaultAvatar
                          id="details-default-avatar"
                          name={selectedTechnician.Name}
                          className="w-32 h-32 text-2xl mx-auto absolute inset-0"
                          style={{ display: "none" }}
                        />
                      </div>
                    ) : (
                      <DefaultAvatar
                        name={selectedTechnician.Name}
                        className="w-32 h-32 text-2xl mx-auto"
                      />
                    )}
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {selectedTechnician.Name}
                  </h4>
                  <p className="text-gray-600">Technician</p>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      {getStatusBadge(selectedTechnician.VerifyStatus)}
                    </div>
                    {selectedTechnician.VerifyStatus === "Approved" && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active:</span>
                        {getActiveStatusBadge(selectedTechnician.ActiveStatus)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents Section */}
                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Documents
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        Profile Photo:
                      </p>
                      {selectedTechnician.Photo ? (
                        <a
                          href={getPhotoUrl(selectedTechnician.Photo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <span>View Photo</span>
                          <svg
                            className="w-4 h-4 ml-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-gray-500 text-sm">
                          Not available
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        ID Proof:
                      </p>
                      {selectedTechnician.IDProof ? (
                        <a
                          href={getPhotoUrl(selectedTechnician.IDProof)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <span>View ID Proof</span>
                          <svg
                            className="w-4 h-4 ml-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-gray-500 text-sm">
                          Not available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Information */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Personal Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Full Name
                        </label>
                        <p className="text-gray-900">
                          {selectedTechnician.Name}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Email Address
                        </label>
                        <p className="text-gray-900">
                          {selectedTechnician.Email}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Mobile Number
                        </label>
                        <p className="text-gray-900">
                          {selectedTechnician.MobileNumber}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Address
                        </label>
                        <p className="text-gray-900">
                          {selectedTechnician.Address || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Professional Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Service Category
                        </label>
                        <p className="text-lg text-gray-900">
                          {selectedTechnician.ServiceCategoryID?.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Bank Account
                        </label>
                        <p className="text-gray-900">
                          {selectedTechnician.BankAccountNo}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          IFSC Code
                        </label>
                        <p className="text-gray-900">
                          {selectedTechnician.IFSCCode}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Verification Status
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-500">
                          Mobile
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            selectedTechnician.isMobileVerified
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedTechnician.isMobileVerified
                            ? "✅ Verified"
                            : "❌ Pending"}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-500">
                          Email
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            selectedTechnician.isEmailVerified
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedTechnician.isEmailVerified
                            ? "✅ Verified"
                            : "❌ Pending"}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-500">
                          Registered
                        </div>
                        <div className="text-sm text-gray-900">
                          {formatDate(selectedTechnician.createdAt)}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-500">
                          Last Updated
                        </div>
                        <div className="text-sm text-gray-900">
                          {formatDate(selectedTechnician.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              {selectedTechnician.VerifyStatus === "Pending" && (
                <>
                  <button
                    onClick={() => handleApprove(selectedTechnician._id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve Technician
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowRejectModal(selectedTechnician._id);
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject Technician
                  </button>
                </>
              )}
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianRequest;
