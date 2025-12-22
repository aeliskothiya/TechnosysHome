import React, { useState, useEffect, useContext } from "react";
import {
  Plus,
  Edit,
  Search,
  Loader2,
  Folder,
  Package,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Filter,
  ChevronUp,
  Grid3X3,
  List,
  ToggleRight,
  ToggleLeft,
  Check,
  Users,
  Star,
  Zap,
} from "lucide-react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import ServiceOrbitLoader from "../components/ServiceOrbitLoader";

export const AdminCategories = () => {
  const { backendUrl, userData } = useContext(AppContext);

  // State for both categories and sub-categories
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state - 'service' or 'sub-service'
  const [currentView, setCurrentView] = useState("service");

  // Service Categories State
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [serviceStatusFilter, setServiceStatusFilter] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Pagination for service categories
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);

  // Sub-Service Categories State
  const [subServiceSearchTerm, setSubServiceSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subServiceStatusFilter, setSubServiceStatusFilter] = useState("all");
  const [showSubServiceFilters, setShowSubServiceFilters] = useState(false);

  // Dropdown states
  const [showServiceStatusDropdown, setShowServiceStatusDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubStatusDropdown, setShowSubStatusDropdown] = useState(false);
  const [showParentCategoryDropdown, setShowParentCategoryDropdown] = useState(false);

  // Pagination for sub-service categories
  const [currentSubPage, setCurrentSubPage] = useState(1);
  const [subItemsPerPage, setSubItemsPerPage] = useState(7);

  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    isActive: true,
  });
  const [subCategoryForm, setSubCategoryForm] = useState({
    name: "",
    serviceCategoryId: "",
    price: "",
    coinsRequired: "",
    description: "",
    isActive: true,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [categoryErrors, setCategoryErrors] = useState({ name: "", image: "" });
  const [subCategoryErrors, setSubCategoryErrors] = useState({
    name: "",
    image: "",
    description: "",
    price: "",
    coinsRequired: "",
    serviceCategoryId: "",
  });
  const [dragOverArea, setDragOverArea] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [categoryValidated, setCategoryValidated] = useState(false);
  const [subCategoryValidated, setSubCategoryValidated] = useState(false);

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // No outside-click handler needed (native selects)

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchSubCategories()]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load categories data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/service-categories`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error(err.response?.data?.message || "Error fetching categories");
    }
  };

  const fetchSubCategories = async () => {
    try {
      const response = await axios.get(
        `${backendUrl}/api/sub-service-categories?includeInactive=true`,
        {
          withCredentials: true,
        }
      );
      if (response.data.success) {
        setSubCategories(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching sub-categories:", err);
      toast.error(
        err.response?.data?.message || "Error fetching sub-categories"
      );
    }
  };

  // Service Categories Functions
  const getSubCategoriesCount = (categoryId) => {
    return subCategories.filter((sub) => sub.serviceCategoryId === categoryId)
      .length;
  };

  const getActiveSubCategoriesCount = (categoryId) => {
    return subCategories.filter(
      (sub) => sub.serviceCategoryId === categoryId && sub.isActive
    ).length;
  };

  const filteredServiceCategories = categories.filter((category) => {
    const matchesSearch = category.name
      .toLowerCase()
      .includes(serviceSearchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (serviceStatusFilter === "all") return true;
    if (serviceStatusFilter === "active") return category.isActive;
    if (serviceStatusFilter === "inactive") return !category.isActive;
    return true;
  });

  // Pagination calculations for service categories
  const totalPages = Math.max(
    1,
    Math.ceil(filteredServiceCategories.length / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServiceCategories = filteredServiceCategories.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Reset to first page when search/filter/category list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [serviceSearchTerm, serviceStatusFilter, categories]);

  // Ensure current page is within bounds when filtered list or items per page changes
  useEffect(() => {
    const newTotal = Math.max(
      1,
      Math.ceil(filteredServiceCategories.length / itemsPerPage)
    );
    if (currentPage > newTotal) setCurrentPage(newTotal);
  }, [filteredServiceCategories.length, itemsPerPage, currentPage]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Sub-Service Categories Functions
  const filteredSubCategories = subCategories.filter((subCategory) => {
    const matchesSearch = subCategory.name
      .toLowerCase()
      .includes(subServiceSearchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (categoryFilter && subCategory.serviceCategoryId !== categoryFilter) {
      return false;
    }

    if (subServiceStatusFilter === "active") return subCategory.isActive;
    if (subServiceStatusFilter === "inactive") return !subCategory.isActive;

    return true;
  });

  // Pagination calculations for sub-service categories
  const totalSubPages = Math.max(
    1,
    Math.ceil(filteredSubCategories.length / subItemsPerPage)
  );
  const subStartIndex = (currentSubPage - 1) * subItemsPerPage;
  const paginatedSubCategories = filteredSubCategories.slice(
    subStartIndex,
    subStartIndex + subItemsPerPage
  );

  // Reset to first page when sub-service filters/search/list changes
  useEffect(() => {
    setCurrentSubPage(1);
  }, [
    subServiceSearchTerm,
    categoryFilter,
    subServiceStatusFilter,
    subCategories,
  ]);

  // Ensure current sub page is within bounds when filtered list or items per page changes
  useEffect(() => {
    const newTotal = Math.max(
      1,
      Math.ceil(filteredSubCategories.length / subItemsPerPage)
    );
    if (currentSubPage > newTotal) setCurrentSubPage(newTotal);
  }, [filteredSubCategories.length, subItemsPerPage, currentSubPage]);

  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c._id === categoryId);
    return category ? category.name : "Unknown Category";
  };

  // Stats calculations
  const serviceStats = {
    total: categories.length,
    active: categories.filter((c) => c.isActive).length,
    inactive: categories.filter((c) => !c.isActive).length,
    totalSubs: subCategories.length,
  };

  const subServiceStats = {
    total: subCategories.length,
    active: subCategories.filter((s) => s.isActive).length,
    inactive: subCategories.filter((s) => !s.isActive).length,
  };

  // Modal Handlers - Service Categories
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", isActive: true });
    setImageFile(null);
    setImagePreview(null);
    setCategoryErrors({ name: "", image: "" });
    setCategoryValidated(false);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      isActive: category.isActive,
    });
    if (category.image) {
      setImagePreview(`${backendUrl}${category.image}`);
    } else {
      setImagePreview(null);
    }
    setCategoryErrors({ name: "", image: "" });
    setCategoryValidated(false);
    setIsCategoryModalOpen(true);
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    setCategoryValidated(true);

    // Clear previous errors
    setCategoryErrors({ name: "", image: "" });

    let hasError = false;
    if (!categoryForm.name.trim()) {
      setCategoryErrors((s) => ({ ...s, name: "Category name is required" }));
      hasError = true;
    }
    if (!editingCategory && !imageFile) {
      setCategoryErrors((s) => ({
        ...s,
        image: "Category image is required for new categories",
      }));
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);

    try {
      const url = editingCategory
        ? `${backendUrl}/api/service-categories/${editingCategory._id}`
        : `${backendUrl}/api/service-categories`;
      const method = editingCategory ? "put" : "post";

      const payload = new FormData();
      payload.append("name", categoryForm.name);
      payload.append("isActive", categoryForm.isActive);
      if (imageFile) {
        payload.append("image", imageFile);
      }

      const response = await axios[method](url, payload, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success(
          editingCategory
            ? "Category updated successfully!"
            : "Category created successfully!"
        );
        setIsCategoryModalOpen(false);
        fetchAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving category");
    } finally {
      setSubmitting(false);
    }
  };

  // Modal Handlers - Sub Service Categories
  const handleCreateSubCategory = () => {
    setEditingSubCategory(null);
    setSubCategoryForm({
      name: "",
      serviceCategoryId: "",
      price: "",
      coinsRequired: "",
      description: "",
      isActive: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setSubCategoryErrors({
      name: "",
      image: "",
      description: "",
      price: "",
      coinsRequired: "",
      serviceCategoryId: "",
    });
    setSubCategoryValidated(false);
    setIsSubCategoryModalOpen(true);
  };

  const handleEditSubCategory = (subCategory) => {
    setEditingSubCategory(subCategory);
    setSubCategoryForm({
      name: subCategory.name,
      serviceCategoryId: subCategory.serviceCategoryId,
      price: subCategory.price,
      coinsRequired: subCategory.coinsRequired,
      description: subCategory.description || "",
      isActive: subCategory.isActive,
    });
    if (subCategory.image) {
      setImagePreview(`${backendUrl}${subCategory.image}`);
    } else {
      setImagePreview(null);
    }
    setSubCategoryErrors({
      name: "",
      image: "",
      description: "",
      price: "",
      coinsRequired: "",
      serviceCategoryId: "",
    });
    setSubCategoryValidated(false);
    setIsSubCategoryModalOpen(true);
  };

  const handleSubmitSubCategory = async (e) => {
    e.preventDefault();
    setSubCategoryValidated(true);

    // Clear previous errors
    setSubCategoryErrors({
      name: "",
      image: "",
      description: "",
      price: "",
      coinsRequired: "",
      serviceCategoryId: "",
    });

    let hasError = false;
    if (!subCategoryForm.name.trim()) {
      setSubCategoryErrors((s) => ({
        ...s,
        name: "Sub-category name is required",
      }));
      hasError = true;
    }

    if (!subCategoryForm.serviceCategoryId) {
      setSubCategoryErrors((s) => ({
        ...s,
        serviceCategoryId: "Please select a parent category",
      }));
      hasError = true;
    }

    if (!subCategoryForm.description || !subCategoryForm.description.trim()) {
      setSubCategoryErrors((s) => ({
        ...s,
        description: "Description is required",
      }));
      hasError = true;
    }

    if (!subCategoryForm.price || String(subCategoryForm.price).trim() === "") {
      setSubCategoryErrors((s) => ({ ...s, price: "Price is required" }));
      hasError = true;
    }

    if (
      !subCategoryForm.coinsRequired ||
      String(subCategoryForm.coinsRequired).trim() === ""
    ) {
      setSubCategoryErrors((s) => ({
        ...s,
        coinsRequired: "Coins required is required",
      }));
      hasError = true;
    }

    if (!editingSubCategory) {
      if (!imageFile) {
        setSubCategoryErrors((s) => ({
          ...s,
          image: "Sub-category image is required for new sub-categories",
        }));
        hasError = true;
      }
    } else {
      if (!imageFile && !imagePreview) {
        setSubCategoryErrors((s) => ({
          ...s,
          image: "Sub-category image is required",
        }));
        hasError = true;
      }
    }

    if (hasError) return;

    setSubmitting(true);

    try {
      const url = editingSubCategory
        ? `${backendUrl}/api/sub-service-categories/${editingSubCategory._id}`
        : `${backendUrl}/api/sub-service-categories`;
      const method = editingSubCategory ? "put" : "post";

      const payload = new FormData();
      payload.append("name", subCategoryForm.name);
      payload.append("serviceCategoryId", subCategoryForm.serviceCategoryId);
      payload.append("price", subCategoryForm.price);
      payload.append("description", subCategoryForm.description || "");
      payload.append("coinsRequired", subCategoryForm.coinsRequired);
      payload.append("isActive", subCategoryForm.isActive);
      if (imageFile) {
        payload.append("image", imageFile);
      }

      const response = await axios[method](url, payload, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success(
          editingSubCategory ? "Sub-category updated!" : "Sub-category created!"
        );
        setIsSubCategoryModalOpen(false);
        fetchAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving sub-category");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (item, type) => {
    const newStatus = !item.isActive;
    setTogglingId(item._id);

    try {
      if (type === "category") {
        const payload = { name: item.name, isActive: newStatus };
        await axios.put(
          `${backendUrl}/api/service-categories/${item._id}`,
          payload,
          { withCredentials: true }
        );
        await fetchAllData();
      } else {
        const payload = {
          name: item.name,
          price: item.price,
          coinsRequired: item.coinsRequired,
          isActive: newStatus,
        };
        await axios.put(
          `${backendUrl}/api/sub-service-categories/${item._id}`,
          payload,
          { withCredentials: true }
        );
        setSubCategories((prev) =>
          prev.map((s) =>
            s._id === item._id ? { ...s, isActive: newStatus } : s
          )
        );
      }
      toast.success(newStatus ? "Item activated!" : "Item deactivated!");
    } catch (err) {
      toast.error("Error updating status");
    } finally {
      setTogglingId(null);
    }
  };

  // Image handling
  const processImageFile = (file) => {
    if (!file) return false;

    const allowedExt = ["png", "jpeg", "jpg", "webp"];
    const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

    const ext = file.name.split(".").pop().toLowerCase();
    if (!allowedExt.includes(ext)) {
      const msg = "Invalid file extension. Allowed: PNG, JPEG, JPG, WebP";
      setCategoryErrors((s) => ({ ...s, image: msg }));
      setSubCategoryErrors((s) => ({ ...s, image: msg }));
      return false;
    }

    if (!allowedMimes.includes(file.type)) {
      const msg = "Invalid file type. Only PNG, JPEG, JPG, WebP are allowed";
      setCategoryErrors((s) => ({ ...s, image: msg }));
      setSubCategoryErrors((s) => ({ ...s, image: msg }));
      return false;
    }

    const MAX_FILE_SIZE = 500 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const kb = (file.size / 1024).toFixed(2);
      const msg = `File size must be less than 500 KB. Your file is ${kb} KB`;
      setCategoryErrors((s) => ({ ...s, image: msg }));
      setSubCategoryErrors((s) => ({ ...s, image: msg }));
      return false;
    }

    setCategoryErrors((s) => ({ ...s, image: "" }));
    setSubCategoryErrors((s) => ({ ...s, image: "" }));

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    return true;
  };

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      processImageFile(file);
    }
  };

  const onDropImage = (e, area) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverArea(null);
    const file =
      e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) processImageFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragEnter = (e, area) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverArea(area);
  };

  const onDragLeave = (e, area) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverArea((cur) => (cur === area ? null : cur));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setCategoryErrors((s) => ({ ...s, image: "" }));
    setSubCategoryErrors((s) => ({ ...s, image: "" }));
  };

  // Pagination Component
  const Pagination = ({ page, totalPages, onPageChange }) => {
    const getPages = () => {
      let pages = [];
      pages.push(1);

      if (page > 3) pages.push("left-gap");

      for (let p = page - 1; p <= page + 1; p++) {
        if (p > 1 && p < totalPages) pages.push(p);
      }

      if (page < totalPages - 2) pages.push("right-gap");

      if (totalPages > 1) pages.push(totalPages);

      return pages;
    };

    return (
      <div className="flex items-center justify-center gap-2 mt-6 select-none">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
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
          p === "left-gap" || p === "right-gap" ? (
            <span key={i} className="px-3 py-2 text-gray-500">
              …
            </span>
          ) : (
            <button
              key={i}
              onClick={() => onPageChange(p)}
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
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center">
        <ServiceOrbitLoader show={true} size={100} speed={700} />
        <span className="text-gray-600 mt-4">Loading categories...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Service Categories Management
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Manage all service categories and their sub-categories in one place
          </p>
        </div>

        {/* View Toggle */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-1 inline-flex shadow-lg">
            <button
              onClick={() => setCurrentView("service")}
              className={`px-6 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${
                currentView === "service"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Folder className="h-5 w-5" />
              <span className="font-medium">Service Categories</span>
            </button>
            <button
              onClick={() => setCurrentView("sub-service")}
              className={`px-6 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${
                currentView === "sub-service"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Grid3X3 className="h-5 w-5" />
              <span className="font-medium">Sub Service Categories</span>
            </button>
          </div>
        </div>

        {/* SERVICE CATEGORIES VIEW */}
        {currentView === "service" && (
          <>
            {/* Service Categories Stats */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {serviceStats.total}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Total Categories
                    </div>
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
                      {serviceStats.active}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Active Categories
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
                      {serviceStats.inactive}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Inactive Categories
                    </div>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <ToggleLeft className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-purple-600">
                      {serviceStats.totalSubs}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Total Sub-Categories
                    </div>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <FolderOpen className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Service Categories Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8 relative z-30">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search service categories..."
                    value={serviceSearchTerm}
                    onChange={(e) => setServiceSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm"
                  />
                </div>

                <div className="flex gap-3 w-full sm:w-auto items-center">
                  <div className="relative z-50">
                    <button
                      type="button"
                      onClick={() => setShowServiceStatusDropdown(!showServiceStatusDropdown)}
                      onBlur={() => setTimeout(() => setShowServiceStatusDropdown(false), 200)}
                      className="w-full sm:w-44 px-4 py-3 border border-gray-300 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-between space-x-2 hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">
                          {serviceStatusFilter === "all" && "All Status"}
                          {serviceStatusFilter === "active" && "Active Only"}
                          {serviceStatusFilter === "inactive" && "Inactive Only"}
                        </span>
                      </div>
                      {showServiceStatusDropdown ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                    </button>

                    {showServiceStatusDropdown && (
                      <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200/50 p-2 z-[100] min-w-[200px]">
                        <div
                          className={`px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                            serviceStatusFilter === "all"
                              ? "bg-blue-100 text-blue-900 font-medium"
                              : "hover:bg-blue-50 text-gray-700"
                          }`}
                          onMouseDown={() => {
                            setServiceStatusFilter("all");
                            setShowServiceStatusDropdown(false);
                          }}
                        >
                          All Status
                        </div>
                        <div
                          className={`px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                            serviceStatusFilter === "active"
                              ? "bg-blue-100 text-blue-900 font-medium"
                              : "hover:bg-blue-50 text-gray-700"
                          }`}
                          onMouseDown={() => {
                            setServiceStatusFilter("active");
                            setShowServiceStatusDropdown(false);
                          }}
                        >
                          Active Only
                        </div>
                        <div
                          className={`px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                            serviceStatusFilter === "inactive"
                              ? "bg-blue-100 text-blue-900 font-medium"
                              : "hover:bg-blue-50 text-gray-700"
                          }`}
                          onMouseDown={() => {
                            setServiceStatusFilter("inactive");
                            setShowServiceStatusDropdown(false);
                          }}
                        >
                          Inactive Only
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCreateCategory}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl flex items-center space-x-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl min-w-[200px]"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Add Category</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Service Categories List */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              {filteredServiceCategories.length === 0 ? (
                <div className="text-center py-16">
                  <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    No categories found
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {serviceSearchTerm
                      ? "Try adjusting your search terms"
                      : "Get started by creating your first category"}
                  </p>
                  <button
                    onClick={handleCreateCategory}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl flex items-center space-x-2 mx-auto transition-all duration-300 hover:scale-105 shadow-lg min-w-[200px]"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Add Category</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {paginatedServiceCategories.map((category) => {
                      const subCount = getSubCategoriesCount(category._id);
                      const activeSubCount = getActiveSubCategoriesCount(
                        category._id
                      );

                      return (
                        <div
                            key={category._id}
                            className="hover:bg-gray-50/50 transition-colors duration-200"
                          >
                            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
                              {category.image ? (
                                <img
                                  src={`${backendUrl}${category.image}`}
                                  alt={category.name}
                                  className="h-12 w-12 rounded-lg object-cover shadow-sm"
                                />
                              ) : (
                                <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-sm">
                                  <Folder className="h-6 w-6 text-white" />
                                </div>
                              )}

                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <div className="text-lg font-semibold text-gray-900">
                                    {category.name}
                                  </div>
                                  <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                      category.isActive
                                        ? "bg-green-100 text-green-800 border border-green-200"
                                        : "bg-red-100 text-red-800 border border-red-200"
                                    }`}
                                  >
                                    {category.isActive ? "ACTIVE" : "INACTIVE"}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1">
                                    <FolderOpen className="h-4 w-4" />
                                    <span>{subCount} total sub-categories</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Check className="h-4 w-4 text-green-500" />
                                    <span>{activeSubCount} active</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 mt-3 sm:mt-0">
                              <button
                                onClick={() => handleEditCategory(category)}
                                className="text-blue-600 hover:text-blue-800 p-2 rounded-lg transition-all duration-200 hover:bg-blue-50"
                                title="Edit category"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() =>
                                  handleToggleActive(category, "category")
                                }
                                disabled={togglingId === category._id}
                                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-all duration-300 focus:outline-none ${
                                  category.isActive
                                    ? "bg-green-500"
                                    : "bg-gray-300"
                                } ${
                                  togglingId === category._id
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer hover:scale-105"
                                }`}
                                title={
                                  category.isActive ? "Deactivate" : "Activate"
                                }
                              >
                                <span
                                  className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                                    category.isActive
                                      ? "translate-x-6"
                                      : "translate-x-1"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {filteredServiceCategories.length > itemsPerPage && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        onPageChange={(p) => setCurrentPage(p)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* SUB SERVICE CATEGORIES VIEW */}
        {currentView === "sub-service" && (
          <>
            {/* Sub Service Categories Stats */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {subServiceStats.total}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Total Sub Categories
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <FolderOpen className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-600">
                      {subServiceStats.active}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Active</div>
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
                      {subServiceStats.inactive}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Inactive</div>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <ToggleLeft className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sub Service Categories Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8 relative z-30">
              <div className="flex flex-col gap-4 relative z-30">
                {/* Top Row - Search and Add Button */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center relative z-30">
                  <div className="relative flex-1 w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search sub-categories..."
                      value={subServiceSearchTerm}
                      onChange={(e) => setSubServiceSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm"
                    />
                  </div>

                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      onClick={() =>
                        setShowSubServiceFilters(!showSubServiceFilters)
                      }
                      className="flex items-center space-x-2 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-300 hover:scale-105 bg-white/50 backdrop-blur-sm"
                    >
                      <Filter className="h-4 w-4" />
                      <span>Filters</span>
                      {showSubServiceFilters ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={handleCreateSubCategory}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="font-medium">Add Sub Category</span>
                    </button>
                  </div>
                </div>

                {/* Filters Row */}
                {showSubServiceFilters && (
                  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
                    {/* Category Filter */}
                    <div className="flex-1">
                      <label
                        htmlFor="categoryFilter"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Filter by Category
                      </label>
                      <div className="relative z-40">
                        <button
                          type="button"
                          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                          onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-between space-x-2 hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                          <span className="text-sm">
                            {categoryFilter
                              ? categories.find((c) => c._id === categoryFilter)?.name || "All Categories"
                              : "All Categories"}
                          </span>
                          {showCategoryDropdown ? (
                            <ChevronUp className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          )}
                        </button>

                        {showCategoryDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200/50 p-2 z-[100] max-h-60 overflow-y-auto">
                            <div
                              className={`px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                                categoryFilter === ""
                                  ? "bg-blue-100 text-blue-900 font-medium"
                                  : "hover:bg-blue-50 text-gray-700"
                              }`}
                              onMouseDown={() => {
                                setCategoryFilter("");
                                setShowCategoryDropdown(false);
                              }}
                            >
                              All Categories
                            </div>
                            {categories
                              .filter((c) => c.isActive)
                              .map((category) => (
                                <div
                                  key={category._id}
                                  className={`px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                                    categoryFilter === category._id
                                      ? "bg-blue-100 text-blue-900 font-medium"
                                      : "hover:bg-blue-50 text-gray-700"
                                  }`}
                                  onMouseDown={() => {
                                    setCategoryFilter(category._id);
                                    setShowCategoryDropdown(false);
                                  }}
                                >
                                  {category.name}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="flex-1">
                      <label
                        htmlFor="subServiceStatusFilter"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Filter by Status
                      </label>
                      <div className="relative z-40">
                        <button
                          type="button"
                          onClick={() => setShowSubStatusDropdown(!showSubStatusDropdown)}
                          onBlur={() => setTimeout(() => setShowSubStatusDropdown(false), 200)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-between space-x-2 hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                          <span className="text-sm">
                            {subServiceStatusFilter === "all" && "All Status"}
                            {subServiceStatusFilter === "active" && "Active Only"}
                            {subServiceStatusFilter === "inactive" && "Inactive Only"}
                          </span>
                          {showSubStatusDropdown ? (
                            <ChevronUp className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          )}
                        </button>

                        {showSubStatusDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200/50 p-2 z-[100] min-w-[200px]">
                            <div
                              className={`px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                                subServiceStatusFilter === "all"
                                  ? "bg-blue-100 text-blue-900 font-medium"
                                  : "hover:bg-blue-50 text-gray-700"
                              }`}
                              onMouseDown={() => {
                                setSubServiceStatusFilter("all");
                                setShowSubStatusDropdown(false);
                              }}
                            >
                              All Status
                            </div>
                            <div
                              className={`px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                                subServiceStatusFilter === "active"
                                  ? "bg-blue-100 text-blue-900 font-medium"
                                  : "hover:bg-blue-50 text-gray-700"
                              }`}
                              onMouseDown={() => {
                                setSubServiceStatusFilter("active");
                                setShowSubStatusDropdown(false);
                              }}
                            >
                              Active Only
                            </div>
                            <div
                              className={`px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                                subServiceStatusFilter === "inactive"
                                  ? "bg-blue-100 text-blue-900 font-medium"
                                  : "hover:bg-blue-50 text-gray-700"
                              }`}
                              onMouseDown={() => {
                                setSubServiceStatusFilter("inactive");
                                setShowSubStatusDropdown(false);
                              }}
                            >
                              Inactive Only
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sub Service Categories List */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              {filteredSubCategories.length === 0 ? (
                <div className="text-center py-16">
                  <Grid3X3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    No sub-categories found
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {subServiceSearchTerm ||
                    categoryFilter ||
                    subServiceStatusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Get started by creating your first sub-category"}
                  </p>
                  <button
                    onClick={handleCreateSubCategory}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 mx-auto transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Add Sub Category</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {paginatedSubCategories.map((subCategory) => (
                      <div
                        key={subCategory._id}
                        className="hover:bg-gray-50/50 transition-colors duration-200"
                      >
                        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start sm:items-center space-x-4 flex-1 min-w-0">
                            {subCategory.image ? (
                              <img
                                src={`${backendUrl}${subCategory.image}`}
                                alt={subCategory.name}
                                className="h-12 w-12 rounded-lg object-cover shadow-sm"
                              />
                            ) : (
                              <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
                                <Grid3X3 className="h-6 w-6 text-white" />
                              </div>
                            )}

                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="text-lg font-semibold text-gray-900">
                                  {subCategory.name}
                                </div>
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                    subCategory.isActive
                                      ? "bg-green-100 text-green-800 border border-green-200"
                                      : "bg-red-100 text-red-800 border border-red-200"
                                  }`}
                                >
                                  {subCategory.isActive ? "ACTIVE" : "INACTIVE"}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                <div className="flex items-center space-x-1">
                                  <Folder className="h-4 w-4" />
                                  <span>
                                    Parent:{" "}
                                    {getCategoryName(
                                      subCategory.serviceCategoryId
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1 text-green-600 font-medium">
                                  <span>₹{subCategory.price}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-purple-600 font-medium">
                                  <div className="flex items-center justify-center w-4 h-4 bg-yellow-300 rounded-full">
                                    <span className="text-xs font-bold text-black">C</span>
                                  </div>
                                  <span className="text-sm">{subCategory.coinsRequired} coins</span>
                                </div>
                              </div>
                              {subCategory.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-1">
                                  {subCategory.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 mt-3 sm:mt-0">
                            <button
                              onClick={() => handleEditSubCategory(subCategory)}
                              className="text-blue-600 hover:text-blue-800 p-2 rounded-lg transition-all duration-200 hover:bg-blue-50"
                              title="Edit sub-category"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() =>
                                handleToggleActive(subCategory, "subCategory")
                              }
                              disabled={togglingId === subCategory._id}
                              className={`relative inline-flex items-center h-6 w-11 rounded-full transition-all duration-300 focus:outline-none ${
                                subCategory.isActive
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              } ${
                                togglingId === subCategory._id
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer hover:scale-105"
                              }`}
                              title={
                                subCategory.isActive ? "Deactivate" : "Activate"
                              }
                            >
                              <span
                                className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                                  subCategory.isActive
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {filteredSubCategories.length > subItemsPerPage && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <Pagination
                        page={currentSubPage}
                        totalPages={totalSubPages}
                        onPageChange={(p) => setCurrentSubPage(p)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Service Category Modal */}
        {isCategoryModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
            onClick={() => setIsCategoryModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingCategory ? "Edit Category" : "Create New Category"}
                </h2>

                <form onSubmit={handleSubmitCategory}>
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Category Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={categoryForm.name}
                        onChange={(e) => {
                          setCategoryForm({
                            ...categoryForm,
                            name: e.target.value,
                          });
                          if (categoryValidated) {
                            setCategoryErrors((s) => ({
                              ...s,
                              name: !e.target.value.trim()
                                ? "Category name is required"
                                : "",
                            }));
                          }
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all ${
                          categoryErrors.name
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                        placeholder="Enter category name"
                        disabled={submitting}
                      />
                      {categoryErrors.name && (
                        <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                          <span>●</span>
                          <span>{categoryErrors.name}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category Image{" "}
                        {!editingCategory && (
                          <span >*</span>
                        )}
                      </label>
                      <div
                        onDragOver={onDragOver}
                        onDragEnter={(e) => onDragEnter(e, "category")}
                        onDragLeave={(e) => onDragLeave(e, "category")}
                        onDrop={(e) => onDropImage(e, "category")}
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${
                          dragOverArea === "category"
                            ? "border-blue-400 bg-blue-50 scale-105"
                            : categoryErrors.image && categoryValidated
                            ? "border-red-400 bg-red-50"
                            : "border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        {imagePreview ? (
                          <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                            <span className="text-sm text-blue-700 font-medium truncate">
                              ✓ Image selected
                            </span>
                            <button
                              type="button"
                              onClick={removeImage}
                              className="text-red-500 hover:text-red-700 ml-2 font-bold text-lg transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor="category-image-input"
                            className="cursor-pointer block"
                          >
                            <svg
                              className="w-12 h-12 mx-auto text-gray-400 mb-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <span className="block text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
                              Upload Category Image
                            </span>
                            <p className="text-xs text-gray-500 mt-2">
                              PNG, JPEG, JPG, WebP (Max 500 KB)
                              {!editingCategory && (
                                <span className=" font-medium">
                                  {" "}
                                  - Required
                                </span>
                              )}
                            </p>
                            <input
                              id="category-image-input"
                              type="file"
                              accept=".png,.jpg,.jpeg,.webp"
                              onChange={handleImageChange}
                              disabled={submitting}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {imagePreview && (
                        <div className="mt-4 flex justify-center">
                          <img
                            src={imagePreview}
                            alt="preview"
                            className="h-24 w-24 object-cover rounded-xl shadow-lg border-2 border-blue-200"
                          />
                        </div>
                      )}
                      {categoryErrors.image && (
                        <p className="text-sm text-red-600 mt-3 flex items-center space-x-1">
                          <span>●</span>
                          <span>{categoryErrors.image}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(false)}
                      className="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        (categoryValidated &&
                          (categoryErrors.name || categoryErrors.image))
                      }
                      className={`px-6 py-3 text-sm font-medium text-white rounded-xl flex items-center space-x-2 transition-all duration-300 hover:scale-105 ${
                        categoryValidated &&
                        (categoryErrors.name || categoryErrors.image)
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      }`}
                    >
                      {submitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <span className="font-medium">
                        {submitting
                          ? editingCategory
                            ? "Updating..."
                            : "Creating..."
                          : editingCategory
                          ? "Update Category"
                          : "Create Category"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Sub Category Modal */}
        {isSubCategoryModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
            onClick={() => setIsSubCategoryModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingSubCategory
                    ? "Edit Sub-Category"
                    : "Create New Sub-Category"}
                </h2>

                <form onSubmit={handleSubmitSubCategory}>
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="parentCategory"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Parent Category *
                      </label>
                      <div className="relative z-40">
                        <button
                          type="button"
                          onClick={() => setShowParentCategoryDropdown(!showParentCategoryDropdown)}
                          onBlur={() => setTimeout(() => setShowParentCategoryDropdown(false), 200)}
                          disabled={submitting}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all flex items-center justify-between ${
                            subCategoryErrors.serviceCategoryId
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:ring-blue-500"
                          } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <span className={`text-sm ${!subCategoryForm.serviceCategoryId ? "text-gray-500" : ""}`}>
                            {subCategoryForm.serviceCategoryId
                              ? categories.find((c) => c._id === subCategoryForm.serviceCategoryId)?.name || "Select a category"
                              : "Select a category"}
                          </span>
                          {showParentCategoryDropdown ? (
                            <ChevronUp className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          )}
                        </button>

                        {showParentCategoryDropdown && !submitting && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200/50 p-2 z-[100] max-h-60 overflow-y-auto">
                            <div
                              className={`px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                                subCategoryForm.serviceCategoryId === ""
                                  ? "bg-blue-100 text-blue-900 font-medium"
                                  : "hover:bg-blue-50 text-gray-500"
                              }`}
                              onMouseDown={() => {
                                setSubCategoryForm({
                                  ...subCategoryForm,
                                  serviceCategoryId: "",
                                });
                                if (subCategoryValidated) {
                                  setSubCategoryErrors((s) => ({
                                    ...s,
                                    serviceCategoryId: "Please select a parent category",
                                  }));
                                }
                                setShowParentCategoryDropdown(false);
                              }}
                            >
                              Select a category
                            </div>
                            {categories
                              .filter((c) => c.isActive)
                              .map((category) => (
                                <div
                                  key={category._id}
                                  className={`px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                                    subCategoryForm.serviceCategoryId === category._id
                                      ? "bg-blue-100 text-blue-900 font-medium"
                                      : "hover:bg-blue-50 text-gray-700"
                                  }`}
                                  onMouseDown={() => {
                                    setSubCategoryForm({
                                      ...subCategoryForm,
                                      serviceCategoryId: category._id,
                                    });
                                    if (subCategoryValidated) {
                                      setSubCategoryErrors((s) => ({
                                        ...s,
                                        serviceCategoryId: "",
                                      }));
                                    }
                                    setShowParentCategoryDropdown(false);
                                  }}
                                >
                                  {category.name}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      {subCategoryErrors.serviceCategoryId && (
                        <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                          <span>●</span>
                          <span>{subCategoryErrors.serviceCategoryId}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="subCategoryName"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Sub-Category Name *
                      </label>
                      <input
                        type="text"
                        id="subCategoryName"
                        value={subCategoryForm.name}
                        onChange={(e) => {
                          setSubCategoryForm({
                            ...subCategoryForm,
                            name: e.target.value,
                          });
                          if (subCategoryValidated) {
                            setSubCategoryErrors((s) => ({
                              ...s,
                              name: !e.target.value.trim()
                                ? "Sub-category name is required"
                                : "",
                            }));
                          }
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all ${
                          subCategoryErrors.name
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                        placeholder="Enter sub-category name"
                        disabled={submitting}
                      />
                      {subCategoryErrors.name && (
                        <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                          <span>●</span>
                          <span>{subCategoryErrors.name}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="subCategoryDescription"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Description *
                      </label>
                      <textarea
                        id="subCategoryDescription"
                        value={subCategoryForm.description}
                        onChange={(e) => {
                          setSubCategoryForm({
                            ...subCategoryForm,
                            description: e.target.value,
                          });
                          if (subCategoryValidated) {
                            setSubCategoryErrors((s) => ({
                              ...s,
                              description: !e.target.value.trim()
                                ? "Description is required"
                                : "",
                            }));
                          }
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all ${
                          subCategoryErrors.description
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                        placeholder="Short description about this sub-category"
                        rows={3}
                        disabled={submitting}
                      />
                      {subCategoryErrors.description && (
                        <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                          <span>●</span>
                          <span>{subCategoryErrors.description}</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                          value={subCategoryForm.price}
                          onChange={(e) => {
                            setSubCategoryForm({
                              ...subCategoryForm,
                              price: e.target.value,
                            });
                            if (subCategoryValidated) {
                              setSubCategoryErrors((s) => ({
                                ...s,
                                price: !e.target.value.trim()
                                  ? "Price is required"
                                  : "",
                              }));
                            }
                          }}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all ${
                            subCategoryErrors.price
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:ring-blue-500"
                          }`}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={submitting}
                        />
                        {subCategoryErrors.price && (
                          <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                            <span>●</span>
                            <span>{subCategoryErrors.price}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="coinsRequired"
                          className="block text-sm font-medium text-gray-700 mb-2 items-center space-x-2"
                        >
                          {/* <div className="flex items-center justify-center w-5 h-5 bg-yellow-300 rounded-full">
                            <span className="text-xs font-bold text-yellow-900">₵</span>
                          </div> */}
                          <span>Coins Required *</span>
                        </label>
                        <input
                          type="number"
                          id="coinsRequired"
                          value={subCategoryForm.coinsRequired}
                          onChange={(e) => {
                            setSubCategoryForm({
                              ...subCategoryForm,
                              coinsRequired: e.target.value,
                            });
                            if (subCategoryValidated) {
                              setSubCategoryErrors((s) => ({
                                ...s,
                                coinsRequired: !e.target.value.trim()
                                  ? "Coins required is required"
                                  : "",
                              }));
                            }
                          }}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all ${
                            subCategoryErrors.coinsRequired
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:ring-blue-500"
                          }`}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          disabled={submitting}
                        />
                        {subCategoryErrors.coinsRequired && (
                          <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                            <span>●</span>
                            <span>{subCategoryErrors.coinsRequired}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sub-Category Image{" "}
                        {!editingSubCategory && (
                          <span >*</span>
                        )}
                      </label>
                      <div
                        onDragOver={onDragOver}
                        onDragEnter={(e) => onDragEnter(e, "subCategory")}
                        onDragLeave={(e) => onDragLeave(e, "subCategory")}
                        onDrop={(e) => onDropImage(e, "subCategory")}
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${
                          dragOverArea === "subCategory"
                            ? "border-blue-400 bg-blue-50 scale-105"
                            : subCategoryErrors.image && subCategoryValidated
                            ? "border-red-400 bg-red-50"
                            : "border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        {imagePreview ? (
                          <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                            <span className="text-sm text-blue-700 font-medium truncate">
                              ✓ Image selected
                            </span>
                            <button
                              type="button"
                              onClick={removeImage}
                              className="text-red-500 hover:text-red-700 ml-2 font-bold text-lg transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor="subcategory-image-input"
                            className="cursor-pointer block"
                          >
                            <svg
                              className="w-12 h-12 mx-auto text-gray-400 mb-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <span className="block text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
                              Upload Sub-Category Image
                            </span>
                            <p className="text-xs text-gray-500 mt-2">
                              PNG, JPEG, JPG, WebP (Max 500 KB)
                              {!editingSubCategory && (
                                <span className="font-medium">
                                  {" "}
                                  - Required
                                </span>
                              )}
                            </p>
                            <input
                              id="subcategory-image-input"
                              type="file"
                              accept=".png,.jpg,.jpeg,.webp"
                              onChange={handleImageChange}
                              disabled={submitting}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {imagePreview && (
                        <div className="mt-4 flex justify-center">
                          <img
                            src={imagePreview}
                            alt="preview"
                            className="h-24 w-24 object-cover rounded-xl shadow-lg border-2 border-blue-200"
                          />
                        </div>
                      )}
                      {subCategoryErrors.image && (
                        <p className="text-sm text-red-600 mt-3 flex items-center space-x-1">
                          <span>●</span>
                          <span>{subCategoryErrors.image}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setIsSubCategoryModalOpen(false)}
                      className="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        (subCategoryValidated &&
                          Object.values(subCategoryErrors).some((err) => err))
                      }
                      className={`px-6 py-3 text-sm font-medium text-white rounded-xl flex items-center space-x-2 transition-all duration-300 hover:scale-105 ${
                        subCategoryValidated &&
                        Object.values(subCategoryErrors).some((err) => err)
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      }`}
                    >
                      {submitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <span className="font-medium">
                        {submitting
                          ? editingSubCategory
                            ? "Updating..."
                            : "Creating..."
                          : editingSubCategory
                          ? "Update Sub-Category"
                          : "Create Sub-Category"}
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
};
