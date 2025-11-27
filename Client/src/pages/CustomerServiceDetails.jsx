// src/pages/customer/CustomerServiceDetails.jsx
import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Star, ArrowLeft } from "lucide-react";
import { AppContext } from "../context/AppContext";

const backendUrl = "http://localhost:4000";

const CustomerServiceDetails = () => {
  const { id } = useParams(); // service id
  const navigate = useNavigate();
  const { isLoggedIn } = useContext(AppContext);

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

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
            onClick={() =>
              isLoggedIn
                ? navigate(`/customer/book-service/${service._id}`)
                : navigate("/login-customer")
            }
            className="bg-sky-600 text-white font-semibold px-8 py-3 rounded-full text-lg hover:bg-sky-700 transition"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerServiceDetails;
