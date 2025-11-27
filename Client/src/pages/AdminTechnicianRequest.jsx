import React, { useEffect, useState, useContext, useRef, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  Hourglass,
  ToggleRight,
  ToggleLeft,
  Loader2,
  Folder,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Check,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FolderOpen
} from "lucide-react";
import { AppContext } from "../context/AppContext";
import ServiceOrbitLoader from "../components/ServiceOrbitLoader";

const TechnicianRequest = () => {
  const { backendUrl, userData } = useContext(AppContext);

  // data
  const [allTechs, setAllTechs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Dropdown states
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Refs for dropdowns
  const statusDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 7;

  // Handle outside click to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // modals & selections
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch once on mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${backendUrl}/api/admin/technicians`, {
          withCredentials: true,
          timeout: 10000,
        });
        if (res.data?.success) {
          setAllTechs(Array.isArray(res.data.technicians) ? res.data.technicians : []);
        } else {
          toast.error(res.data?.message || "Failed to load technicians");
        }
      } catch (err) {
        console.error(err);
        if (err.response) {
          toast.error(err.response.data?.message || "Failed to load technicians");
        } else {
          toast.error("Network error — check backend or connection");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // Helpers
  const getPhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${backendUrl}${path}`;
    return `${backendUrl}/uploads/photos/${path}`;
  };

  const DefaultAvatar = ({ name }) => (
    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
      {name?.[0]?.toUpperCase() || "T"}
    </div>
  );

  // Statistics
  const stats = useMemo(() => {
    const total = allTechs.length;
    const pending = allTechs.filter((t) => t.VerifyStatus === "Pending").length;
    const approved = allTechs.filter((t) => t.VerifyStatus === "Approved").length;
    const rejected = allTechs.filter((t) => t.VerifyStatus === "Rejected").length;
    return { total, pending, approved, rejected };
  }, [allTechs]);

  // Filters
  const filtered = useMemo(() => {
    return allTechs.filter((tech) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        tech.Name?.toLowerCase().includes(searchLower) ||
        tech.Email?.toLowerCase().includes(searchLower) ||
        tech.MobileNumber?.toLowerCase().includes(searchLower) ||
        tech.ServiceCategoryID?.name?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (statusFilter !== "all" && tech.VerifyStatus !== statusFilter) return false;

      if (categoryFilter && tech.ServiceCategoryID?._id !== categoryFilter) return false;

      return true;
    });
  }, [allTechs, searchTerm, statusFilter, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [searchTerm, statusFilter, categoryFilter]);

  // Category list for filter
  const categoryList = [
    ...new Map(
      allTechs.map((t) => [t.ServiceCategoryID?._id, t.ServiceCategoryID])
    ).values(),
  ].filter(Boolean);

  // Status options
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" }
  ];

  // Pagination Component
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
            page === 1
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-gray-100 shadow-sm"
          }`}
        >
          Previous
        </button>

        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={i} className="px-3 py-2 text-gray-500">
              …
            </span>
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
            page === totalPages
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-gray-100 shadow-sm"
          }`}
        >
          Next
        </button>
      </div>
    );
  };

  // Actions
  const handleApprove = async (id) => {
    try {
      const res = await axios.patch(
        `${backendUrl}/api/admin/technicians/${id}/approve`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Technician approved");
        setAllTechs((prev) => prev.map((t) => (t._id === id ? { ...t, VerifyStatus: "Approved" } : t)));
        setShowDetailsModal(false);
        setShowRejectModal(null);
      } else {
        toast.error(res.data?.message || "Approve failed");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Approve failed");
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide rejection reason");
      return;
    }
    try {
      const res = await axios.patch(
        `${backendUrl}/api/admin/technicians/${id}/reject`,
        { reason: rejectReason },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Technician rejected");
        setAllTechs((prev) =>
          prev.map((t) =>
            t._id === id ? { ...t, VerifyStatus: "Rejected", rejectReason } : t
          )
        );
        setShowRejectModal(null);
        setRejectReason("");
        setShowDetailsModal(false);
      } else {
        toast.error(res.data?.message || "Reject failed");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Reject failed");
    }
  };

  const openDetails = (id) => {
    const t = allTechs.find((x) => x._id === id);
    setSelectedTechnician(t || null);
    setShowDetailsModal(true);
  };

  // Security check
  if (userData?.role && userData.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600">Admin privileges required to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold  mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Technician Management
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Manage technician registrations and account status in one place
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Technicians</div>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.pending}
                </div>
                <div className="text-sm text-gray-600 mt-1">Pending</div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Hourglass className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {stats.approved}
                </div>
                <div className="text-sm text-gray-600 mt-1">Approved</div>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-600">
                  {stats.rejected}
                </div>
                <div className="text-sm text-gray-600 mt-1">Rejected</div>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <X className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8 relative z-30">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search technicians by name, email, mobile, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto items-center">
              {/* Status Filter */}
              <div className="relative z-30" ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm flex items-center space-x-2 transition-all duration-300 hover:scale-105"
                >
                  <Filter className="h-4 w-4" />
                  <span>
                    {statusFilter !== "all" 
                      ? statusOptions.find(s => s.value === statusFilter)?.label
                      : "All Status"
                    }
                  </span>
                  {showStatusDropdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {/* Status Dropdown */}
                {showStatusDropdown && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200/50 p-3 z-50 min-w-48">
                    <div className="space-y-1">
                      {statusOptions.map((option) => (
                        <div
                          key={option.value}
                          className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors duration-200"
                          onClick={() => {
                            setStatusFilter(option.value);
                            setShowStatusDropdown(false);
                          }}
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category Filter */}
              <div className="relative z-30" ref={categoryDropdownRef}>
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm flex items-center space-x-2 transition-all duration-300 hover:scale-105"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>
                    {categoryFilter
                      ? categoryList.find((c) => c?._id === categoryFilter)?.name
                      : "All Categories"
                    }
                  </span>
                  {showCategoryDropdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {/* Category Dropdown */}
                {showCategoryDropdown && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200/50 p-3 z-50 min-w-48">
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search category..."
                      className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      <div
                        onClick={() => {
                          setCategoryFilter("");
                          setCategorySearch("");
                          setShowCategoryDropdown(false);
                        }}
                        className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors duration-200"
                      >
                        All Categories
                      </div>
                      {categoryList
                        .filter((c) =>
                          c?.name?.toLowerCase().includes(categorySearch.toLowerCase())
                        )
                        .map((cat) => (
                          <div
                            key={cat?._id}
                            className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors duration-200"
                            onClick={() => {
                              setCategoryFilter(cat._id);
                              setShowCategoryDropdown(false);
                            }}
                          >
                            {cat.name}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Technicians List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <ServiceOrbitLoader show={true} size={80} speed={700} />
              <p className="text-gray-600 mt-4">Loading technicians...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                No technicians found
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' || categoryFilter
                  ? "Try adjusting your search terms or filters" 
                  : "No technicians registered in the system yet"
                }
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table (hidden on small screens) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Technician
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Registered
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {paginated.map((tech) => (
                      <tr 
                        key={tech._id} 
                        className="hover:bg-gray-50/50 transition-colors duration-200 group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-4">
                            {tech.Photo ? (
                              <img
                                src={getPhotoUrl(tech.Photo)}
                                className="w-12 h-12 object-cover rounded-xl border-2 border-white shadow-lg group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => (e.target.style.display = "none")}
                                alt={tech.Name}
                              />
                            ) : (
                              <DefaultAvatar name={tech.Name} />
                            )}
                            <div>
                              <div className="text-lg font-semibold text-gray-900">
                                {tech.Name}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-gray-700">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{tech.Email}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-700">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{tech.MobileNumber}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            {tech.ServiceCategoryID?.name || "N/A"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-all duration-300 ${
                                tech.VerifyStatus === "Pending"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm"
                                  : tech.VerifyStatus === "Approved"
                                  ? "bg-green-100 text-green-800 border-green-200 shadow-sm"
                                  : "bg-red-100 text-red-800 border-red-200 shadow-sm"
                              }`}
                            >
                              {tech.VerifyStatus === "Pending" && <Clock className="h-3 w-3 mr-1" />}
                              {tech.VerifyStatus === "Approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {tech.VerifyStatus === "Rejected" && <XCircle className="h-3 w-3 mr-1" />}
                              {tech.VerifyStatus}
                            </span>

                            {tech.VerifyStatus === "Approved" && (
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-all duration-300 ${
                                  tech.ActiveStatus === "Active"
                                    ? "bg-green-100 text-green-800 border-green-200 shadow-sm"
                                    : "bg-red-100 text-red-800 border-red-200 shadow-sm"
                                }`}
                              >
                                {tech.ActiveStatus === "Active" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {tech.ActiveStatus || "Not Active"}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {new Date(tech.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {tech.VerifyStatus === "Pending" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApprove(tech._id)}
                                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2 px-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center space-x-2 text-xs"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => setShowRejectModal(tech._id)}
                                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white py-2 px-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center space-x-2 text-xs"
                                >
                                  <XCircle className="h-3 w-3" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => openDetails(tech._id)}
                              className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-2 px-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center space-x-2 text-xs"
                            >
                              <User className="h-3 w-3" />
                              <span>View Details</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list (shown on small screens) */}
              <div className="block sm:hidden">
                <div className="divide-y divide-gray-200">
                  {paginated.map((tech) => (
                    <div key={tech._id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          {tech.Photo ? (
                            <img
                              src={getPhotoUrl(tech.Photo)}
                              className="w-12 h-12 object-cover rounded-xl border-2 border-white shadow-lg"
                              onError={(e) => (e.target.style.display = "none")}
                              alt={tech.Name}
                            />
                          ) : (
                            <DefaultAvatar name={tech.Name} />
                          )}
                          <div>
                            <div className="text-base font-semibold text-gray-900">{tech.Name}</div>
                            <div className="text-sm text-gray-600">{tech.ServiceCategoryID?.name || 'N/A'}</div>
                          </div>
                        </div>
                        <div className="ml-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                            tech.VerifyStatus === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' : tech.VerifyStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-red-100 text-red-800 border-red-200'
                          }`}>{tech.VerifyStatus}</span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{tech.Email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{tech.MobileNumber}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{new Date(tech.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        {tech.VerifyStatus === "Pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(tech._id)}
                              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2 px-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center space-x-2 text-sm"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setShowRejectModal(tech._id)}
                              className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white py-2 px-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center space-x-2 text-sm"
                            >
                              <XCircle className="h-4 w-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => openDetails(tech._id)}
                          className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-2 px-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center space-x-2 text-sm"
                        >
                          <User className="h-4 w-4" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {filtered.length > pageSize && (
                <div className="px-6 py-4 border-t border-gray-200/50">
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowRejectModal(null);
            setRejectReason("");
          }
        }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Reject Technician</h3>
            <p className="text-sm text-gray-600 mb-4">Provide reason (visible to technician)</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              placeholder="Reason for rejection..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-xl transition-all duration-300 hover:scale-105"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedTechnician && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 z-50 animate-fadeIn overflow-auto" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDetailsModal(false);
          }
        }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl animate-scaleIn p-6">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedTechnician.Name}</h3>
                <p className="text-sm text-gray-600">Technician Details</p>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200/50">
                <div className="text-center">
                  {selectedTechnician.Photo ? (
                    <img 
                      src={getPhotoUrl(selectedTechnician.Photo)} 
                      alt={selectedTechnician.Name} 
                      className="w-32 h-32 rounded-2xl object-cover mx-auto shadow-lg" 
                    />
                  ) : (
                    <DefaultAvatar name={selectedTechnician.Name} className="mx-auto w-32 h-32 text-2xl" />
                  )}
                  <h4 className="mt-4 text-lg font-semibold text-gray-900">{selectedTechnician.Name}</h4>

                  <div className="mt-4 space-y-3 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Verification Status</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        selectedTechnician.VerifyStatus === "Pending" ? "bg-yellow-100 text-yellow-800" :
                        selectedTechnician.VerifyStatus === "Approved" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {selectedTechnician.VerifyStatus}
                      </span>
                    </div>
                    {selectedTechnician.VerifyStatus === "Approved" && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Active Status</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          selectedTechnician.ActiveStatus === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {selectedTechnician.ActiveStatus || "-"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Documents</h5>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Profile Photo</div>
                      {selectedTechnician.Photo ? (
                        <a className="text-blue-600 text-sm hover:text-blue-700 transition-colors" href={getPhotoUrl(selectedTechnician.Photo)} target="_blank" rel="noreferrer">View Document</a>
                      ) : (
                        <div className="text-xs text-gray-500">Not provided</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">ID Proof</div>
                      {selectedTechnician.IDProof ? (
                        <a className="text-blue-600 text-sm hover:text-blue-700 transition-colors" href={getPhotoUrl(selectedTechnician.IDProof)} target="_blank" rel="noreferrer">View Document</a>
                      ) : (
                        <div className="text-xs text-gray-500">Not provided</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Personal Info</h5>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Full name</div>
                        <div className="text-sm text-gray-900">{selectedTechnician.Name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Email</div>
                        <div className="text-sm text-gray-900">{selectedTechnician.Email}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Mobile</div>
                        <div className="text-sm text-gray-900">{selectedTechnician.MobileNumber}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Address</div>
                        <div className="text-sm text-gray-900">{selectedTechnician.Address || "-"}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Professional</h5>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Service Category</div>
                        <div className="text-sm text-gray-900">{selectedTechnician.ServiceCategoryID?.name || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Bank Account</div>
                        <div className="text-sm text-gray-900">{selectedTechnician.BankAccountNo || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">IFSC Code</div>
                        <div className="text-sm text-gray-900">{selectedTechnician.IFSCCode || "-"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Verification Status</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 text-center">
                        <div className="text-xs text-gray-500 mb-1">Mobile</div>
                        <div className="text-sm font-medium">{selectedTechnician.isMobileVerified ? "✅ Verified" : "❌ Pending"}</div>
                      </div>
                      <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 text-center">
                        <div className="text-xs text-gray-500 mb-1">Email</div>
                        <div className="text-sm font-medium">{selectedTechnician.isEmailVerified ? "✅ Verified" : "❌ Pending"}</div>
                      </div>
                      <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 text-center">
                        <div className="text-xs text-gray-500 mb-1">Registered</div>
                        <div className="text-sm font-medium">{new Date(selectedTechnician.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 text-center">
                        <div className="text-xs text-gray-500 mb-1">Last Updated</div>
                        <div className="text-sm font-medium">{new Date(selectedTechnician.updatedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  {selectedTechnician.VerifyStatus === "Pending" && (
                    <>
                      <button 
                        onClick={() => handleApprove(selectedTechnician._id)} 
                        className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 hover:scale-105"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailsModal(false);
                          setShowRejectModal(selectedTechnician._id);
                        }}
                        className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300 hover:scale-105"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => setShowDetailsModal(false)} 
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add custom animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TechnicianRequest;