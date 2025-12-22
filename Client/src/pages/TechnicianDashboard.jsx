// // src/pages/TechnicianDashboard.jsx
// import React, { useContext, useEffect, useState } from "react";
// import axios from "axios";
// import { toast } from "react-toastify";
// import { useNavigate } from "react-router-dom";
// import { AppContext } from "../context/AppContext";

// const TechnicianDashboard = () => {
//   const { backendUrl, userData, socket } = useContext(AppContext);
//   const navigate = useNavigate();
//   const [incoming, setIncoming] = useState([]);
//   const [accepting, setAccepting] = useState(null);

//   // Fetch pending requests on mount
//   useEffect(() => {
//     const fetchPending = async () => {
//       try {
//         const { data } = await axios.get(
//           `${backendUrl}/api/bookings/technician/pending`,
//           { withCredentials: true }
//         );
//         if (data.success && Array.isArray(data.requests)) {
//           setIncoming(() => {
//             const seeds = data.requests.map((r) => ({ ...r, loading: true }));
//             seeds.forEach((seed) => fetchDetails(seed.bookingId, seed));
//             return seeds; // newest first handled server-side
//           });
//         }
//       } catch (e) {
//         // silent
//       }
//     };
//     if (userData?.role === "technician") fetchPending();
//   }, [backendUrl, userData?.role]);

//   // Realtime listeners
//   useEffect(() => {
//     if (!socket) return;
//     const onNew = (payload) => {
//       setIncoming((prev) => {
//         if (prev.find((p) => p.bookingId === payload.bookingId)) return prev;
//         const newItem = { ...payload, loading: true };
//         fetchDetails(payload.bookingId, newItem);
//         return [newItem, ...prev];
//       });
//     };
//     const onClosed = ({ bookingId }) =>
//       setIncoming((prev) => prev.filter((p) => p.bookingId !== bookingId));

//     socket.on("new-booking-request", onNew);
//     socket.on("booking-request-closed", onClosed);
//     return () => {
//       socket.off("new-booking-request", onNew);
//       socket.off("booking-request-closed", onClosed);
//     };
//   }, [socket]);

//   const fetchDetails = async (bookingId, existingData) => {
//     try {
//       const { data } = await axios.get(
//         `${backendUrl}/api/bookings/${bookingId}`,
//         { withCredentials: true }
//       );
//       if (data.success) {
//         const booking = data.booking || data.data;
//         const [customerRes, serviceRes] = await Promise.all([
//           axios.get(
//             `${backendUrl}/api/customer-profile/${booking.CustomerID}`,
//             { withCredentials: true }
//           ),
//           axios.get(
//             `${backendUrl}/api/sub-service-categories/${booking.SubCategoryID}`,
//             { withCredentials: true }
//           ),
//         ]);
//         const customer =
//           customerRes.data.data ||
//           customerRes.data.customer ||
//           customerRes.data.UserData ||
//           customerRes.data.user ||
//           customerRes.data;
//         const service =
//           serviceRes.data.subCategory || serviceRes.data.data;
        
//         setIncoming((prev) =>
//           prev.map((item) =>
//             item.bookingId === bookingId
//               ? { 
//                   ...item, 
//                   booking, 
//                   customer, 
//                   service, 
//                   loading: false,
//                   // Preserve coinsRequired from initial data or get from service
//                   coinsRequired: item.coinsRequired !== undefined ? item.coinsRequired : (service?.coinsRequired || 0)
//                 }
//               : item
//           )
//         );
//       }
//     } catch (e) {
//       // console.error('Failed to fetch details:', e);
//       setIncoming((prev) =>
//         prev.map((item) =>
//           item.bookingId === bookingId
//             ? { ...item, loading: false, error: true }
//             : item
//         )
//       );
//     }
//   };

//   const acceptBooking = async (bookingId) => {
//     try {
//       setAccepting(bookingId);
//       const { data } = await axios.post(
//         `${backendUrl}/api/bookings/accept`,
//         { bookingId },
//         { withCredentials: true }
//       );
//       if (data.success) {
//         toast.success(`Booking accepted! ${data.coinsDeducted} coins deducted. New balance: ${data.newBalance}`);
//         setIncoming((prev) => prev.filter((p) => p.bookingId !== bookingId));
        
//         // Emit custom event to notify navbar to refresh wallet
//         window.dispatchEvent(new CustomEvent('walletUpdated', { 
//           detail: { balance: data.newBalance } 
//         }));
//       }
//     } catch (e) {
//       const errorData = e.response?.data;
//       if (errorData?.insufficientCoins) {
//         toast.error(errorData.message || "Insufficient coins. Please purchase a subscription.");
//         // Redirect to subscription page after a short delay
//         setTimeout(() => {
//           navigate("/technician/subscription");
//         }, 2000);
//       } else {
//         toast.error(errorData?.message || "Failed to accept booking");
//       }
//     } finally {
//       setAccepting(null);
//     }
//   };

//   return (
//     <div className="max-w-3xl mx-auto p-6 space-y-6">
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold">Incoming Booking Requests</h1>
//       </div>

//       <div className="bg-white shadow rounded p-4">
//         {incoming.length === 0 && (
//           <p className="text-gray-600">
//             No active booking requests. Waiting for customers to book services...
//           </p>
//         )}
//         <ul className="space-y-4">
//           {incoming.map((req) => (
//             <li
//               key={req.bookingId}
//               className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
//             >
//               {req.loading ? (
//                 <div className="text-center py-4 text-gray-500">
//                   Loading details...
//                 </div>
//               ) : req.error ? (
//                 <div className="text-center py-4 text-red-500">
//                   Failed to load details
//                 </div>
//               ) : (
//                 <>
//                   <div className="flex gap-4 mb-3">
//                     {req.service?.image && (
//                       <img
//                         src={`${backendUrl}${req.service.image}`}
//                         alt={req.service.name}
//                         className="w-20 h-20 rounded-lg object-cover"
//                       />
//                     )}
//                     <div className="flex-1">
//                       <p className="font-semibold text-lg">
//                         {req.service?.name || "Service"}
//                       </p>
//                       <p className="text-sm text-gray-600">
//                         Booking #{req.bookingId.slice(-6)}
//                       </p>
//                       <p className="text-sm text-gray-600">
//                         Date: {new Date(req.date).toLocaleDateString()} | Time: {req.timeSlot}
//                       </p>
//                       {req.coinsRequired !== undefined && (
//                         <div className="flex items-center gap-2 mt-1">
//                           <div className="flex items-center justify-center w-5 h-5 bg-yellow-300 rounded-full">
//                             <span className="text-xs font-bold text-yellow-900">C</span>
//                           </div>
//                           <span className="text-sm font-semibold text-gray-700">Coins Required: {req.coinsRequired}</span>
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   {req.customer && (
//                     <div className="bg-gray-50 rounded-lg p-3 mb-3">
//                       <p className="text-sm font-medium text-gray-700">
//                         Customer: {req.customer.Name || req.customer.FirstName || 'N/A'} {req.customer.LastName || ''}
//                       </p>
//                       {req.customer.Address && (
//                         <p className="text-sm text-gray-600">
//                           Address: {req.customer.Address.houseNumber || req.customer.Address.house_no}, {req.customer.Address.street || req.customer.Address.road}, {req.customer.Address.city || req.customer.Address.town}, {req.customer.Address.pincode || req.customer.Address.postcode}
//                         </p>
//                       )}
//                       {(req.customer.Mobile || req.customer.Phone) && (
//                         <p className="text-sm text-gray-600">
//                           Phone: {req.customer.Mobile || req.customer.Phone}
//                         </p>
//                       )}
//                     </div>
//                   )}

//                   <div className="flex gap-2 justify-end">
//                     <button
//                       disabled={accepting === req.bookingId}
//                       onClick={() => acceptBooking(req.bookingId)}
//                       className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                     >
//                       {accepting === req.bookingId ? "Accepting..." : "Accept Booking"}
//                     </button>
//                     <button
//                       onClick={() =>
//                         setIncoming((prev) =>
//                           prev.filter((p) => p.bookingId !== req.bookingId)
//                         )
//                       }
//                       className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
//                     >
//                       Dismiss
//                     </button>
//                   </div>
//                 </>
//               )}
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// };

// export default TechnicianDashboard;
// src/pages/TechnicianDashboard.jsx
import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Package, 
  CheckCircle, 
  XCircle,
  Inbox,
  Bell,
  Coins
} from "lucide-react";

const TechnicianDashboard = () => {
  const { backendUrl, userData, socket } = useContext(AppContext);
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState([]);
  const [accepting, setAccepting] = useState(null);

  // ⭐ PAGINATION
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(incoming.length / pageSize) || 1;
  const currentIncoming = incoming.slice((page - 1) * pageSize, page * pageSize);

  // ⭐ SAME Pagination Component as Admin & Customer pages
  const Pagination = ({ page, totalPages, onChange }) => {
    const getPages = () => {
      let arr = [];
      arr.push(1);

      if (page > 3) arr.push("...");

      for (let p = page - 1; p <= page + 1; p++) {
        if (p > 1 && p < totalPages) arr.push(p);
      }

      if (page < totalPages - 2) arr.push("...");

      if (totalPages > 1) arr.push(totalPages);

      return arr;
    };

    return (
      <div className="flex items-center justify-center gap-2 mt-6 select-none">

        {/* Prev Button */}
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
            page === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 shadow-sm"
          }`}
        >
          Previous
        </button>

        {/* Dynamic Pages */}
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={i} className="px-3 py-2 text-gray-500">…</span>
          ) : (
            <button
              key={i}
              onClick={() => onChange(p)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm border transition-all ${
                p === page
                  ? "bg-gray-900 text-white shadow-md scale-110 border-gray-900"
                  : "hover:bg-gray-100 text-gray-700 border-gray-300"
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next Button */}
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
            page === totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 shadow-sm"
          }`}
        >
          Next
        </button>

      </div>
    );
  };

  // Fetch pending requests
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/bookings/technician/pending`,
          { withCredentials: true }
        );
        if (data.success && Array.isArray(data.requests)) {
          setIncoming(() => {
            const seeds = data.requests.map((r) => ({ ...r, loading: true }));
            seeds.forEach((seed) => fetchDetails(seed.bookingId, seed));
            return seeds;
          });
        }
      } catch (e) {}
    };
    if (userData?.role === "technician") fetchPending();
  }, [backendUrl, userData?.role]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  // Realtime socket listeners
  useEffect(() => {
    if (!socket) return;

    const showNotification = (payload) => {
      if (Notification.permission === 'granted') {
        const notification = new Notification('New Booking Request!', {
          body: `You have a new service booking request. Click to view details.`,
          icon: '/favicon.ico',
          tag: `booking-${payload.bookingId}`,
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    };

    const onNew = (payload) => {
      setIncoming((prev) => {
        if (prev.find((p) => p.bookingId === payload.bookingId)) return prev;
        const newItem = { ...payload, loading: true };
        fetchDetails(payload.bookingId, newItem);
        
        // Show browser notification
        showNotification(payload);
        
        return [newItem, ...prev];
      });
    };

    const onClosed = ({ bookingId }) =>
      setIncoming((prev) => prev.filter((p) => p.bookingId !== bookingId));

    socket.on("new-booking-request", onNew);
    socket.on("booking-request-closed", onClosed);

    return () => {
      socket.off("new-booking-request", onNew);
      socket.off("booking-request-closed", onClosed);
    };
  }, [socket]);

  const fetchDetails = async (bookingId, existingData) => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/bookings/${bookingId}`,
        { withCredentials: true }
      );

      if (data.success) {
        const booking = data.booking || data.data;

        const [customerRes, serviceRes] = await Promise.all([
          axios.get(
            `${backendUrl}/api/customer-profile/${booking.CustomerID}`,
            { withCredentials: true }
          ),
          axios.get(
            `${backendUrl}/api/sub-service-categories/${booking.SubCategoryID}`,
            { withCredentials: true }
          ),
        ]);

        const customer = customerRes.data.data || customerRes.data.customer;
        const service = serviceRes.data.subCategory || serviceRes.data.data;

        setIncoming((prev) =>
          prev.map((item) =>
            item.bookingId === bookingId
              ? {
                  ...item,
                  booking,
                  customer,
                  service,
                  loading: false,
                  coinsRequired:
                    item.coinsRequired !== undefined
                      ? item.coinsRequired
                      : service?.coinsRequired || 0,
                }
              : item
          )
        );
      }
    } catch (e) {
      setIncoming((prev) =>
        prev.map((item) =>
          item.bookingId === bookingId
            ? { ...item, loading: false, error: true }
            : item
        )
      );
    }
  };

  const acceptBooking = async (bookingId) => {
    try {
      setAccepting(bookingId);

      const { data } = await axios.post(
        `${backendUrl}/api/bookings/accept`,
        { bookingId },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success(
          `Booking accepted! ${data.coinsDeducted} coins deducted. New balance: ${data.newBalance}`
        );

        setIncoming((prev) => prev.filter((p) => p.bookingId !== bookingId));

        window.dispatchEvent(
          new CustomEvent("walletUpdated", {
            detail: { balance: data.newBalance },
          })
        );
      }
    } catch (e) {
      const err = e.response?.data;

      if (err?.insufficientCoins) {
        toast.error(err.message || "Insufficient coins.");
        setTimeout(() => navigate("/technician/subscription"), 2000);
      } else {
        toast.error(err?.message || "Failed to accept booking");
      }
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Incoming Booking Requests
          </h1>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Review and accept service bookings from customers
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
          
          {incoming.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="mb-6">
                <div className="inline-flex p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full">
                  <Inbox className="h-16 w-16 text-gray-400" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                No Active Requests
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                You're all caught up! New booking requests from customers will appear here automatically.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {currentIncoming.map((req) => (
                  <div 
                    key={req.bookingId} 
                    className="p-2.5 md:p-3 hover:bg-gray-50/50 transition-all duration-200"
                  >
                    {req.loading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                          <p className="text-gray-500 text-sm">Loading booking details...</p>
                        </div>
                      </div>
                    ) : req.error ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="p-3 bg-red-100 rounded-full">
                            <XCircle className="h-8 w-8 text-red-600" />
                          </div>
                          <p className="text-red-600 text-sm font-medium">Failed to load booking details</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        
                        {/* Service & Image Section */}
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          {req.service?.image && (
                            <div className="flex-shrink-0">
                              <img
                                src={`${backendUrl}${req.service.image}`}
                                alt={req.service.name}
                                className="w-full sm:w-18 md:w-20 h-18 md:h-20 rounded-lg object-cover shadow-sm border border-gray-200"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0 space-y-1.5">
                            {/* Title Row with Coins Badge */}
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-base md:text-lg font-bold text-gray-900 leading-tight">
                                {req.service?.name || "Service Request"}
                              </h3>
                              {req.coinsRequired !== undefined && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-full border border-yellow-300 shadow-sm flex-shrink-0">
                                  <Coins className="h-4 w-4 text-yellow-700" />
                                  <span className="text-sm font-bold text-yellow-900">{req.coinsRequired}</span>
                                </div>
                              )}
                            </div>

                            {/* Booking Details - Centered Layout */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3">
                              <div className="flex items-center space-x-1.5">
                                <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-lg">
                                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                </div>
                                <span className="text-xs md:text-sm font-medium text-gray-700">
                                  {new Date(req.date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1.5">
                                <div className="flex items-center justify-center w-6 h-6 bg-purple-100 rounded-lg">
                                  <Clock className="h-3.5 w-3.5 text-purple-600" />
                                </div>
                                <span className="text-xs md:text-sm font-medium text-gray-700">{req.timeSlot}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Customer Information Card */}
                        {req.customer && (
                          <div className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-lg p-2.5 border border-blue-100">
                            <div className="flex items-center space-x-1.5 mb-1.5">
                              <User className="h-3.5 w-3.5 text-blue-600" />
                              <h4 className="text-sm font-semibold text-gray-900">Customer Details</h4>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-start space-x-1.5">
                                <User className="h-3.5 w-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs md:text-sm text-gray-700 font-medium">
                                  {req.customer.Name || "N/A"}
                                </p>
                              </div>

                              {req.customer.Address && (
                                <div className="flex items-start space-x-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs md:text-sm text-gray-600">
                                    {req.customer.Address.houseNumber}, {req.customer.Address.street}, {req.customer.Address.city}, {req.customer.Address.pincode}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                          <button
                            disabled={accepting === req.bookingId}
                            onClick={() => acceptBooking(req.bookingId)}
                            className="flex-1 sm:flex-none px-4 md:px-5 py-1.5 md:py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2"
                          >
                            {accepting === req.bookingId ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Accepting...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                <span>Accept Booking</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() =>
                              setIncoming((prev) =>
                                prev.filter((p) => p.bookingId !== req.bookingId)
                              )
                            }
                            className="flex-1 sm:flex-none px-4 md:px-5 py-1.5 md:py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {incoming.length > pageSize && (
                <div className="px-4 md:px-6 py-4 border-t bg-gray-50/50 border-gray-200">
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
