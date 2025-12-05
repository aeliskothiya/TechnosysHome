import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { Star, MessageSquare, Calendar, User, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function TechnicianFeedbacks() {
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${backendUrl}/api/feedback/technician/all`, {
          withCredentials: true,
        });

        if (data.success) {
          setFeedbacks(data.feedbacks || []);
        }
      } catch (error) {
        console.error("Error fetching feedbacks:", error);
        toast.error("Failed to load feedbacks");
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [backendUrl]);

  const totalPages = Math.ceil(feedbacks.length / pageSize) || 1;
  const currentFeedbacks = feedbacks.slice((page - 1) * pageSize, page * pageSize);

  // Calculate stats
  const stats = {
    total: feedbacks.length,
    averageRating: feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + f.Rating, 0) / feedbacks.length).toFixed(1)
      : "0.0",
    fiveStar: feedbacks.filter(f => f.Rating === 5).length,
    fourStar: feedbacks.filter(f => f.Rating === 4).length,
    threeStar: feedbacks.filter(f => f.Rating === 3).length,
    twoStar: feedbacks.filter(f => f.Rating === 2).length,
    oneStar: feedbacks.filter(f => f.Rating === 1).length,
  };

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
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
            page === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 shadow-sm"
          }`}
        >
          Previous
        </button>

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-gray-500">
        Loading feedbacks...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-700 hover:text-gray-900">
          <ArrowLeft className="mr-2" size={20} />
          <h1 className="text-2xl font-bold text-gray-800">My Feedbacks</h1>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Feedbacks</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.total}</p>
            </div>
            <MessageSquare className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-white border border-yellow-100 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Average Rating</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-3xl font-bold text-yellow-600">{stats.averageRating}</p>
                <Star className="text-yellow-500 fill-yellow-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">5 Star Reviews</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.fiveStar}</p>
            </div>
            <Star className="text-green-500 fill-green-500" size={32} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-lg p-5 shadow-sm">
          <div>
            <p className="text-sm text-gray-600 font-medium mb-2">Rating Distribution</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-8 text-gray-600">5★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${stats.total > 0 ? (stats.fiveStar / stats.total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right text-gray-600">{stats.fiveStar}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 text-gray-600">4★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${stats.total > 0 ? (stats.fourStar / stats.total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right text-gray-600">{stats.fourStar}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 text-gray-600">3★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: `${stats.total > 0 ? (stats.threeStar / stats.total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right text-gray-600">{stats.threeStar}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 text-gray-600">2★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${stats.total > 0 ? (stats.twoStar / stats.total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right text-gray-600">{stats.twoStar}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 text-gray-600">1★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: `${stats.total > 0 ? (stats.oneStar / stats.total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right text-gray-600">{stats.oneStar}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedbacks List */}
      {feedbacks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <MessageSquare className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600 text-lg">No feedbacks yet</p>
          <p className="text-gray-500 text-sm mt-1">Complete your bookings to receive customer feedback</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentFeedbacks.map((feedback) => (
              <div key={feedback._id} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition">
                {/* Rating */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={20}
                        className={i < feedback.Rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                    <span className="ml-2 text-sm font-semibold text-gray-700">({feedback.Rating}/5)</span>
                  </div>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(feedback.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                </div>

                {/* Feedback Text */}
                {feedback.FeedbackText && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-700 italic">"{feedback.FeedbackText}"</p>
                  </div>
                )}

                {/* Booking & Customer Info */}
                <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="text-gray-500 mt-0.5" size={16} />
                    <div>
                      <p className="text-gray-600">
                        <strong>Customer:</strong> {feedback.BookingID?.CustomerID?.FirstName || feedback.BookingID?.CustomerID?.Name || "N/A"}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {feedback.BookingID?.CustomerID?.MobileNumber || ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="text-gray-500" size={16} />
                    <p className="text-gray-600">
                      <strong>Service:</strong> {feedback.BookingID?.SubCategoryID?.name || "Service"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-gray-500" size={16} />
                    <p className="text-gray-600">
                      <strong>Booking Date:</strong> {new Date(feedback.BookingID?.Date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {feedbacks.length > pageSize && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
