// src/pages/customer/CustomerServiceDetails.jsx
import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Star, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";

const backendUrl = "http://localhost:4000";

const CustomerServiceDetails = () => {
  const { id } = useParams(); // service id
  const navigate = useNavigate();
  const { isLoggedIn, userData, backendUrl, socket } = useContext(AppContext);

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  // Booking modal state
  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState(null);
  const [checkingAddress, setCheckingAddress] = useState(false);
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [precheck, setPrecheck] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [stage, setStage] = useState("address");
  const [countdown, setCountdown] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(false);

  // Fetch service details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/sub-service-categories/${id}`
        );
        setService(data.subCategory || data.data);
      } catch (err) {
        console.error("Service fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  // Fetch customer address
  const loadCustomerAddress = async () => {
    try {
      setCheckingAddress(true);
      const customerId = userData?._id || userData?.id;
      if (!customerId) { setAddress(null); return; }
      const { data } = await axios.get(`${backendUrl}/api/customer-profile/${customerId}`, { withCredentials: true });
      const customer = data.data || data.customer || data.UserData || data.user;
      const addr = customer?.Address && typeof customer.Address === 'object'
        ? customer.Address
        : (customer?.Address || customer?.address || null);
      setAddress(addr);
      if (addr) {
        setHouseNumber((addr.houseNumber || addr.house_no || "").toString());
        setStreet((addr.street || addr.road || "").toString());
        setCity((addr.city || addr.town || addr.village || "").toString());
        setPincode((addr.pincode || addr.postcode || "").toString());
      }
    } catch (e) {
      console.warn('Address fetch failed', e);
      setAddress(null);
    } finally {
      setCheckingAddress(false);
    }
  };

  // Address edits are handled in profile page per request

  const TIME_SLOTS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];

  const runPrecheck = async () => {
    try {
      setPrecheck(null);
      const customerId = userData?._id || userData?.id;
      if (!customerId) {
        setPrecheck({ success: false, message: "Please login to continue" });
        toast.error("Please login to continue");
        return false;
      }
      const payload = { CustomerID: customerId, SubCategoryID: id, Date: date, TimeSlot: timeSlot };
      const { data } = await axios.post(`${backendUrl}/api/bookings/precheck`, payload, { withCredentials: true });
      if (data.success) {
        setPrecheck({ success: true, count: data.technicians.length, technicians: data.technicians });
        return true;
      } else {
        setPrecheck({ success: false, message: data.message });
        toast.error(data.message);
        return false;
      }
    } catch (e) {
      const errorMsg = e.response?.data?.message || "Precheck failed. Please try again.";
      setPrecheck({ success: false, message: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  const createBooking = async () => {
    try {
      // Fix: Pass required customerId and technicianId from precheck
      const customerId = userData?._id || userData?.id;
      // Find first available technician from precheck
      let technicianId = null;
      if (precheck && precheck.success && precheck.technicians && precheck.technicians.length > 0) {
        technicianId = precheck.technicians[0]._id;
      }
      const payload = {
        CustomerID: customerId,
        TechnicianID: technicianId,
        SubCategoryID: id,
        Date: date,
        TimeSlot: timeSlot
      };
      const { data } = await axios.post(`${backendUrl}/api/bookings/create`, payload, { withCredentials: true });
      if (data.success) {
        setBookingId(data.data._id);
        return data.data._id; // return created booking id to avoid state race
      } else {
        toast.error(data.message || 'Failed to create booking');
        return null;
      }
    } catch (e) {
      const errorMsg = e.response?.data?.message || 'Failed to create booking. Please try again.';
      toast.error(errorMsg);
      setShowModal(false);
      return false;
    }
  };

  const simulatePayment = async (id) => {
    const bId = id || bookingId;
    if (!bId) return;
    try { await axios.post(`${backendUrl}/api/bookings/simulate-payment`, { bookingId: bId }, { withCredentials: true }); } catch (e) {}
  };

  const startBroadcast = async (id) => {
    const bId = id || bookingId;
    if (!bId) return;
    try {
      const { data } = await axios.post(`${backendUrl}/api/bookings/broadcast`, { bookingId: bId }, { withCredentials: true });
      if (data.success) {
        setStage("success");
        toast.success('Booking request sent to nearby technicians!');
      }
    } catch (e) {
      toast.error('Failed to send booking request');
    }
  };

  const cancelBooking = async () => {
    if (!bookingId) return;
    try {
      const { data } = await axios.post(`${backendUrl}/api/bookings/cancel`, { bookingId }, { withCredentials: true });
      if (data.success) {
        toast.success('Booking cancelled successfully. Refund will be processed.');
        setStage("cancelled");
      } else {
        toast.error(data.message || 'Failed to cancel booking');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const confirmCancelFromModal = async () => {
    setCancellingBooking(true);
    try {
      await cancelBooking();
    } finally {
      setCancellingBooking(false);
      setShowCancelConfirm(false);
    }
  };

  // Listen for booking acceptance and auto-cancellation via socket
  useEffect(() => {
    if (!socket || !bookingId) return;
    
    const onAccepted = ({ bookingId: acceptedId }) => {
      if (acceptedId === bookingId) {
        toast.success('A technician has accepted your booking!');
        setStage("accepted");
      }
    };

    const onAutoCancelled = ({ bookingId: cancelledId, message }) => {
      if (cancelledId === bookingId) {
        toast.error(message || 'Your booking was automatically cancelled due to no technician acceptance within 10 minutes.');
        setStage("cancelled");
      }
    };
    
    socket.on('booking-accepted', onAccepted);
    socket.on('booking-auto-cancelled', onAutoCancelled);
    
    return () => {
      socket.off('booking-accepted', onAccepted);
      socket.off('booking-auto-cancelled', onAutoCancelled);
    };
  }, [socket, bookingId]);

  const openBooking = async () => {
    if (!isLoggedIn) return navigate("/login-customer");
    setShowModal(true);
    setStage("select");
    setPrecheck(null);
    setDate("");
    setTimeSlot("");
    await loadCustomerAddress();
  };

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-500">
        Loading…
      </div>
    );

  if (!service)
    return (
      <div className="min-h-screen flex justify-center items-center text-red-500">
        Service not found
      </div>
    );

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Back button */}
      <div className="p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-700 hover:text-black"
        >
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      {/* Banner */}
      <div className="w-full h-64 md:h-80 bg-gray-200 relative">
        <img
          src={`${backendUrl}${service.image}`}
          alt={service.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <h1 className="absolute bottom-4 left-4 text-white text-3xl font-bold drop-shadow">
          {service.name}
        </h1>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title + Price */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{service.name}</h2>
          <div className="text-2xl font-semibold text-sky-700">
            ₹{service.price}
          </div>
        </div>

        {/* Ratings */}
        <div className="flex items-center gap-2 mb-6">
          <Star className="text-yellow-500" size={20} />
          <Star className="text-yellow-500" size={20} />
          <Star className="text-yellow-500" size={20} />
          <Star className="text-yellow-500" size={20} />
          <Star className="text-gray-400" size={20} />
          <span className="text-gray-600 ml-2 text-sm">(423 reviews)</span>
        </div>

        {/* Description */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h3 className="text-lg font-semibold mb-2">Service Description</h3>
          <p className="text-gray-600 leading-relaxed">
            {service.description || "No description available."}
          </p>
        </div>

        {/* What's Included */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h3 className="text-lg font-semibold mb-2">What’s Included</h3>
          <ul className="text-gray-600 list-disc pl-6 space-y-2">
            <li>Professional technician visit</li>
            <li>Required basic tools</li>
            <li>Upfront pricing — no hidden charges</li>
            <li>Service completion report</li>
          </ul>
        </div>

        {/* What's Not Included */}
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h3 className="text-lg font-semibold mb-2">What’s Not Included</h3>
          <ul className="text-gray-600 list-disc pl-6 space-y-2">
            <li>Material cost (if additional items are needed)</li>
            <li>Major repairs beyond scope (charged separately)</li>
            <li>Transportation cost (in rare cases)</li>
          </ul>
        </div>

        {/* Book Now */}
        <div className="text-center mt-8">
          <button
            onClick={openBooking}
            className="bg-sky-600 text-white font-semibold px-8 py-3 rounded-full text-lg hover:bg-sky-700 transition"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>

    {/* Booking Modal */}
    {showModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
            <h3 className="text-lg font-semibold">Book Service</h3>
            <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowModal(false)}>✕</button>
          </div>

          <div className="p-6 space-y-6">
            {/* Service Info Card */}
            <div className="bg-gray-50 rounded-lg p-4 flex gap-4">
              <img 
                src={`${backendUrl}${service.image}`} 
                alt={service.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-lg">{service.name}</h4>
                <p className="text-2xl font-bold text-sky-600 mt-1">₹{service.price}</p>
              </div>
            </div>
            {/* Address Section - Always Visible */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Delivery Address</h4>
              {checkingAddress ? (
                <p className="text-gray-500">Loading address…</p>
              ) : address ? (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-gray-700">
                    {houseNumber}, {street && `${street}, `}{city && `${city}, `}{pincode}
                  </p>
                  <button 
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium" 
                    onClick={() => navigate('/customer/profile')}
                  >
                    Change Address
                  </button>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 mb-2 font-medium">⚠️ No address found</p>
                  <p className="text-red-600 text-sm mb-3">Please add your address with location pin to find nearby technicians.</p>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium" 
                    onClick={() => navigate('/customer/profile')}
                  >
                    Add Address & Location
                  </button>
                </div>
              )}
  
              {/* Cancel confirmation modal for booking created flow */}
              {showCancelConfirm && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-60" onClick={() => setShowCancelConfirm(false)}>
                  <div className="bg-white rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold mb-2">Cancel Booking</h3>
                    <p className="text-sm text-gray-600 mb-4">Are you sure you want to cancel this booking? A refund will be processed if applicable.</p>

                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowCancelConfirm(false)} className="px-4 py-2 rounded-md border bg-white text-gray-700">Keep Booking</button>
                      <button onClick={confirmCancelFromModal} disabled={cancellingBooking} className={`px-4 py-2 rounded-md text-white ${cancellingBooking ? 'bg-red-400' : 'bg-red-600'}`}>
                        {cancellingBooking ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Date & Time Section - Always Visible */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Select Date & Time</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Date</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    value={date} 
                    onChange={e=>setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Time Slot</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    value={timeSlot} 
                    onChange={e=>setTimeSlot(e.target.value)}
                  >
                    <option value="">Select time</option>
                    {TIME_SLOTS.map(ts => <option key={ts} value={ts}>{ts}</option>)}
                  </select>
                </div>
              </div>
              {precheck && !precheck.success && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{precheck.message}</p>
                </div>
              )}
            </div>

            {/* Payment Summary & Action Buttons */}
            <div className="border-t pt-4 space-y-4">
              {stage === "success" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-1">Booking Created Successfully!</h4>
                  <p className="text-green-700 text-sm mb-3">Your booking request has been sent to nearby technicians. You will be notified once a technician accepts.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('/customer/bookings')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                    >
                      View My Bookings
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                    >
                      Cancel Booking
                    </button>
                  </div>
                </div>
              )}

              {stage === "accepted" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-1">Technician Assigned!</h4>
                  <p className="text-blue-700 text-sm mb-3">A technician has accepted your booking request.</p>
                  <button
                    onClick={() => navigate('/customer/bookings')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    View Booking Details
                  </button>
                </div>
              )}

              {stage === "cancelled" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-1">Booking Cancelled</h4>
                  <p className="text-red-700 text-sm mb-3">Your booking has been cancelled. Refund will be processed.</p>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setStage("select");
                      setBookingId(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              )}

              {stage !== "success" && stage !== "accepted" && stage !== "cancelled" && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">₹{service.price}</p>
                  </div>
                  <button
                    disabled={!address || !date || !timeSlot}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={async () => {
                      if (!address) {
                        toast.error('Please add your address first');
                        return;
                      }
                      if (!date || !timeSlot) {
                        toast.error('Please select date and time');
                        return;
                      }
                      // Run precheck
                      const precheckOk = await runPrecheck();
                      if (!precheckOk) {
                        return;
                      }
                      // Create booking
                      const newId = await createBooking();
                      if (!newId) {
                        // createBooking already showed error toast and closed modal
                        return;
                      }
                      
                      // Only continue if booking was created successfully
                      await simulatePayment(newId);
                      toast.success('Payment simulated successfully');
                      await startBroadcast(newId);
                    }}
                  >
                    {stage === "waiting" ? "Processing..." : "Pay Now"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default CustomerServiceDetails;
