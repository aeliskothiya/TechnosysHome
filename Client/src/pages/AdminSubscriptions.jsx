import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Plus,
  Edit,
  Search,
  Loader2,
  Package,
  CreditCard,
  Filter,
  ChevronUp,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Check,
  Users,
  Star,
  Zap,
  Play,
  Pause,
} from "lucide-react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import ServiceOrbitLoader from "../components/ServiceOrbitLoader";

export default function AdminSubscriptions() {
  const { backendUrl, userData } = useContext(AppContext);

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hoveredCard, setHoveredCard] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Form state
  const [packageForm, setPackageForm] = useState({
    name: "",
    coins: "",
    price: "",
    description: "",
    isActive: true,
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});

  // Real-time validation function
  const validateField = (name, value) => {
    const errors = { ...validationErrors };

    switch (name) {
      case "name":
        if (!value.trim()) {
          errors.name = "Package name is required";
        } else if (value.trim().length < 2) {
          errors.name = "Package name must be at least 2 characters";
        } else {
          delete errors.name;
        }
        break;
      case "coins":
        if (!value) {
          errors.coins = "Coins count is required";
        } else if (parseFloat(value) < 1) {
          errors.coins = "Coins must be at least 1";
        } else {
          delete errors.coins;
        }
        break;
      case "price":
        if (!value) {
          errors.price = "Price is required";
        } else if (parseFloat(value) < 0) {
          errors.price = "Price cannot be negative";
        } else {
          delete errors.price;
        }
        break;
      case "description":
        if (!value.trim()) {
          errors.description = "Description is required";
        } else if (value.trim().length < 10) {
          errors.description = "Description must be at least 10 characters";
        } else {
          delete errors.description;
        }
        break;
      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form field changes with validation
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setPackageForm({ ...packageForm, [name]: value });
    validateField(name, value);
  };

  // Predefined package templates for quick creation
  const packageTemplates = [
    {
      name: "Classic Active",
      coins: 20,
      price: 249,
      description:
        "Beginners. Part-time technicians. Technician teams. Occasional weekend workers.",
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      badge: "Popular",
    },
    {
      name: "Premium Active",
      coins: 75,
      price: 1199,
      description:
        "High-demand technicians. Full-time service providers. Technician teams. Technicians looking for growth.",
      icon: Star,
      gradient: "from-purple-500 to-pink-500",
      badge: "Recommended",
    },
    {
      name: "Enterprise Active",
      coins: 180,
      price: 2699,
      description:
        "Service-based companies. Technician teams. High-volume service providers. Professionals who want maximum reach.",
      icon: Zap,
      gradient: "from-orange-500 to-red-500",
      badge: "Best Value",
    },
  ];

  // Fetch packages on component mount
  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${backendUrl}/api/subscription-packages`,
        {
          withCredentials: true,
        }
      );
      if (response.data.success) {
        setPackages(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast.error("Failed to load subscription packages");
    } finally {
      setLoading(false);
    }
  };

  // Filter packages
  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch =
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return pkg.isActive;
    if (statusFilter === "inactive") return !pkg.isActive;
    return true;
  });

  // Stats calculations
  const stats = {
    total: packages.length,
    active: packages.filter((p) => p.isActive).length,
    inactive: packages.filter((p) => !p.isActive).length,
  };

  // Modal handlers
  const handleCreatePackage = () => {
    setEditingPackage(null);
    setPackageForm({
      name: "",
      coins: "",
      price: "",
      description: "",
      isActive: true,
    });
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const handleCreateFromTemplate = (template) => {
    setEditingPackage(null);
    setPackageForm({
      name: template.name,
      coins: template.coins,
      price: template.price,
      description: template.description,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      coins: pkg.coins,
      price: pkg.price,
      description: pkg.description || "",
      isActive: pkg.isActive,
    });
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const handleSubmitPackage = async (e) => {
    e.preventDefault();

    // Validate all fields before submission
    const isNameValid = validateField("name", packageForm.name);
    const isCoinsValid = validateField("coins", packageForm.coins);
    const isPriceValid = validateField("price", packageForm.price);
    const isDescriptionValid = validateField(
      "description",
      packageForm.description
    );

    if (!isNameValid || !isCoinsValid || !isPriceValid || !isDescriptionValid) {
      toast.error("Please fix the validation errors");
      return;
    }

    setSubmitting(true);

    try {
      const url = editingPackage
        ? `${backendUrl}/api/subscription-packages/${editingPackage._id}`
        : `${backendUrl}/api/subscription-packages`;
      const method = editingPackage ? "put" : "post";

      const payload = {
        name: packageForm.name,
        coins: parseFloat(packageForm.coins),
        price: parseFloat(packageForm.price),
        description: packageForm.description,
        isActive: packageForm.isActive,
      };

      const response = await axios[method](url, payload, {
        withCredentials: true,
      });

      if (response.data.success) {
        toast.success(
          editingPackage
            ? "Package updated successfully!"
            : "Package created successfully!"
        );
        setIsModalOpen(false);
        fetchPackages();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving package");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (pkg) => {
    setTogglingId(pkg._id);

    try {
      const response = await axios.patch(
        `${backendUrl}/api/subscription-packages/${pkg._id}/toggle-status`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        fetchPackages();
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Error updating package status"
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Get icon component based on package name
  const getPackageIcon = (packageName) => {
    if (packageName.toLowerCase().includes("classic")) return Users;
    if (packageName.toLowerCase().includes("premium")) return Star;
    if (packageName.toLowerCase().includes("enterprise")) return Zap;
    return Package;
  };

  // Get gradient based on package name
  const getPackageGradient = (packageName) => {
    if (packageName.toLowerCase().includes("classic"))
      return "from-blue-500 to-cyan-500";
    if (packageName.toLowerCase().includes("premium"))
      return "from-purple-500 to-pink-500";
    if (packageName.toLowerCase().includes("enterprise"))
      return "from-orange-500 to-red-500";
    return "from-gray-500 to-gray-700";
  };

  // Get badge text based on package name
  const getPackageBadge = (packageName) => {
    if (packageName.toLowerCase().includes("classic")) return "Popular";
    if (packageName.toLowerCase().includes("premium")) return "Recommended";
    if (packageName.toLowerCase().includes("enterprise")) return "Best Value";
    return "Standard";
  };

  // Coin badge component (small rounded yellow coin)
  const CoinBadge = ({ coins }) => (
    <div className="flex items-center space-x-2">
      <div className="flex items-center justify-center w-5 h-5 bg-yellow-300 rounded-full">
        <span className="text-xs font-bold text-yellow-900">C</span>
      </div>
      <div className="text-gray-600 font-medium text-sm">{Number(coins).toLocaleString()}</div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center">
        <ServiceOrbitLoader show={true} size={100} speed={700} />
        <p className="text-gray-600 mt-4">Loading subscription packages...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Subscription Packages
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All packages include amazing
            features and dedicated support.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Packages</div>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {stats.active}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Active Packages
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <ToggleRight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-600">
                  {stats.inactive}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Inactive Packages
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <ToggleLeft className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Create Template
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {packageTemplates.map((template, index) => {
              const IconComponent = template.icon;
              return (
                <div
                  key={index}
                  onClick={() => handleCreateFromTemplate(template)}
                  className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer transition-all duration-300 hover:scale-105 group"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-r ${template.gradient}`}
                    >
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {template.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        ₹{template.price}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search packages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={handleCreatePackage}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add Package</span>
              </button>
            </div>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredPackages.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                No packages found
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search terms or filters"
                  : "Get started by creating your first subscription package"}
              </p>
              <button
                onClick={handleCreatePackage}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 mx-auto transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add Package</span>
              </button>
            </div>
          ) : (
            filteredPackages.map((pkg, index) => {
              const IconComponent = getPackageIcon(pkg.name);
              const gradient = getPackageGradient(pkg.name);
              const badge = getPackageBadge(pkg.name);

              return (
                <div
                  key={pkg._id}
                  className={`relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 transition-all duration-500 hover:scale-105 ${
                    pkg.isActive
                      ? "border-gray-200/50 hover:shadow-2xl"
                      : "border-red-200/50 opacity-75"
                  } ${hoveredCard === pkg._id ? "transform scale-105" : ""}`}
                  onMouseEnter={() => setHoveredCard(pkg._id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* Status Badge */}
                  <div className="absolute -top-3 -right-3">
                    <span
                      className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-bold ${
                        pkg.isActive
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                          : "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg"
                      }`}
                    >
                      {pkg.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  {/* Recommended Badge */}
                  {pkg.isActive && (
                    <div className="absolute -top-3 left-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
                        {badge}
                      </span>
                    </div>
                  )}

                  <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`p-3 rounded-xl bg-gradient-to-r ${gradient} shadow-lg`}
                        >
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            {pkg.name}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            Subscription Package
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6 text-center">
                      <div className="text-5xl font-bold text-gray-900 mb-2">
                        ₹{pkg.price}
                      </div>
                      <div className="flex items-center justify-center">
                        <CoinBadge coins={pkg.coins} />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                      <p className="text-gray-700 leading-relaxed text-center">
                        {pkg.description}
                      </p>
                    </div>

                    {/* Features */}
                    <div className="mb-8 space-y-3">
                      <div className="flex items-center space-x-3 text-gray-700">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div className="flex items-center space-x-2">
                          <CoinBadge coins={pkg.coins} />
                          <span className="text-sm">Service Coins</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-gray-700">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">Premium Support</span>
                      </div>
                      <div className="flex items-center space-x-3 text-gray-700">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">Flexible Usage</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEditPackage(pkg)}
                        className="flex-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2 px-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                      >
                        <Edit3 className="h-4 w-4" />
                        {/* <span>Modify</span> */}
                      </button>

                      <button
                        onClick={() => handleToggleActive(pkg)}
                        disabled={togglingId === pkg._id}
                        className={`flex-3 px-3 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center ${
                          pkg.isActive
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                            : "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white"
                        }`}
                      >
                        {togglingId === pkg._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : pkg.isActive ? (
                          <ToggleLeft className="h-4 w-4" />
                        ) : (
                          <ToggleRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${gradient} opacity-0 transition-opacity duration-300 pointer-events-none ${
                      hoveredCard === pkg._id ? "opacity-5" : ""
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Create/Edit Package Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingPackage ? "Edit Package" : "Create New Package"}
                </h2>

                <form onSubmit={handleSubmitPackage}>
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Package Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={packageForm.name}
                        onChange={handleFormChange}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 ${
                          validationErrors.name
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                        placeholder="Enter package name"
                        disabled={submitting}
                      />
                      {validationErrors.name && (
                        <p className="text-red-500 text-sm mt-2 flex items-center space-x-1">
                          <span>●</span>
                          <span>{validationErrors.name}</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="coins"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Coins *
                        </label>
                        <input
                          type="number"
                          id="coins"
                          name="coins"
                          value={packageForm.coins}
                          onChange={handleFormChange}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 ${
                            validationErrors.coins
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:ring-blue-500"
                          }`}
                          placeholder="0"
                          min="1"
                          step="0.01"
                          disabled={submitting}
                        />
                        {validationErrors.coins && (
                          <p className="text-red-500 text-sm mt-2 flex items-center space-x-1">
                            <span>●</span>
                            <span>{validationErrors.coins}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="price"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Price (₹) *
                        </label>
                        <input
                          type="number"
                          id="price"
                          name="price"
                          value={packageForm.price}
                          onChange={handleFormChange}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 ${
                            validationErrors.price
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:ring-blue-500"
                          }`}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={submitting}
                        />
                        {validationErrors.price && (
                          <p className="text-red-500 text-sm mt-2 flex items-center space-x-1">
                            <span>●</span>
                            <span>{validationErrors.price}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Description *
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={packageForm.description}
                        onChange={handleFormChange}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-300 ${
                          validationErrors.description
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                        placeholder="Enter package description (required)"
                        rows="3"
                        disabled={submitting}
                      />
                      {validationErrors.description && (
                        <p className="text-red-500 text-sm mt-2 flex items-center space-x-1">
                          <span>●</span>
                          <span>{validationErrors.description}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        submitting || Object.keys(validationErrors).length > 0
                      }
                      className={`px-6 py-3 text-sm font-medium text-white rounded-xl flex items-center space-x-2 transition-all duration-300 hover:scale-105 ${
                        Object.keys(validationErrors).length > 0
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      }`}
                    >
                      {submitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <span className="font-medium">
                        {submitting
                          ? editingPackage
                            ? "Updating..."
                            : "Creating..."
                          : editingPackage
                          ? "Update Package"
                          : "Create Package"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
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
}
