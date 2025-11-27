import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CustomerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userData, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/bookings/user/${userData?.id}`,
          { withCredentials: true }
        );
        setBookings(data.bookings || []);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };
    if (userData?.id) fetchBookings();
  }, [userData, backendUrl]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-gray-500">
        Loading your bookings...
      </div>
    );
  }

  // If no bookings available
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center text-center min-h-[70vh] bg-white px-6">
        <div className="w-full max-w-2xl border-b border-gray-200 flex justify-between items-center pb-2 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2" size={18} />
            <span className="font-semibold">My Bookings</span>
          </button>
          <button
            onClick={() => navigate("/help")}
            className="flex items-center gap-1 px-3 py-1 text-sm text-purple-700 border border-purple-200 rounded-md hover:bg-purple-50"
          >
            <HelpCircle size={15} />
            Help
          </button>
        </div>

        <h2 className="text-lg font-semibold text-gray-800">No bookings yet.</h2>
        <p className="text-gray-500 mt-2">
          Looks like you haven’t experienced quality services at home.
        </p>

        <button
          onClick={() => navigate("/customer/services")}
          className="mt-4 text-purple-700 font-medium hover:underline flex items-center gap-1"
        >
          Explore our services →
        </button>
      </div>
    );
  }

  // If bookings exist
  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Bookings</h2>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="p-4 border border-gray-200 rounded-md flex justify-between items-center hover:shadow-sm transition"
          >
            <div>
              <h3 className="font-semibold text-gray-800">
                {booking.serviceName}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(booking.date).toLocaleDateString()} |{" "}
                {booking.status || "Pending"}
              </p>
            </div>
            <button
              onClick={() => navigate(`/customer/booking/${booking.id}`)}
              className="text-sm text-blue-600 font-medium hover:underline"
            >
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerBookings;
