import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { 
  Star, 
  MessageSquare, 
  AlertCircle,
  Search,
  Filter,
  TrendingUp,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  User,
  Calendar,
  Tag,
  X,
  Settings
} from "lucide-react";
import { toast } from "react-toastify";
import ServiceOrbitLoader from "../components/ServiceOrbitLoader";

export const AdminFeedbacks = () => {
  const { backendUrl } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("feedbacks");
  const [feedbacks, setFeedbacks] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackSearchTerm, setFeedbackSearchTerm] = useState("");
  const [complaintSearchTerm, setComplaintSearchTerm] = useState("");
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState("all");
  const [complaintStatusFilter, setComplaintStatusFilter] = useState("all");
  const [showComplaintFilters, setShowComplaintFilters] = useState(false);
  const [showFeedbackFilters, setShowFeedbackFilters] = useState(false);
  const [currentFeedbackPage, setCurrentFeedbackPage] = useState(1);
  const [currentComplaintPage, setCurrentComplaintPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewDetails, setViewDetails] = useState(null);
  
  // Threshold settings
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholds, setThresholds] = useState({
    warningThreshold: 10,
    tempDeactivationThreshold: 20,
    permanentDeactivationThreshold: 30
  });
  const [thresholdLoading, setThresholdLoading] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [feedbackRes, complaintRes] = await Promise.all([
          axios.get(`${backendUrl}/api/feedback/admin/all`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/complaints/admin/all`, { withCredentials: true })
        ]);

        if (feedbackRes.data.success) {
          setFeedbacks(feedbackRes.data.feedbacks || []);
        }
        if (complaintRes.data.success) {
          setComplaints(complaintRes.data.complaints || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [backendUrl]);

  // Fetch thresholds
  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/thresholds`, { withCredentials: true });
        if (data.success) {
          setThresholds(data.thresholds);
        }
      } catch (error) {
        console.error("Error fetching thresholds:", error);
      }
    };
    fetchThresholds();
  }, [backendUrl]);

  // Stats calculations
  const feedbackStats = {
    total: feedbacks.length,
    averageRating: feedbacks.length > 0 
      ? (feedbacks.reduce((sum, f) => sum + f.Rating, 0) / feedbacks.length).toFixed(1)
      : "0.0",
    positive: feedbacks.filter(f => f.Rating >= 4).length,
    negative: feedbacks.filter(f => f.Rating <= 2).length,
  };

  const complaintStats = {
    total: complaints.length,
  };

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = feedbackSearchTerm ? 
      (feedback.BookingID?.CustomerID?.Name || 
       `${feedback.BookingID?.CustomerID?.FirstName || ""} ${feedback.BookingID?.CustomerID?.LastName || ""}`)
        .toLowerCase().includes(feedbackSearchTerm.toLowerCase()) ||
      feedback.FeedbackText?.toLowerCase().includes(feedbackSearchTerm.toLowerCase()) ||
      feedback.BookingID?.SubCategoryID?.name?.toLowerCase().includes(feedbackSearchTerm.toLowerCase())
      : true;
    
    if (feedbackStatusFilter === "high") return matchesSearch && feedback.Rating >= 4;
    if (feedbackStatusFilter === "low") return matchesSearch && feedback.Rating <= 2;
    if (feedbackStatusFilter === "medium") return matchesSearch && feedback.Rating === 3;
    
    return matchesSearch;
  });

  // Filter complaints
  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = complaintSearchTerm ? 
      (complaint.BookingID?.CustomerID?.Name || 
       `${complaint.BookingID?.CustomerID?.FirstName || ""} ${complaint.BookingID?.CustomerID?.LastName || ""}`)
        .toLowerCase().includes(complaintSearchTerm.toLowerCase()) ||
      complaint.ComplaintText?.toLowerCase().includes(complaintSearchTerm.toLowerCase()) ||
      complaint.BookingID?.SubCategoryID?.name?.toLowerCase().includes(complaintSearchTerm.toLowerCase())
      : true;
    
    return matchesSearch;
  });

  // Pagination calculations
  const totalFeedbackPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);
  const feedbackStartIndex = (currentFeedbackPage - 1) * itemsPerPage;
  const paginatedFeedbacks = filteredFeedbacks.slice(
    feedbackStartIndex,
    feedbackStartIndex + itemsPerPage
  );

  const totalComplaintPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const complaintStartIndex = (currentComplaintPage - 1) * itemsPerPage;
  const paginatedComplaints = filteredComplaints.slice(
    complaintStartIndex,
    complaintStartIndex + itemsPerPage
  );

  // Handle threshold settings update
  const handleThresholdUpdate = async () => {
    // Validation
    if (thresholds.warningThreshold >= thresholds.tempDeactivationThreshold || 
        thresholds.tempDeactivationThreshold >= thresholds.permanentDeactivationThreshold) {
      toast.error("Thresholds must be in ascending order: Warning < Temporary < Permanent");
      return;
    }

    if (thresholds.warningThreshold <= 0 || 
        thresholds.tempDeactivationThreshold <= 0 || 
        thresholds.permanentDeactivationThreshold <= 0) {
      toast.error("All threshold values must be positive numbers");
      return;
    }

    setThresholdLoading(true);
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/thresholds`,
        thresholds,
        { withCredentials: true }
      );

      if (data.success) {
        toast.success("Threshold settings updated successfully");
        setShowThresholdModal(false);
      }
    } catch (error) {
      console.error("Error updating thresholds:", error);
      toast.error(error.response?.data?.message || "Failed to update threshold settings");
    } finally {
      setThresholdLoading(false);
    }
  };

  // Render star rating
  const renderStars = (rating) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
          />
        ))}
        <span className="ml-2 text-sm font-semibold text-gray-700">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Get status color - REMOVED (no status anymore)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center">
        <ServiceOrbitLoader show={true} size={100} speed={700} />
        <span className="text-gray-600 mt-4">Loading feedbacks and complaints...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Feedbacks & Complaints Management
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Monitor customer feedback and manage complaints efficiently
          </p>
        </div>

        {/* View Toggle */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-1 inline-flex shadow-lg">
            <button
              onClick={() => setActiveTab("feedbacks")}
              className={`px-6 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${
                activeTab === "feedbacks"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Feedbacks</span>
            </button>
            <button
              onClick={() => setActiveTab("complaints")}
              className={`px-6 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${
                activeTab === "complaints"
                  ? "bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Complaints</span>
            </button>
          </div>
        </div>

        {/* FEEDBACKS VIEW */}
        {activeTab === "feedbacks" && (
          <>
            {/* Feedback Stats */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {feedbackStats.total}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Total Feedbacks
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-yellow-600">
                      {feedbackStats.averageRating}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Average Rating
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-600">
                      {feedbackStats.positive}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Positive (4+ stars)
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <ThumbsUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-red-600">
                      {feedbackStats.negative}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Negative (≤2 stars)
                    </div>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <ThumbsDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search feedbacks by customer, service, or text..."
                    value={feedbackSearchTerm}
                    onChange={(e) => setFeedbackSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm"
                  />
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowFeedbackFilters(!showFeedbackFilters)}
                    className="flex items-center space-x-2 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:scale-105 bg-white/50 backdrop-blur-sm"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                    {showFeedbackFilters ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Filters Row */}
              {showFeedbackFilters && (
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200 mt-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Rating
                    </label>
                    <select
                      value={feedbackStatusFilter}
                      onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm"
                    >
                      <option value="all">All Ratings</option>
                      <option value="high">High (4+ stars)</option>
                      <option value="medium">Medium (3 stars)</option>
                      <option value="low">Low (≤2 stars)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Feedbacks List */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              {filteredFeedbacks.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    No feedbacks found
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {feedbackSearchTerm || feedbackStatusFilter !== "all"
                      ? "Try adjusting your search terms or filters"
                      : "No feedbacks have been submitted yet"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {paginatedFeedbacks.map((feedback) => {
                      const customerName = feedback.BookingID?.CustomerID?.Name || 
                        `${feedback.BookingID?.CustomerID?.FirstName || ""} ${feedback.BookingID?.CustomerID?.LastName || ""}`.trim() || "N/A";
                      const serviceName = feedback.BookingID?.SubCategoryID?.name || "N/A";
                      const technicianName = feedback.BookingID?.TechnicianID?.Name || "N/A";
                      const date = new Date(feedback.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });

                      return (
                        <div
                          key={feedback._id}
                          className="hover:bg-gray-50/50 transition-colors duration-200"
                        >
                          <div className="px-6 py-4">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-4 mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <div className="text-lg font-semibold text-gray-900">
                                        {customerName}
                                      </div>
                                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                                        <Calendar className="h-4 w-4" />
                                        <span>{date}</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                                      <div className="flex items-center space-x-1">
                                        <Tag className="h-4 w-4" />
                                        <span>{serviceName}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <User className="h-4 w-4" />
                                        <span>{technicianName}</span>
                                      </div>
                                    </div>
                                    <div className="mb-2">
                                      {renderStars(feedback.Rating)}
                                    </div>
                                    {feedback.FeedbackText && (
                                      <p className="text-gray-700 bg-gray-50/50 p-4 rounded-lg border border-gray-200">
                                        {feedback.FeedbackText}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {filteredFeedbacks.length > itemsPerPage && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Showing {feedbackStartIndex + 1} to {Math.min(feedbackStartIndex + itemsPerPage, filteredFeedbacks.length)} of {filteredFeedbacks.length} feedbacks
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentFeedbackPage(prev => Math.max(1, prev - 1))}
                            disabled={currentFeedbackPage === 1}
                            className={`px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${
                              currentFeedbackPage === 1
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-700">
                            Page {currentFeedbackPage} of {totalFeedbackPages}
                          </span>
                          <button
                            onClick={() => setCurrentFeedbackPage(prev => Math.min(totalFeedbackPages, prev + 1))}
                            disabled={currentFeedbackPage === totalFeedbackPages}
                            className={`px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${
                              currentFeedbackPage === totalFeedbackPages
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* COMPLAINTS VIEW */}
        {activeTab === "complaints" && (
          <>
            {/* Complaint Stats */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-1 gap-6">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {complaintStats.total}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Total Complaints
                    </div>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Complaint Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search complaints by customer, service, or text..."
                    value={complaintSearchTerm}
                    onChange={(e) => setComplaintSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm"
                  />
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowThresholdModal(true)}
                    className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="font-medium">Threshold Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Complaints List */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              {filteredComplaints.length === 0 ? (
                <div className="text-center py-16">
                  <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    No complaints found
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {complaintSearchTerm || complaintStatusFilter !== "all"
                      ? "Try adjusting your search terms or filters"
                      : "No complaints have been submitted yet"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {paginatedComplaints.map((complaint) => {
                      const customerName = complaint.BookingID?.CustomerID?.Name || 
                        `${complaint.BookingID?.CustomerID?.FirstName || ""} ${complaint.BookingID?.CustomerID?.LastName || ""}`.trim() || "N/A";
                      const serviceName = complaint.BookingID?.SubCategoryID?.name || "N/A";
                      const technicianName = complaint.BookingID?.TechnicianID?.Name || "N/A";
                      const date = new Date(complaint.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                      const customerEmail = complaint.BookingID?.CustomerID?.Email;

                      return (
                        <div
                          key={complaint._id}
                          className="hover:bg-gray-50/50 transition-colors duration-200"
                        >
                          <div className="px-6 py-4">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <div className="text-lg font-semibold text-gray-900">
                                        {customerName}
                                      </div>
                                    </div>
                                    {customerEmail && (
                                      <div className="text-sm text-gray-600 mb-2">
                                        {customerEmail}
                                      </div>
                                    )}
                                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                      <div className="flex items-center space-x-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>{date}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Tag className="h-4 w-4" />
                                        <span>{serviceName}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <User className="h-4 w-4" />
                                        <span>{technicianName}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="mb-3">
                                  <p className="text-gray-700 bg-red-50/50 p-4 rounded-lg border border-red-200">
                                    <strong className="block text-sm font-semibold text-red-800 mb-1">Complaint:</strong>
                                    {complaint.ComplaintText}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {filteredComplaints.length > itemsPerPage && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Showing {complaintStartIndex + 1} to {Math.min(complaintStartIndex + itemsPerPage, filteredComplaints.length)} of {filteredComplaints.length} complaints
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentComplaintPage(prev => Math.max(1, prev - 1))}
                            disabled={currentComplaintPage === 1}
                            className={`px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${
                              currentComplaintPage === 1
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-700">
                            Page {currentComplaintPage} of {totalComplaintPages}
                          </span>
                          <button
                            onClick={() => setCurrentComplaintPage(prev => Math.min(totalComplaintPages, prev + 1))}
                            disabled={currentComplaintPage === totalComplaintPages}
                            className={`px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${
                              currentComplaintPage === totalComplaintPages
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Details Modal */}
        {viewDetails && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setViewDetails(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {viewDetails.type === 'feedback' ? 'Feedback Details' : 'Complaint Details'}
                  </h2>
                  <button
                    onClick={() => setViewDetails(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                {/* Add detailed view content here */}
              </div>
            </div>
          </div>
        )}

        {/* Threshold Settings Modal */}
        {showThresholdModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowThresholdModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Complaint Threshold Settings
                    </h2>
                    <p className="text-gray-600">
                      Configure automatic actions based on complaint count
                    </p>
                  </div>
                  <button
                    onClick={() => setShowThresholdModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Warning Threshold */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border-2 border-yellow-200">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-yellow-500 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Warning Threshold
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={thresholds.warningThreshold}
                          onChange={(e) => setThresholds({ ...thresholds, warningThreshold: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-lg font-semibold"
                        />
                        <p className="text-sm text-gray-700 mt-2">
                          ⚠️ Send warning email • Technician remains active
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Temporary Deactivation Threshold */}
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-xl border-2 border-red-200">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-red-500 rounded-lg">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Temporary Deactivation Threshold
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={thresholds.tempDeactivationThreshold}
                          onChange={(e) => setThresholds({ ...thresholds, tempDeactivationThreshold: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg font-semibold"
                        />
                        <p className="text-sm text-gray-700 mt-2">
                          🚫 Deactivate for 2 minutes • Auto-reactivate • Send emails
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Permanent Deactivation Threshold */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-purple-500 rounded-lg">
                        <X className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Permanent Deactivation Threshold
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={thresholds.permanentDeactivationThreshold}
                          onChange={(e) => setThresholds({ ...thresholds, permanentDeactivationThreshold: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-semibold"
                        />
                        <p className="text-sm text-gray-700 mt-2">
                          ⛔ Permanent deactivation • No auto-reactivation • Manual admin intervention required
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Deactivation Duration Info */}
                  <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-blue-500 rounded-lg">
                        <Settings className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Temporary Deactivation Duration
                        </label>
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          2 Minutes
                        </div>
                        <p className="text-sm text-gray-700">
                          ℹ️ This duration is fixed and cannot be changed (testing mode)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-8 pt-6 border-t">
                  <button
                    onClick={() => setShowThresholdModal(false)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleThresholdUpdate}
                    disabled={thresholdLoading}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 font-medium shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {thresholdLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Settings className="h-5 w-5" />
                        <span>Save Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};