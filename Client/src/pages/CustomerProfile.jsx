import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { Loader2, Save, X, User, Phone, Mail } from "lucide-react";
import MapPicker from "../components/MapPicker.jsx";
import ServiceOrbitLoader from "../components/ServiceOrbitLoader";

const CustomerProfile = () => {
  const { backendUrl, userData } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Validation State
  const [errors, setErrors] = useState({
    Name: "",
    Mobile: "",
    Email: "",
    Address: "",
    HouseNumber: "",
    Pincode: "",
  });

  // Profile State
  const [profile, setProfile] = useState({
    Name: "",
    Mobile: "",
    Email: "",
    Address: {
      houseNumber: "",
      street: "",
      city: "",
      pincode: "",
    },
    latitude: undefined,
    longitude: undefined,
  });
  const [showMapPicker, setShowMapPicker] = useState(false);

  // File Upload State
  // No photo upload for customers - removed photo state

  // Password change UI removed for customers

  // Email Verification Modal
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailOTPSent, setEmailOTPSent] = useState(false);
  const [emailOTP, setEmailOTP] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [sendingEmailOTP, setSendingEmailOTP] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailDisabled, setEmailDisabled] = useState(true);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOTP, setCanResendOTP] = useState(false);

  const customerId = userData?.id;

  // Fetch profile on mount
  useEffect(() => {
    if (customerId) {
      fetchProfileData();
    }
  }, [customerId]);

  // OTP Timer Effect
  useEffect(() => {
    let interval;
    if (emailOTPSent && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0 && emailOTPSent) {
      setCanResendOTP(true);
    }
    return () => clearInterval(interval);
  }, [emailOTPSent, otpTimer]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${backendUrl}/api/customer-profile/${customerId}`,
        {
          withCredentials: true,
        }
      );

      if (res.data.success) {
        const customer = res.data.data;
        setProfile({
          Name: customer.Name || customer.name || "",
          Mobile: customer.Mobile || customer.mobile || "",
          Email: customer.Email || customer.email || "",
          Address:
            customer.Address && typeof customer.Address === "object"
              ? customer.Address
              : customer.Address || customer.address || { houseNumber: "", street: "", city: "", pincode: "" },
          latitude:
            customer.location && Array.isArray(customer.location.coordinates)
              ? customer.location.coordinates[1]
              : undefined,
          longitude:
            customer.location && Array.isArray(customer.location.coordinates)
              ? customer.location.coordinates[0]
              : undefined,
        });
        
        // If email is not set (null/empty), enable the field for user to add email
        setEmailDisabled(customer.Email ? true : false);
        
        // Clear any stale validation errors after loading profile
        setErrors({ Name: "", Mobile: "", Email: "", Address: "", HouseNumber: "", Pincode: "" });
      } else {
        toast.error(res.data.message || "Failed to fetch profile");
      }
    } catch (error) {
      console.error("Fetch profile error:", error);
      toast.error("Error fetching profile data");
    } finally {
      setLoading(false);
    }
  };

  // Input Filtering Functions
  const filterNameInput = (value) => {
    return value.replace(/[^a-zA-Z\s]/g, "");
  };

  const filterMobileInput = (value) => {
    return value.replace(/\D/g, "").slice(0, 10);
  };

  const filterHouseInput = (value) => {
    return value.replace(/[^a-zA-Z0-9\s\-\/.,#]/g, "").slice(0, 50);
  };

  // Validation Helper Functions
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Name validation
    if (!profile.Name || profile.Name.trim().length === 0) {
      newErrors.Name = "Name is required";
      isValid = false;
    } else if (profile.Name.trim().length < 2) {
      newErrors.Name = "Name must be at least 2 characters";
      isValid = false;
    } else if (profile.Name.length > 50) {
      newErrors.Name = "Name must not exceed 50 characters";
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(profile.Name)) {
      newErrors.Name = "Name can only contain letters and spaces";
      isValid = false;
    }

    // Mobile validation
    if (profile.Mobile && !/^\d{10}$/.test(profile.Mobile.replace(/\D/g, ""))) {
      newErrors.Mobile = "Mobile must be 10 digits";
      isValid = false;
    }

    // Email validation
    if (profile.Email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profile.Email)) {
        newErrors.Email = "Please enter a valid email address";
        isValid = false;
      }
    }

    // Address validation: support structured Address object or legacy string
    if (profile.Address && typeof profile.Address === "object") {
      const house = (profile.Address.houseNumber || "").toString().trim();
      const pin = (profile.Address.pincode || "").toString().trim();
      if (!house) {
        newErrors.Address = "House/Flat number is required";
        newErrors.HouseNumber = "House/Flat number is required";
        isValid = false;
      } else if (house.length < 1) {
        newErrors.HouseNumber = "Enter a valid house/flat number";
        isValid = false;
      }

      if (!pin) {
        newErrors.Address = newErrors.Address || "Pincode is required";
        newErrors.Pincode = "Pincode is required";
        isValid = false;
      } else if (!/^\d{6}$/.test(pin)) {
        newErrors.Pincode = "Pincode must be 6 digits";
        isValid = false;
      }
    } else {
      // legacy textarea string
      if (!profile.Address || profile.Address.trim().length === 0) {
        newErrors.Address = "Address is required";
        isValid = false;
      } else if (profile.Address.trim().length < 5) {
        newErrors.Address = "Address must be at least 5 characters";
        isValid = false;
      } else if (profile.Address.length > 200) {
        newErrors.Address = "Address must not exceed 200 characters";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const validateField = (fieldName, value) => {
    const newErrors = { ...errors };

    switch (fieldName) {
      case "Name":
        if (!value || value.trim().length === 0) {
          newErrors.Name = "Name is required";
        } else if (value.trim().length < 2) {
          newErrors.Name = "Name must be at least 2 characters";
        } else if (value.length > 50) {
          newErrors.Name = "Name must not exceed 50 characters";
        } else if (!/^[a-zA-Z\s]+$/.test(value)) {
          newErrors.Name = "Name can only contain letters and spaces";
        } else {
          newErrors.Name = "";
        }
        break;

      case "Mobile":
        if (value && !/^\d{10}$/.test(value.replace(/\D/g, ""))) {
          newErrors.Mobile = "Mobile must be 10 digits";
        } else {
          newErrors.Mobile = "";
        }
        break;
      case "Email":
        if (value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors.Email = "Please enter a valid email";
          } else {
            newErrors.Email = "";
          }
        }
        break;

      case "Address":
        // support structured Address object or legacy textarea string
        if (value && typeof value === "object") {
          const house = (value.houseNumber || "").toString().trim();
          const pin = (value.pincode || "").toString().trim();
          if (!house) newErrors.Address = "House/Flat number is required";
          else if (!pin) newErrors.Address = "Pincode is required";
          else newErrors.Address = "";
        } else {
          if (!value || value.trim().length === 0) {
            newErrors.Address = "Address is required";
          } else if (value.trim().length < 5) {
            newErrors.Address = "Address must be at least 5 characters";
          } else if (value.length > 200) {
            newErrors.Address = "Address must not exceed 200 characters";
          } else {
            newErrors.Address = "";
          }
        }
        break;

      case "HouseNumber":
        if (!value || value.trim().length === 0) {
          newErrors.HouseNumber = "House/Flat number is required";
        } else if (value.trim().length < 1) {
          newErrors.HouseNumber = "Enter a valid house/flat number";
        } else if (!/^[a-zA-Z0-9\s\-\/.,#]+$/.test(value)) {
          newErrors.HouseNumber = "Invalid characters in house/flat number";
        } else {
          newErrors.HouseNumber = "";
        }
        if (!newErrors.HouseNumber) newErrors.Address = newErrors.Address || "";
        break;

      case "Pincode":
        if (!value || value.trim().length === 0) {
          newErrors.Pincode = "Pincode is required";
        } else if (!/^\d{6}$/.test(value.trim())) {
          newErrors.Pincode = "Pincode must be 6 digits";
        } else {
          newErrors.Pincode = "";
        }
        if (!newErrors.Pincode) newErrors.Address = newErrors.Address || "";
        break;

      case "Password":
        if (!value) {
          newErrors.Password = "Password is required";
        } else if (value.length < 8) {
          newErrors.Password = "Password must be at least 8 characters";
        } else if (!/(?=.*[a-z])/.test(value)) {
          newErrors.Password =
            "Password must contain at least one lowercase letter";
        } else if (!/(?=.*[A-Z])/.test(value)) {
          newErrors.Password =
            "Password must contain at least one uppercase letter";
        } else if (!/(?=.*\d)/.test(value)) {
          newErrors.Password = "Password must contain at least one number";
        } else if (!/(?=.*[@$!%*?&])/.test(value)) {
          newErrors.Password =
            "Password must contain at least one special character (@$!%*?&).";
        } else {
          newErrors.Password = "";
        }
        if (
          passwordForm.confirmPassword &&
          passwordForm.confirmPassword !== value
        ) {
          newErrors.ConfirmPassword = "Confirmation does not match";
        } else if (passwordForm.confirmPassword) {
          newErrors.ConfirmPassword = "";
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleProfileChange = (field, value) => {
    // If email is edited, mark it unverified locally until re-verified
    if (field === "Email") {
      setEmailVerified(false);
    }
    setProfile({ ...profile, [field]: value });
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      toast.error("Please fill all fields before saving");
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        Name: profile.Name,
        Mobile: profile.Mobile,
        Email: profile.Email,
        Address: profile.Address,
      };

      // include lat/lng when present so backend can update GeoJSON location
      if (profile.latitude !== undefined && profile.longitude !== undefined) {
        updateData.latitude = profile.latitude;
        updateData.longitude = profile.longitude;
      }
      

      const res = await axios.put(
        `${backendUrl}/api/customer-profile/${customerId}`,
        updateData,
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success(res.data.message || "Profile updated successfully");
        fetchProfileData();
      } else {
        toast.error(res.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Save profile error:", error);
      toast.error(error.response?.data?.message || "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  // Email Verification Functions - FIXED ENDPOINTS
  const handleSendEmailOTP = async () => {
    if (!newEmail) {
      toast.error("Please enter email address");
      return;
    }

    try {
      setSendingEmailOTP(true);
      const res = await axios.post(
        `${backendUrl}/api/customer-profile/send-email-otp/${customerId}`, // ✅ FIXED
        { newEmail },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success("OTP sent to your email");
        setEmailOTPSent(true);
        setOtpTimer(120); // 2 minutes timer
        setCanResendOTP(false);

        // In development mode, auto-fill OTP
        if (res.data.otp) {
          setEmailOTP(res.data.otp);
        }
        if (res.data.previewUrl) {
          console.log("Email preview URL:", res.data.previewUrl);
        }
      } else {
        toast.error(res.data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Send email OTP error:", error);
      toast.error(error.response?.data?.message || "Error sending OTP");
    } finally {
      setSendingEmailOTP(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (!emailOTP) {
      toast.error("Please enter OTP");
      return;
    }

    try {
      setVerifyingEmail(true);
      const res = await axios.post(
        `${backendUrl}/api/customer-profile/verify-email-otp/${customerId}`, // ✅ FIXED
        { newEmail, otp: emailOTP },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success("Email verified successfully");
        // Update profile with new email
        setProfile({ ...profile, Email: newEmail });
        setEmailVerified(true);
        setEmailDisabled(true);
        setShowEmailVerification(false);
        setEmailOTPSent(false);
        setEmailOTP("");
        setNewEmail("");
        setOtpTimer(0);
        setCanResendOTP(false);
        // Clear email validation errors
        setErrors({ ...errors, Email: "" });
      } else {
        toast.error(res.data.message || "Failed to verify OTP");
      }
    } catch (error) {
      console.error("Verify email OTP error:", error);
      toast.error(error.response?.data?.message || "Error verifying OTP");
    } finally {
      setVerifyingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <ServiceOrbitLoader size={140} />
          <p className="text-gray-600 font-medium">Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-gray-600 mt-3 text-lg">
            Manage your profile information
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Sidebar - Profile Photo */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 border-4 border-blue-50 flex items-center justify-center mx-auto">
                    <User className="w-12 h-12 text-blue-400" />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mt-4">
                  {profile.Name || "Customer Name"}
                </h2>
                {/* <p className="text-gray-600 text-sm mt-1">Customer</p> */}

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{profile.Mobile || "Not provided"}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{profile.Email || "Not provided"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Profile Information Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Profile Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.Name}
                      onChange={(e) => {
                        const filteredValue = filterNameInput(e.target.value);
                        handleProfileChange("Name", filteredValue);
                        validateField("Name", filteredValue);
                      }}
                      onBlur={(e) => validateField("Name", e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.Name
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                      }`}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.Name && (
                    <p className="text-red-500 text-sm font-medium">
                      {errors.Name}
                    </p>
                  )}
                </div>

                {/* Mobile Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={profile.Mobile}
                      onChange={(e) => {
                        const filteredValue = filterMobileInput(e.target.value);
                        handleProfileChange("Mobile", filteredValue);
                        validateField("Mobile", filteredValue);
                      }}
                      onBlur={(e) => validateField("Mobile", e.target.value)}
                      disabled={true}
                      className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 ${
                        errors.Mobile
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 bg-gray-100 cursor-not-allowed"
                      }`}
                      placeholder="Enter 10-digit mobile number"
                      title="Mobile number is not editable"
                    />
                  </div>
                  {errors.Mobile && (
                    <p className="text-red-500 text-sm font-medium">
                      {errors.Mobile}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profile.Email}
                      onChange={(e) => {
                        handleProfileChange("Email", e.target.value);
                        validateField("Email", e.target.value);
                      }}
                      onBlur={(e) => validateField("Email", e.target.value)}
                      disabled={emailDisabled}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.Email
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                      } ${
                        emailDisabled ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      placeholder="Enter valid email address"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          // open verification modal and allow entering email
                          setNewEmail(profile.Email || "");
                          setEmailOTPSent(false);
                          setEmailOTP("");
                          setShowEmailVerification(true);
                          // enable modal input always; main input remains disabled until verified
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all duration-200 text-sm"
                      >
                        <Mail className="w-3 h-3" />
                        Verify
                      </button>
                    </div>
                  </div>
                  {errors.Email && (
                    <p className="text-red-500 text-sm font-medium">
                      {errors.Email}
                    </p>
                  )}
                </div>

                {/* Address Field (structured with map picker) */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Address (you can pick on map)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={(profile.Address && profile.Address.houseNumber) || ""}
                        onChange={(e) => {
                          const v = filterHouseInput(e.target.value);
                          handleProfileChange("Address", { ...(profile.Address || {}), houseNumber: v });
                          validateField("HouseNumber", v);
                        }}
                        onBlur={(e) => validateField("HouseNumber", e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl ${errors.HouseNumber ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        placeholder="House/Flat Number"
                      />
                      {errors.HouseNumber && (
                        <p className="text-red-500 text-xs font-medium mt-1">{errors.HouseNumber}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <input
                        type="text"
                        value={(profile.Address && profile.Address.street) || ""}
                        onChange={(e) =>
                          handleProfileChange("Address", { ...(profile.Address || {}), street: e.target.value })
                        }
                        className="w-full px-4 py-3 border-2 rounded-xl border-gray-200"
                        placeholder="Street (optional)"
                      />
                    </div>

                    <div className="space-y-1">
                      <input
                        type="text"
                        value={(profile.Address && profile.Address.city) || ""}
                        onChange={(e) =>
                          handleProfileChange("Address", { ...(profile.Address || {}), city: e.target.value })
                        }
                        className="w-full px-4 py-3 border-2 rounded-xl border-gray-200"
                        placeholder="City (optional)"
                      />
                    </div>

                    <div className="space-y-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={(profile.Address && profile.Address.pincode) || ""}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                          handleProfileChange("Address", { ...(profile.Address || {}), pincode: v });
                          validateField("Pincode", v);
                        }}
                        onBlur={(e) => validateField("Pincode", e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl ${errors.Pincode ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        placeholder="Pincode"
                      />
                      {errors.Pincode && (
                        <p className="text-red-500 text-xs font-medium mt-1">{errors.Pincode}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="px-4 py-3 bg-blue-600 text-white rounded-xl"
                      >
                        Pick on map
                      </button>
                      <div className="text-sm text-gray-500">
                        {profile.latitude && profile.longitude ? (
                          <div>
                            Lat: {Number(profile.latitude).toFixed(6)}, Lng: {Number(profile.longitude).toFixed(6)}
                          </div>
                        ) : (
                          <div className="italic">No pin selected</div>
                        )}
                      </div>
                    </div>
                  </div>
                  {errors.Address && <p className="text-red-500 text-sm font-medium">{errors.Address}</p>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-2xl jus shadow-lg border border-gray-200 p-6 flex flex-col sm:flex-row gap-4">
              {/* <div className="flex-1" /> */}
              <button
                onClick={handleSaveProfile}
                disabled={
                  saving || Object.values(errors).some((err) => err !== "")
                }
                className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map picker modal */}
      {showMapPicker && (
        <MapPicker
          initialLat={profile.latitude}
          initialLng={profile.longitude}
          onSave={(res) => {
            setProfile({ ...profile, Address: res.address, latitude: res.lat, longitude: res.lng });
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* Email Verification Modal */}
      {showEmailVerification && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowEmailVerification(false);
            setEmailOTPSent(false);
            setEmailOTP("");
            setNewEmail("");
            setOtpTimer(0);
            setCanResendOTP(false);
          }
        }}>
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-slate-700/50 max-w-md w-full p-8 transform transition-all duration-300 scale-100">
            {/* Header with Lock Icon */}
            {!emailOTPSent ? (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Mail className="w-6 h-6 text-blue-400" />
                    Update Email
                  </h2>
                  <button
                    onClick={() => {
                      setShowEmailVerification(false);
                      setEmailOTPSent(false);
                      setEmailOTP("");
                      setNewEmail("");
                      setOtpTimer(0);
                      setCanResendOTP(false);
                    }}
                    className="text-gray-400 hover:text-gray-300 transition-colors duration-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <label className="block text-sm font-semibold text-gray-300">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={sendingEmailOTP}
                    className="w-full px-4 py-3 border-2 border-gray-600 bg-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-900 disabled:cursor-not-allowed text-white placeholder-gray-500"
                    placeholder="Enter new email address"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowEmailVerification(false);
                      setEmailOTPSent(false);
                      setEmailOTP("");
                      setNewEmail("");
                      setOtpTimer(0);
                      setCanResendOTP(false);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-600 rounded-lg text-gray-300 hover:bg-slate-700 font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmailOTP}
                    disabled={sendingEmailOTP}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {sendingEmailOTP && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {sendingEmailOTP ? "Sending..." : "Send OTP"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* OTP Verification Screen */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Enter Verification Code
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Enter the 6-digit code sent to <span className="text-blue-300 font-semibold">{newEmail}</span>
                  </p>
                </div>

                {/* OTP Digit Boxes */}
                <div className="mb-8">
                  <div className="flex justify-center gap-3 mb-6">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength="1"
                        value={emailOTP[index] || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (value.length <= 1) {
                            const newOTP = emailOTP.split("");
                            newOTP[index] = value;
                            setEmailOTP(newOTP.join(""));
                            // Auto-focus next input
                            if (value && index < 5) {
                              const nextInput = document.querySelector(
                                `input[data-otp-index="${index + 1}"]`
                              );
                              nextInput?.focus();
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !emailOTP[index] && index > 0) {
                            const prevInput = document.querySelector(
                              `input[data-otp-index="${index - 1}"]`
                            );
                            prevInput?.focus();
                          }
                        }}
                        data-otp-index={index}
                        disabled={verifyingEmail}
                        className={`w-12 h-12 text-center text-lg font-bold rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                          emailOTP[index]
                            ? "border-blue-500 bg-blue-500 bg-opacity-20 text-white"
                            : "border-gray-600 bg-slate-800 text-gray-400 focus:border-blue-500"
                        } disabled:cursor-not-allowed`}
                        placeholder="•"
                      />
                    ))}
                  </div>

                  {/* Timer and Resend */}
                  <div className="text-center mb-6">
                    {otpTimer > 0 ? (
                      <p className="text-gray-400 text-sm">
                        Resend OTP in{" "}
                        <span className="text-blue-400 font-semibold">
                          {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}
                        </span>
                      </p>
                    ) : canResendOTP ? (
                      <button
                        onClick={() => {
                          setEmailOTP("");
                          setOtpTimer(0);
                          setCanResendOTP(false);
                          handleSendEmailOTP();
                        }}
                        className="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-200"
                      >
                        Resend OTP
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowEmailVerification(false);
                      setEmailOTPSent(false);
                      setEmailOTP("");
                      setNewEmail("");
                      setOtpTimer(0);
                      setCanResendOTP(false);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-600 rounded-lg text-gray-300 hover:bg-slate-700 font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyEmailOTP}
                    disabled={emailOTP.length !== 6 || verifyingEmail || (emailOTPSent && otpTimer === 0)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {verifyingEmail && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {verifyingEmail ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
