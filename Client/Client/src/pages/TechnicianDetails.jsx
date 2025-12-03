import React, { useEffect, useState, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";

const TechnicianDetails = () => {
  const { backendUrl } = useContext(AppContext);
  const { id } = useParams();
  const [technician, setTechnician] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTechnician = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/admin/technicians/${id}`, {
          withCredentials: true,
        });
        if (data.success) {
          setTechnician(data.technician);
        } else {
          toast.error("Technician not found");
        }
      } catch (error) {
        toast.error("Failed to fetch technician details");
      } finally {
        setLoading(false);
      }
    };
    fetchTechnician();
  }, [id, backendUrl]);

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!technician) {
    return (
      <div className="p-10 text-center text-red-600">Technician not found.</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <Link
          to="/admin/technicians"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Technician List
        </Link>

        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Technician Details
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p><strong>Name:</strong> {technician.Name}</p>
            <p><strong>Email:</strong> {technician.Email}</p>
            <p><strong>Mobile:</strong> {technician.MobileNumber}</p>
            <p><strong>Address:</strong> {technician.Address || "N/A"}</p>
          </div>
          <div>
            <p><strong>Category:</strong> {technician.ServiceCategoryID}</p>
            <p><strong>Bank Account:</strong> {technician.BankAccountNo}</p>
            <p><strong>IFSC Code:</strong> {technician.IFSCCode}</p>
            <p><strong>Status:</strong> {technician.VerifyStatus}</p>
          </div>
        </div>

        {technician.Photo && (
          <div className="mt-6">
            <p className="font-semibold">Profile Photo:</p>
            <img
              src={`${backendUrl}${technician.Photo}`}
              alt={technician.Name}
              className="w-32 h-32 rounded-full object-cover border mt-2"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianDetails;
