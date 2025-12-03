import React, { useEffect, useState, useContext, useRef } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const CustomerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const { userData, backendUrl, socket } = useContext(AppContext);
  const navigate = useNavigate();
  const processedAutoCancels = useRef(new Set());

  // ⭐ PAGINATION (Admin-style)
  const [page, setPage] = useState(1);
  const pageSize = 4;
  const totalPages = Math.ceil(bookings.length / pageSize) || 1;
  const currentBookings = bookings.slice((page - 1) * pageSize, page * pageSize);

  // ⭐ SAME Pagination Component from Admin side
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

        {/* Dynamic Buttons */}
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

  const fetchBookings = async () => {
    try {
      const customerId = userData?._id || userData?.id;
      const { data } = await axios.get(
        `${backendUrl}/api/bookings/customer/${customerId}`,
        { withCredentials: true }
      );
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?._id || userData?.id) fetchBookings();
  }, [userData, backendUrl]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-cancel system
  useEffect(() => {
    if (!bookings?.length) return;

    const expiredPending = bookings.filter(b => {
      if (b.Status !== "Pending") return false;
      const bookingTime = new Date(b.createdAt);
      const diffMs = (10 * 60 * 1000) - (currentTime - bookingTime);
      return diffMs <= 0 && !processedAutoCancels.current.has(String(b._id));
    });

    expiredPending.forEach(async (b) => {
      try {
        processedAutoCancels.current.add(String(b._id));

        await axios.post(
          `${backendUrl}/api/bookings/auto-cancel`,
          { bookingId: b._id },
          { withCredentials: true }
        );

        setBookings(prev =>
          prev.map(x =>
            String(x._id) === String(b._id)
              ? { ...x, Status: 'AutoCancelled' }
              : x
          )
        );

        fetchBookings();
      } catch (err) {
        processedAutoCancels.current.delete(String(b._id));
        console.error("Auto-cancel trigger failed", err);
      }
    });
  }, [currentTime, bookings, backendUrl]);

  useEffect(() => {
    if (!socket) return;

    const handleBookingAccepted = ({ bookingId, technicianId, status }) => {
      toast.success("A technician has accepted your booking!");

      setBookings(prev =>
        prev.map(b =>
          String(b._id) === String(bookingId)
            ? { ...b, Status: status, TechnicianID: technicianId }
            : b
        )
      );

      fetchBookings();
    };

    const handleBookingAutoCancelled = ({ bookingId, message }) => {
      toast.error(message || "Your booking was automatically cancelled.");

      setBookings(prev =>
        prev.map(b =>
          String(b._id) === String(bookingId)
            ? { ...b, Status: "AutoCancelled" }
            : b
        )
      );

      fetchBookings();
    };

    socket.on("booking-accepted", handleBookingAccepted);
    socket.on("booking-auto-cancelled", handleBookingAutoCancelled);

    return () => {
      socket.off("booking-accepted", handleBookingAccepted);
      socket.off("booking-auto-cancelled", handleBookingAutoCancelled);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-gray-500">
        Loading your bookings...
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center text-center min-h-[70vh] bg-white px-6">

        <div className="w-full max-w-2xl border-b border-gray-200 flex justify-between items-center pb-2 mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-700 hover:text-gray-900">
            <ArrowLeft className="mr-2" size={18} />
            <span className="font-semibold">My Bookings</span>
          </button>

          <button onClick={() => navigate("/help")} className="flex items-center gap-1 px-3 py-1 text-sm text-purple-700 border border-purple-200 rounded-md hover:bg-purple-50">
            <HelpCircle size={15} />
            Help
          </button>
        </div>

        <h2 className="text-lg font-semibold text-gray-800">No bookings yet.</h2>
        <p className="text-gray-500 mt-2">Looks like you haven’t experienced quality services at home.</p>

        <button onClick={() => navigate("/customer/services")} className="mt-4 text-purple-700 font-medium hover:underline flex items-center gap-1">
          Explore our services →
        </button>

      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      Pending: { icon: Clock, color: "text-yellow-700 bg-yellow-50 border-yellow-200", text: "Pending" },
      Confirmed: { icon: CheckCircle, color: "text-green-700 bg-green-50 border-green-200", text: "Confirmed" },
      Cancelled: { icon: XCircle, color: "text-red-700 bg-red-50 border-red-200", text: "Cancelled" },
      AutoCancelled: { icon: XCircle, color: "text-orange-700 bg-orange-50 border-orange-200", text: "Auto-Cancelled" },
      Completed: { icon: CheckCircle, color: "text-blue-700 bg-blue-50 border-blue-200", text: "Completed" },
    };

    const cfg = statusConfig[status] || statusConfig["Pending"];
    const Icon = cfg.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
        <Icon size={14} /> {cfg.text}
      </span>
    );
  };

  const canCancel = (booking) => {
    if (booking.Status !== "Pending") return false;
    const bookingTime = new Date(booking.createdAt);
    const diffMinutes = (currentTime - bookingTime) / (1000 * 60);
    return diffMinutes <= 10;
  };

  const getTimeRemaining = (booking) => {
    if (booking.Status !== "Pending") return null;

    const bookingTime = new Date(booking.createdAt);
    const diffMs = 10 * 60 * 1000 - (currentTime - bookingTime);
    if (diffMs <= 0) return null;

    const m = Math.floor(diffMs / 60000);
    const s = Math.floor((diffMs % 60000) / 1000);

    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleCancel = async (bookingId) => {
    // Deprecated: confirmation handled by modal. Keep for backward compatibility.
    openCancelModalById(bookingId);
  };

  const openCancelModal = (booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const openCancelModalById = (bookingId) => {
    const booking = bookings.find(b => String(b._id) === String(bookingId));
    if (booking) openCancelModal(booking);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setSelectedBooking(null);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;
    setCancelling(true);
    try {
      await axios.post(`${backendUrl}/api/bookings/cancel`, { bookingId: selectedBooking._id }, { withCredentials: true });
      toast.success("Booking cancelled successfully");
      closeCancelModal();
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow mt-6">

      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-700 hover:text-gray-900">
          <ArrowLeft className="mr-2" size={20} />
          <h2 className="text-2xl font-bold text-gray-800">My Bookings</h2>
        </button>
      </div>

      <div className="space-y-4">
        {currentBookings.map((booking) => (
          <div key={booking._id} className="p-5 border border-gray-200 rounded-lg hover:shadow-md transition flex gap-4">

            {booking.SubCategoryID?.image && (
              <img
                src={`${backendUrl}${booking.SubCategoryID.image}`}
                alt={booking.SubCategoryID.name}
                className="w-24 h-24 object-cover rounded-md"
              />
            )}

            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">
                    {booking.SubCategoryID?.name || "Service"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    ₹{booking.SubCategoryID?.price || booking.TotalAmount}
                  </p>
                </div>
                {getStatusBadge(booking.Status)}
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Date:</strong> {new Date(booking.Date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
                <p><strong>Time:</strong> {booking.TimeSlot}</p>

                {booking.CustomerID?.Address && (
                  <p>
                    <strong>Address:</strong>{" "}
                    {booking.CustomerID.Address.houseNumber || booking.CustomerID.Address.house_no},{" "}
                    {booking.CustomerID.Address.street || booking.CustomerID.Address.road},{" "}
                    {booking.CustomerID.Address.city || booking.CustomerID.Address.town},{" "}
                    {booking.CustomerID.Address.pincode || booking.CustomerID.Address.postcode}
                  </p>
                )}

                {booking.TechnicianID && (
                  <p>
                    <strong>Technician:</strong> {booking.TechnicianID.Name} ({booking.TechnicianID.MobileNumber})
                  </p>
                )}
              </div>

              <div className="mt-3 flex gap-2 items-center">
                {canCancel(booking) && (
                  <>
                    <button
                      onClick={() => openCancelModal(booking)}
                      className="px-4 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition"
                    >
                      Cancel Booking
                    </button>

                    {getTimeRemaining(booking) && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Clock size={12} /> {getTimeRemaining(booking)} remaining
                      </span>
                    )}
                  </>
                )}

                {booking.Status === "Pending" && !canCancel(booking) && (
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> Cancellation window expired
                  </span>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* ⭐ Admin-style Pagination */}
      {bookings.length > pageSize && (
        <div className="px-6 py-4 border-t border-gray-200/50">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedBooking && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={closeCancelModal}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Confirm Cancellation</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel the booking for <strong>{selectedBooking.SubCategoryID?.name || 'this service'}</strong>?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={closeCancelModal}
                className="px-4 py-2 rounded-md border bg-white text-gray-700"
              >
                Keep Booking
              </button>

              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className={`px-4 py-2 rounded-md text-white ${cancelling ? 'bg-red-400' : 'bg-red-600'}`}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerBookings;
