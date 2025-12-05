import React, { useEffect, useState, useContext, useRef } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, HelpCircle, Star, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import FeedbackModal from "../components/FeedbackModal";
import ComplaintModal from "../components/ComplaintModal";
import BookingTracker from "../components/BookingTracker";

const CustomerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [selectedBookingForFeedback, setSelectedBookingForFeedback] = useState(null);
  const [feedbackData, setFeedbackData] = useState({});
  const [complaintData, setComplaintData] = useState({});
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
      
      // Fetch feedback and complaints for completed bookings
      const completedBookings = data.bookings.filter(b => b.Status === 'Completed');
      completedBookings.forEach(booking => {
        fetchFeedbackForBooking(booking._id);
        fetchComplaintForBooking(booking._id);
      });
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackForBooking = async (bookingId) => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/feedback/${bookingId}`,
        { withCredentials: true }
      );
      if (data.success && data.feedback) {
        setFeedbackData(prev => ({ ...prev, [bookingId]: data.feedback }));
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  const fetchComplaintForBooking = async (bookingId) => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/complaints/${bookingId}`,
        { withCredentials: true }
      );
      if (data.success && data.complaint) {
        setComplaintData(prev => ({ ...prev, [bookingId]: data.complaint }));
      }
    } catch (error) {
      console.error('Error fetching complaint:', error);
    }
  };

  const handleOpenFeedbackModal = (booking) => {
    setSelectedBookingForFeedback(booking);
    setShowFeedbackModal(true);
  };

  const handleOpenComplaintModal = (booking) => {
    setSelectedBookingForFeedback(booking);
    setShowComplaintModal(true);
  };

  const handleFeedbackSuccess = (feedback) => {
    setFeedbackData(prev => ({ ...prev, [feedback.BookingID]: feedback }));
  };

  const handleComplaintSuccess = (complaint) => {
    setComplaintData(prev => ({ ...prev, [complaint.BookingID]: complaint }));
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

    const handleServiceStarted = ({ bookingId, status, message }) => {
      toast.success(message || "Technician has arrived and service is in progress!");

      setBookings(prev =>
        prev.map(b =>
          String(b._id) === String(bookingId)
            ? { ...b, Status: status, arrivalVerified: true }
            : b
        )
      );

      fetchBookings();
    };

    const handleServiceCompleted = ({ bookingId, message }) => {
      toast.success(message || "Your service has been completed successfully!");

      setBookings(prev =>
        prev.map(b =>
          String(b._id) === String(bookingId)
            ? { ...b, Status: "Completed" }
            : b
        )
      );

      fetchBookings();
    };

    socket.on("booking-accepted", handleBookingAccepted);
    socket.on("booking-auto-cancelled", handleBookingAutoCancelled);
    socket.on("service-started", handleServiceStarted);
    socket.on("service-completed", handleServiceCompleted);

    return () => {
      socket.off("booking-accepted", handleBookingAccepted);
      socket.off("booking-auto-cancelled", handleBookingAutoCancelled);
      socket.off("service-started", handleServiceStarted);
      socket.off("service-completed", handleServiceCompleted);
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
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow mt-6">

        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-700 hover:text-gray-900">
            <ArrowLeft className="mr-2" size={20} />
            <h2 className="text-2xl font-bold text-gray-800">My Bookings</h2>
          </button>

          <button onClick={() => navigate("/help")} className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-700 border border-purple-200 rounded-md hover:bg-purple-50">
            <HelpCircle size={16} />
            Help
          </button>
        </div>

        <div className="flex flex-col justify-center items-center text-center py-20">
          <h2 className="text-lg font-semibold text-gray-800">No bookings yet.</h2>
          <p className="text-gray-500 mt-2">Looks like you haven't experienced quality services at home.</p>

          <button onClick={() => navigate("/customer/services")} className="mt-4 text-purple-700 font-medium hover:underline flex items-center gap-1">
            Explore our services →
          </button>
        </div>

      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      Pending: { icon: Clock, color: "text-yellow-700 bg-yellow-50 border-yellow-200", text: "Pending" },
      Confirmed: { icon: CheckCircle, color: "text-green-700 bg-green-50 border-green-200", text: "Confirmed" },
      "In-Progress": { icon: Clock, color: "text-purple-700 bg-purple-50 border-purple-200", text: "In Progress" },
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

  const handleViewDetails = (booking) => {
    setSelectedBookingDetails(booking);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedBookingDetails(null);
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
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">
                    {booking.SubCategoryID?.name || "Service"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    ₹{booking.SubCategoryID?.price || booking.TotalAmount}
                  </p>
                </div>
                
                {/* Booking Tracker - Top Right */}
                <div className="ml-4">
                  <BookingTracker status={booking.Status} />
                </div>
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

              <div className="mt-3 flex justify-between items-center flex-wrap gap-2">
                {/* Left side: Display feedback and complaint status */}
                <div className="flex gap-3 items-center">
                  {booking.Status === "Completed" && (
                    <>
                      {/* Feedback Display */}
                      {feedbackData[booking._id] ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={i < feedbackData[booking._id].Rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            ({feedbackData[booking._id].Rating}/5)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-md">
                          <Star size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500">No feedback</span>
                        </div>
                      )}

                      {/* Complaint Display */}
                      {complaintData[booking._id] ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-md">
                          <MessageSquare size={12} className="text-orange-600" />
                          <span className="text-xs font-medium text-gray-700">Complaint Filed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-md">
                          <MessageSquare size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500">No complaint</span>
                        </div>
                      )}
                    </>
                  )}

                  {booking.Status !== "Completed" && (
                    <>
                      {canCancel(booking) && getTimeRemaining(booking) && (
                        <span className="text-xs text-green-600 flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
                          <Clock size={12} /> {getTimeRemaining(booking)} remaining
                        </span>
                      )}

                      {booking.Status === "Pending" && !canCancel(booking) && (
                        <span className="text-xs text-red-500 flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md">
                          <AlertCircle size={12} /> Cancellation window expired
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Right side: Action buttons */}
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => handleViewDetails(booking)}
                    className="px-4 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition"
                  >
                    View Details
                  </button>

                  {canCancel(booking) && (
                    <button
                      onClick={() => openCancelModal(booking)}
                      className="px-4 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition"
                    >
                      Cancel Booking
                    </button>
                  )}

                  {booking.Status === "Completed" && (
                    <>
                      <button
                        onClick={() => handleOpenFeedbackModal(booking)}
                        className="px-4 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition flex items-center gap-1"
                      >
                        <Star size={14} />
                        {feedbackData[booking._id] ? 'Edit Feedback' : 'Give Feedback'}
                      </button>

                      <button
                        onClick={() => handleOpenComplaintModal(booking)}
                        className="px-4 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition flex items-center gap-1"
                      >
                        <MessageSquare size={14} />
                        {complaintData[booking._id] ? 'Edit Complaint' : 'File Complaint'}
                      </button>
                    </>
                  )}
                </div>
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

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBookingDetails && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeDetailsModal}
        >
          <div
            className="bg-white rounded-lg w-full max-w-5xl mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeDetailsModal}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition"
            >
              <XCircle size={24} />
            </button>

            {/* Modal Content */}
            <div className="p-8 pt-12">
              
              {/* Top Row: Service Info and Booking Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Service Details Section */}
                <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-lg p-5">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm">
                      🛠️
                    </div>
                    Service Information
                  </h4>
                  <div className="flex gap-4">
                    {selectedBookingDetails.SubCategoryID?.image && (
                      <img
                        src={`${backendUrl}${selectedBookingDetails.SubCategoryID.image}`}
                        alt={selectedBookingDetails.SubCategoryID.name}
                        className="w-24 h-24 object-cover rounded-lg shadow-md"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">
                          {selectedBookingDetails.SubCategoryID?.name || "Service"}
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          ₹{selectedBookingDetails.SubCategoryID?.price || selectedBookingDetails.TotalAmount}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Details Section */}
                <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-lg p-5">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                      📅
                    </div>
                    Booking Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium">Booking Date</p>
                      <p className="text-gray-800 font-semibold">
                        {new Date(selectedBookingDetails.Date).toLocaleDateString("en-IN", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Time Slot</p>
                      <p className="text-gray-800 font-semibold">{selectedBookingDetails.TimeSlot}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Customer and Technician Info */}
              <div className="grid grid-cols-2 gap-6">
                {/* Customer Details Section */}
                <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-lg p-5">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">
                      👤
                    </div>
                    Customer Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500 font-medium">Customer Name</p>
                        <p className="text-gray-800 font-semibold text-lg">
                          {selectedBookingDetails.CustomerID?.FirstName || selectedBookingDetails.CustomerID?.Name || "N/A"}{" "}
                          {selectedBookingDetails.CustomerID?.LastName || ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Mobile Number</p>
                        <p className="text-gray-800 font-semibold">
                          {selectedBookingDetails.CustomerID?.MobileNumber ||
                           selectedBookingDetails.CustomerID?.Mobile ||
                           selectedBookingDetails.CustomerID?.Phone ||
                           "Not available"}
                        </p>
                      </div>
                    </div>
                    {selectedBookingDetails.CustomerID?.Address && (
                      <>
                        <div className="mt-2">
                          <p className="text-gray-500 font-medium">Service Address</p>
                          <p className="text-gray-800 font-semibold">
                            {selectedBookingDetails.CustomerID.Address.houseNumber || selectedBookingDetails.CustomerID.Address.house_no},{" "}
                            {selectedBookingDetails.CustomerID.Address.street || selectedBookingDetails.CustomerID.Address.road}
                          </p>
                          <p className="text-gray-800">
                            {selectedBookingDetails.CustomerID.Address.city || selectedBookingDetails.CustomerID.Address.town},{" "}
                            {selectedBookingDetails.CustomerID.Address.state || ""}{" "}
                            {selectedBookingDetails.CustomerID.Address.pincode || selectedBookingDetails.CustomerID.Address.postcode}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Technician Details Section */}
                {selectedBookingDetails.TechnicianID ? (
                  <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-lg p-5">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm">
                        🔧
                      </div>
                      Technician Details
                    </h4>
                    <div className="flex gap-4 items-start">
                      {/* Technician Profile Picture */}
                      <div className="flex-shrink-0">
                        {selectedBookingDetails.TechnicianID.Photo ? (
                          <img
                            src={`${backendUrl}${selectedBookingDetails.TechnicianID.Photo}`}
                            alt={selectedBookingDetails.TechnicianID.Name}
                            className="w-20 h-20 rounded-full object-cover border-2 border-orange-200 shadow-md"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 text-2xl font-bold">
                            {selectedBookingDetails.TechnicianID.Name?.charAt(0)?.toUpperCase() || "T"}
                          </div>
                        )}
                      </div>
                      {/* Technician Info */}
                      <div className="flex-1 space-y-3 text-sm">
                        <div>
                          <p className="text-gray-500 font-medium">Technician Name</p>
                          <p className="text-gray-800 font-semibold text-lg">
                            {selectedBookingDetails.TechnicianID.Name}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Contact Number</p>
                          <p className="text-gray-800 font-semibold">
                            {selectedBookingDetails.TechnicianID.MobileNumber || 
                             selectedBookingDetails.TechnicianID.Mobile || 
                             selectedBookingDetails.TechnicianID.Phone || 
                             "Not available"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  selectedBookingDetails.Status === "Pending" && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle size={32} className="text-yellow-600 mx-auto mb-2" />
                        <p className="text-yellow-800 text-sm font-medium">
                          No technician assigned yet
                        </p>
                        <p className="text-yellow-700 text-xs mt-1">
                          We're finding the best technician for you
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-8 py-4 rounded-b-lg border-t border-gray-200">
              <div className="flex justify-between items-center">
                {/* Left side: Display feedback rating and complaint status */}
                <div className="flex gap-4 items-center">
                  {selectedBookingDetails.Status === "Completed" && (
                    <>
                      {/* Feedback Display */}
                      {feedbackData[selectedBookingDetails._id] ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={16}
                                className={i < feedbackData[selectedBookingDetails._id].Rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            ({feedbackData[selectedBookingDetails._id].Rating}/5)
                          </span>
                          {feedbackData[selectedBookingDetails._id].FeedbackText && (
                            <span className="text-xs text-gray-500 ml-2 max-w-xs truncate">
                              "{feedbackData[selectedBookingDetails._id].FeedbackText}"
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg">
                          <Star size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-500">No feedback given</span>
                        </div>
                      )}

                      {/* Complaint Display */}
                      {complaintData[selectedBookingDetails._id] ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                          <MessageSquare size={16} className="text-orange-600" />
                          <span className="text-sm font-medium text-gray-700">Complaint Filed</span>
                          <span className="text-xs text-gray-500 ml-2 max-w-xs truncate">
                            "{complaintData[selectedBookingDetails._id].ComplaintText}"
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg">
                          <MessageSquare size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-500">No complaint filed</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Right side: Action buttons for completed bookings */}
                {selectedBookingDetails.Status === "Completed" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleOpenFeedbackModal(selectedBookingDetails)}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center gap-2"
                    >
                      <Star size={16} />
                      {feedbackData[selectedBookingDetails._id] ? 'Edit Feedback' : 'Give Feedback'}
                    </button>

                    <button
                      onClick={() => handleOpenComplaintModal(selectedBookingDetails)}
                      className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition flex items-center gap-2"
                    >
                      <MessageSquare size={16} />
                      {complaintData[selectedBookingDetails._id] ? 'Edit Complaint' : 'File Complaint'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedBookingForFeedback && (
        <FeedbackModal
          bookingId={selectedBookingForFeedback._id}
          backendUrl={backendUrl}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedBookingForFeedback(null);
          }}
          onSuccess={handleFeedbackSuccess}
          existingFeedback={feedbackData[selectedBookingForFeedback._id]}
        />
      )}

      {/* Complaint Modal */}
      {showComplaintModal && selectedBookingForFeedback && (
        <ComplaintModal
          bookingId={selectedBookingForFeedback._id}
          backendUrl={backendUrl}
          onClose={() => {
            setShowComplaintModal(false);
            setSelectedBookingForFeedback(null);
          }}
          onSuccess={handleComplaintSuccess}
          existingComplaint={complaintData[selectedBookingForFeedback._id]}
        />
      )}

    </div>
  );
};

export default CustomerBookings;
