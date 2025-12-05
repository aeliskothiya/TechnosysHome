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

  // Realtime socket listeners
  useEffect(() => {
    if (!socket) return;

    const onNew = (payload) => {
      setIncoming((prev) => {
        if (prev.find((p) => p.bookingId === payload.bookingId)) return prev;
        const newItem = { ...payload, loading: true };
        fetchDetails(payload.bookingId, newItem);
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
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Incoming Booking Requests</h1>
      </div>

      <div className="bg-white shadow rounded p-4">

        {incoming.length === 0 && (
          <p className="text-gray-600">
            No active booking requests. Waiting for customers...
          </p>
        )}

        <ul className="space-y-4">
          {currentIncoming.map((req) => (
            <li key={req.bookingId} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              {req.loading ? (
                <div className="text-center py-4 text-gray-500">
                  Loading details...
                </div>
              ) : req.error ? (
                <div className="text-center py-4 text-red-500">
                  Failed to load details
                </div>
              ) : (
                <>
                  {/* Service */}
                  <div className="flex gap-4 mb-3">
                    {req.service?.image && (
                      <img
                        src={`${backendUrl}${req.service.image}`}
                        alt={req.service.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}

                    <div className="flex-1">
                      <p className="font-semibold text-lg">
                        {req.service?.name}
                      </p>
                     
                      <p className="text-sm text-gray-600">
                        Date: {new Date(req.date).toLocaleDateString()} | Time: {req.timeSlot}
                      </p>

                      {req.coinsRequired !== undefined && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-5 h-5 bg-yellow-300 flex items-center justify-center rounded-full">
                            <span className="text-xs font-bold text-yellow-900">C</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-700">
                            Coins Required: {req.coinsRequired}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer */}
                  {req.customer && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-gray-700">
                        Customer: {req.customer.Name}
                      </p>

                      {req.customer.Address && (
                        <p className="text-sm text-gray-600">
                          Address: {req.customer.Address.houseNumber},{" "}
                          {req.customer.Address.street},{" "}
                          {req.customer.Address.city},{" "}
                          {req.customer.Address.pincode}
                        </p>
                      )}

                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      disabled={accepting === req.bookingId}
                      onClick={() => acceptBooking(req.bookingId)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {accepting === req.bookingId ? "Accepting..." : "Accept Booking"}
                    </button>

                    <button
                      onClick={() =>
                        setIncoming((prev) =>
                          prev.filter((p) => p.bookingId !== req.bookingId)
                        )
                      }
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {/* ⭐ Pagination Bar */}
        {incoming.length > pageSize && (
          <div className="px-6 py-4 border-t bg-gray-50 border-gray-200/50 mt-4 shadow-sm">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}

      </div>
    </div>
  );
};

export default TechnicianDashboard;
