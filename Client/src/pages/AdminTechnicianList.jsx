import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  Users,
  Check,
  X,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  FolderOpen
} from "lucide-react";
import { AppContext } from "../context/AppContext";
import ServiceOrbitLoader from "../components/ServiceOrbitLoader";

function AdminTechnicianList() {
  const { backendUrl } = useContext(AppContext);

  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Category search
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

  // Fetch technicians
  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/admin/technicians`, {
        withCredentials: true,
      });
      if (data.success) setTechnicians(data.technicians);
      else toast.error("Failed to load technicians");
    } catch (err) {
      toast.error("Error loading technicians");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  // Helpers
  const getPhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/uploads")) return backendUrl + path;
    return `${backendUrl}/uploads/photos/${path}`;
  };

  const DefaultAvatar = ({ name }) => (
    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
      {name?.[0]?.toUpperCase() || "T"}
    </div>
  );

  // Stats calculations
  const stats = {
    total: technicians.length,
    approved: technicians.filter(t => t.VerifyStatus === "Approved").length,
    pending: technicians.filter(t => t.VerifyStatus === "Pending").length,
    rejected: technicians.filter(t => t.VerifyStatus === "Rejected").length
  };

  // Filters
  const filtered = technicians.filter((t) => {
    const s = searchTerm.toLowerCase();

    const matches =
      t.Name.toLowerCase().includes(s) ||
      t.Email.toLowerCase().includes(s) ||
      t.MobileNumber.toLowerCase().includes(s) ||
      (t.ServiceCategoryID?.name || "").toLowerCase().includes(s);

    if (!matches) return false;

    if (statusFilter !== "all" && t.VerifyStatus !== statusFilter) return false;

    if (categoryFilter && t.ServiceCategoryID?._id !== categoryFilter)
      return false;

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [searchTerm, statusFilter, categoryFilter]);

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

  const categoryList = [
    ...new Map(
      technicians.map((t) => [t.ServiceCategoryID?._id, t.ServiceCategoryID])
    ).values(),
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "Approved", label: "Approved" },
    { value: "Pending", label: "Pending" },
    { value: "Rejected", label: "Rejected" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Technician Directory
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            View and manage all registered technicians in one place
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
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.pending}
                </div>
                <div className="text-sm text-gray-600 mt-1">Pending</div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Clock className="h-6 w-6 text-yellow-600" />
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
                placeholder="Search technicians by name, mobile, email, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-start sm:items-center">
              {/* Status Filter */}
              <div className="relative z-30 w-full sm:w-auto" ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full sm:w-auto flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm space-x-2 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span className="text-left">
                      {statusFilter !== "all"
                        ? statusOptions.find((s) => s.value === statusFilter)?.label
                        : "All Status"}
                    </span>
                  </div>
                  <div className="ml-4">
                    {showStatusDropdown ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Status Dropdown */}
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 sm:right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200/50 p-3 z-50 w-full sm:min-w-48">
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
              <div className="relative z-30 w-full sm:w-auto" ref={categoryDropdownRef}>
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="w-full sm:w-auto flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm space-x-2 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="h-4 w-4" />
                    <span className="text-left">
                      {categoryFilter
                        ? categoryList.find((c) => c?._id === categoryFilter)?.name
                        : "All Categories"}
                    </span>
                  </div>
                  <div className="ml-4">
                    {showCategoryDropdown ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Category Dropdown */}
                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 sm:right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200/50 p-3 z-50 w-full sm:min-w-48">
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
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                            {tech.ServiceCategoryID?.name || "N/A"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-all duration-300 ${
                              tech.VerifyStatus === "Approved"
                                ? "bg-green-100 text-green-800 border-green-200 shadow-sm"
                                : tech.VerifyStatus === "Pending"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm"
                                : "bg-red-100 text-red-800 border-red-200 shadow-sm"
                            }`}
                          >
                            {tech.VerifyStatus === "Pending" && <Clock className="h-3 w-3 mr-1" />}
                            {tech.VerifyStatus === "Approved" && <Check className="h-3 w-3 mr-1" />}
                            {tech.VerifyStatus === "Rejected" && <X className="h-3 w-3 mr-1" />}
                            {tech.VerifyStatus}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {new Date(tech.createdAt).toLocaleDateString()}
                            </span>
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
                      <div className="flex items-center justify-between">
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
                        <div>
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
        .overflow-x-auto {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default AdminTechnicianList;