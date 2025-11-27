import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { Eye, EyeOff, Lock, Upload, Loader2, Save, X, Phone, Mail, User, Building, CreditCard, Shield, Camera, FileText } from "lucide-react";
import MapPicker from "../components/MapPicker";

const TechnicianProfile = () => {
  const { backendUrl } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Validation State
  const [errors, setErrors] = useState({
    Name: "",
    MobileNumber: "",
    Email: "",
    Address: "",
    BankAccountNo: "",
    IFSCCode: "",
    services: "",
    Password: "",
    ConfirmPassword: "",
    HouseNumber: "",
    Pincode: "",
    photo: "",
  });

  // Profile State
  const [profile, setProfile] = useState({
    Name: "",
    MobileNumber: "",
    Email: "",
    Address: {
      houseNumber: "",
      street: "",
      city: "",
      pincode: "",
    },
    Photo: "",
    IDProof: "",
  });
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Bank Details State
  const [bankDetails, setBankDetails] = useState({
    BankAccountNo: "",
    IFSCCode: "",
  });

  // Services State
  const [allServices, setAllServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);

  // File Upload State
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [idProofFile, setIdProofFile] = useState(null);

  // Password Change Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Mobile Verification Modal
  const [showMobileVerification, setShowMobileVerification] = useState(false);
  const [mobileOTPSent, setMobileOTPSent] = useState(false);
  const [mobileOTP, setMobileOTP] = useState("");
  const [verifyingMobile, setVerifyingMobile] = useState(false);
  const [sendingMobileOTP, setSendingMobileOTP] = useState(false);
  const [newMobileNumber, setNewMobileNumber] = useState("");

  // Email Verification Modal
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailOTPSent, setEmailOTPSent] = useState(false);
  const [emailOTP, setEmailOTP] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [sendingEmailOTP, setSendingEmailOTP] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtpTimer, setEmailOtpTimer] = useState(0);
  const [canResendEmailOTP, setCanResendEmailOTP] = useState(false);
  
  // Mobile OTP Timer
  const [mobileOtpTimer, setMobileOtpTimer] = useState(0);
  const [canResendMobileOTP, setCanResendMobileOTP] = useState(false);

  // Fetch profile and services on mount
  useEffect(() => {
    fetchProfileData();
    fetchServices();
  }, []);

  // Mobile OTP Timer Effect
  useEffect(() => {
    let interval;
    if (mobileOTPSent && mobileOtpTimer > 0) {
      interval = setInterval(() => {
        setMobileOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (mobileOtpTimer === 0 && mobileOTPSent) {
      setCanResendMobileOTP(true);
    }
    return () => clearInterval(interval);
  }, [mobileOTPSent, mobileOtpTimer]);

  // Email OTP Timer Effect
  useEffect(() => {
    let interval;
    if (emailOTPSent && emailOtpTimer > 0) {
      interval = setInterval(() => {
        setEmailOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (emailOtpTimer === 0 && emailOTPSent) {
      setCanResendEmailOTP(true);
    }
    return () => clearInterval(interval);
  }, [emailOTPSent, emailOtpTimer]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/technician/profile`, {
        withCredentials: true,
      });

      if (res.data.success) {
        const { technician, bankDetails: bd, services } = res.data.data;

        setProfile({
          Name: technician.Name || "",
          MobileNumber: technician.MobileNumber || "",
          Email: technician.Email || "",
          Address: technician.Address || "",
          Photo: technician.Photo || "",
          IDProof: technician.IDProof || "",
          latitude:
            technician.location && Array.isArray(technician.location.coordinates)
              ? technician.location.coordinates[1]
              : undefined,
          longitude:
            technician.location && Array.isArray(technician.location.coordinates)
              ? technician.location.coordinates[0]
              : undefined,
        });

        setBankDetails({
          BankAccountNo: bd?.BankAccountNo || "",
          IFSCCode: bd?.IFSCCode || "",
        });

        // Keep service objects with populated ServiceCategory and SubServices
        setSelectedServices(
          services.map((s) => {
            // ensure ServiceCategoryID is the populated object when possible
            const populated = s.ServiceCategoryID && s.ServiceCategoryID._id ? s.ServiceCategoryID : s.ServiceCategoryID;
            return {
              ...s,
              ServiceCategoryID: populated,
            };
          })
        );
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

  const fetchServices = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/service-categories`, {
        withCredentials: true,
      });

      if (res.data.success) {
        setAllServices(res.data.data || []);
      }
    } catch (error) {
      console.error("Fetch services error:", error);
      toast.error("Error fetching services");
    }
  };

  const handleToggleService = (serviceId, serviceName) => {
    const exists = selectedServices.find(
      (s) => String(s.ServiceCategoryID) === String(serviceId)
    );

    if (exists) {
      setSelectedServices(
        selectedServices.filter(
          (s) => String(s.ServiceCategoryID) !== String(serviceId)
        )
      );
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          ServiceCategoryID: serviceId,
          ServiceName: serviceName,
          Price: 0,
          CoinsRequired: 0,
        },
      ]);
    }
  };

  const handleServiceFieldChange = (serviceId, field, value) => {
    setSelectedServices(
      selectedServices.map((s) =>
        String(s.ServiceCategoryID) === String(serviceId)
          ? { ...s, [field]: isNaN(value) ? value : Number(value) }
          : s
      )
    );
  };

  const handleProfileChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  // Input Filtering Functions
  const filterNameInput = (value) => {
    // Remove all numbers and special characters, keep only letters and spaces
    return value.replace(/[^a-zA-Z\s]/g, "");
  };

  const filterMobileInput = (value) => {
    // Remove all non-digit characters, keep only numbers, max 10 digits
    return value.replace(/\D/g, "").slice(0, 10);
  };

  const filterBankAccountInput = (value) => {
    // Remove all non-digit characters, keep only numbers, max 18 digits
    return value.replace(/\D/g, "").slice(0, 18);
  };

  const filterHouseInput = (value) => {
    // Allow alphanumeric and common address punctuation, trim to 50 chars
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
    if (profile.MobileNumber && !/^\d{10}$/.test(profile.MobileNumber.replace(/\D/g, ""))) {
      newErrors.MobileNumber = "Mobile must be 10 digits";
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

    // Bank details validation (REQUIRED)
    if (!bankDetails.BankAccountNo || bankDetails.BankAccountNo.trim().length === 0) {
      newErrors.BankAccountNo = "Bank account number is required";
      isValid = false;
    } else if (!/^\d{9,18}$/.test(bankDetails.BankAccountNo.replace(/\s/g, ""))) {
      newErrors.BankAccountNo = "Bank account number must be 9-18 digits";
      isValid = false;
    }

    if (!bankDetails.IFSCCode || bankDetails.IFSCCode.trim().length === 0) {
      newErrors.IFSCCode = "IFSC code is required";
      isValid = false;
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.IFSCCode.toUpperCase())) {
      newErrors.IFSCCode = "IFSC code must be in format: ABCD0123456";
      isValid = false;
    }

    // Services validation - Not required since technician cannot edit services
    // Services are managed by admin only

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

      case "MobileNumber":
        if (value && !/^\d{10}$/.test(value.replace(/\D/g, ""))) {
          newErrors.MobileNumber = "Mobile must be 10 digits";
        } else {
          newErrors.MobileNumber = "";
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
        // value may be structured object or legacy string
        if (value && typeof value === "object") {
          const house = (value.houseNumber || "").toString().trim();
          const pin = (value.pincode || "").toString().trim();
          if (!house) {
            newErrors.Address = "House/Flat number is required";
          } else if (!pin) {
            newErrors.Address = "Pincode is required";
          } else {
            newErrors.Address = "";
          }
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

      case "BankAccountNo":
        if (!value || value.trim().length === 0) {
          newErrors.BankAccountNo = "Bank account number is required";
        } else if (!/^\d{9,18}$/.test(value.replace(/\s/g, ""))) {
          newErrors.BankAccountNo = "Bank account number must be 9-18 digits";
        } else {
          newErrors.BankAccountNo = "";
        }
        break;

      case "IFSCCode":
        if (!value || value.trim().length === 0) {
          newErrors.IFSCCode = "IFSC code is required";
        } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())) {
          newErrors.IFSCCode = "IFSC code must be in format: ABCD0123456";
        } else {
          newErrors.IFSCCode = "";
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
        // keep legacy Address error in sync
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
        // keep legacy Address error in sync
        if (!newErrors.Pincode) newErrors.Address = newErrors.Address || "";
        break;

      case "Password":
        if (!value) {
          newErrors.Password = "Password is required";
        } else if (value.length < 8) {
          newErrors.Password = "Password must be at least 8 characters";
        } else if (!/(?=.*[a-z])/.test(value)) {
          newErrors.Password = "Password must contain at least one lowercase letter";
        } else if (!/(?=.*[A-Z])/.test(value)) {
          newErrors.Password = "Password must contain at least one uppercase letter";
        } else if (!/(?=.*\d)/.test(value)) {
          newErrors.Password = "Password must contain at least one number";
        } else if (!/(?=.*[@$!%*?&])/.test(value)) {
          newErrors.Password = "Password must contain at least one special character (@$!%*?&).";
        } else {
          newErrors.Password = "";
        }
        // Also validate confirm if present
        if (passwordForm.confirmPassword && passwordForm.confirmPassword !== value) {
          newErrors.ConfirmPassword = "Confirmation does not match";
        } else if (passwordForm.confirmPassword) {
          newErrors.ConfirmPassword = "";
        }
        break;

      case "ConfirmPassword":
        if (!value) {
          newErrors.ConfirmPassword = "Please confirm new password";
        } else if (value !== passwordForm.newPassword) {
          newErrors.ConfirmPassword = "Confirmation does not match";
        } else {
          newErrors.ConfirmPassword = "";
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleBankDetailsChange = (field, value) => {
    setBankDetails({ ...bankDetails, [field]: value });
  };

  const handleFileSelect = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file for photo uploads
      if (fileType === "photo") {
        // Allowed extensions and mime types
        const allowedExt = ["png", "jpeg", "jpg", "webp"];
        const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowedExt.includes(ext)) {
          setErrors((prev) => ({
            ...prev,
            photo: "Invalid file extension. Allowed: PNG, JPEG, JPG, WebP"
          }));
          return;
        }

        if (!allowedMimes.includes(file.type)) {
          setErrors((prev) => ({
            ...prev,
            photo: "Invalid file type. Only PNG, JPEG, JPG, WebP are allowed"
          }));
          return;
        }

        // 500 KB limit
        const MAX_FILE_SIZE = 500 * 1024;
        if (file.size > MAX_FILE_SIZE) {
          const kb = (file.size / 1024).toFixed(2);
          const msg = `File size must be less than 500 KB. Your file is ${kb} KB`;
          setErrors((prev) => ({
            ...prev,
            photo: msg
          }));
          return;
        }

        // Clear photo errors on success
        setErrors((prev) => ({
          ...prev,
          photo: ""
        }));

        setPhotoFile(file);
        // Generate preview URL immediately
        const reader = new FileReader();
        reader.onload = (event) => {
          setPhotoPreview(event.target.result);
        };
        reader.readAsDataURL(file);
      } else if (fileType === "idProof") {
        setIdProofFile(file);
      }
    }
  };

  const handleSaveProfile = async () => {
    // Validate form before saving
    if (!validateForm()) {
      toast.error("Please fill all fields before saving");
      return;
    }

    // Check for photo validation errors
    if (errors.photo) {
      toast.error(errors.photo);
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      // Add basic profile fields
      formData.append("Name", profile.Name);
      // Address must be sent as a JSON string when using multipart/form-data
      formData.append("Address", JSON.stringify(profile.Address || {}));
      // Include lat/lng so backend can update GeoJSON location
      if (profile.latitude !== undefined && profile.longitude !== undefined) {
        formData.append("latitude", String(profile.latitude));
        formData.append("longitude", String(profile.longitude));
      }
      
      // Fetch current technician data to compare
      const currentRes = await axios.get(`${backendUrl}/api/technician/profile`, {
        withCredentials: true,
      });

      const currentData = currentRes.data.data.technician;

      // Only send mobile if it changed
      if (profile.MobileNumber !== currentData.MobileNumber) {
        formData.append("MobileNumber", profile.MobileNumber);
      }

      // Only send email if it changed
      if (profile.Email !== currentData.Email) {
        formData.append("Email", profile.Email);
      }

      // Add files if selected
      if (photoFile) formData.append("photo", photoFile);
      // Note: ID Proof is read-only and cannot be changed by technician
      // if (idProofFile) formData.append("idProof", idProofFile);

      // Add bank details
      formData.append("bankDetails", JSON.stringify(bankDetails));

      // Note: Services are NOT sent because technicians cannot edit services
      // Services are managed by admin only

      const res = await axios.patch(`${backendUrl}/api/technician/profile`, formData, {
        withCredentials: true,
      });

      if (res.data.success) {
        toast.success(res.data.message || "Profile updated successfully");
        setPhotoFile(null);
        setPhotoPreview(null);
        setIdProofFile(null);
        // Refresh profile data
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

  const handleChangePassword = async () => {
    // Basic presence check for current password
    if (!passwordForm.oldPassword) {
      toast.error("Please enter your current password");
      return;
    }

    // Synchronous validation for new password and confirmation (avoid relying on async setState)
    const pwd = passwordForm.newPassword || "";
    const cpwd = passwordForm.confirmPassword || "";

    let pwdErr = "";
    if (!pwd) {
      pwdErr = "Password is required";
    } else if (pwd.length < 8) {
      pwdErr = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])/.test(pwd)) {
      pwdErr = "Password must contain at least one lowercase letter";
    } else if (!/(?=.*[A-Z])/.test(pwd)) {
      pwdErr = "Password must contain at least one uppercase letter";
    } else if (!/(?=.*\d)/.test(pwd)) {
      pwdErr = "Password must contain at least one number";
    } else if (!/(?=.*[@$!%*?&])/.test(pwd)) {
      pwdErr = "Password must contain at least one special character (@$!%*?&).";
    }

    let cpwdErr = "";
    if (!cpwd) {
      cpwdErr = "Please confirm new password";
    } else if (cpwd !== pwd) {
      cpwdErr = "Confirmation does not match";
    }

    if (pwdErr) {
      setErrors((prev) => ({ ...prev, Password: pwdErr }));
      toast.error(pwdErr);
      return;
    }

    if (cpwdErr) {
      setErrors((prev) => ({ ...prev, ConfirmPassword: cpwdErr }));
      toast.error(cpwdErr);
      return;
    }

    try {
      setChangingPassword(true);
      const res = await axios.post(
        `${backendUrl}/api/technician/profile/change-password`,
        {
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success(res.data.message || "Password changed successfully");
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
        setShowPasswordModal(false);
      } else {
        toast.error(res.data.message || "Failed to change password");
      }
    } catch (error) {
      console.error("Change password error:", error);
      toast.error(error.response?.data?.message || "Error changing password");
    } finally {
      setChangingPassword(false);
    }
  };

  // Mobile Verification Functions
  const handleSendMobileOTP = async () => {
    if (!newMobileNumber) {
      toast.error("Please enter mobile number");
      return;
    }

    try {
      setSendingMobileOTP(true);
      const res = await axios.post(
        `${backendUrl}/api/technician/profile/send-mobile-otp`,
        { newMobileNumber },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success("OTP sent to your mobile number");
        setMobileOTPSent(true);
        setMobileOtpTimer(120);
        setCanResendMobileOTP(false);

        // In development mode, auto-fill OTP
        if (res.data.otp) {
          setMobileOTP(res.data.otp);
        }
      } else {
        toast.error(res.data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Send mobile OTP error:", error);
      toast.error(error.response?.data?.message || "Error sending OTP");
    } finally {
      setSendingMobileOTP(false);
    }
  };

  const handleVerifyMobileOTP = async () => {
    if (!mobileOTP) {
      toast.error("Please enter OTP");
      return;
    }

    try {
      setVerifyingMobile(true);
      const res = await axios.post(
        `${backendUrl}/api/technician/profile/verify-mobile-otp`,
        { newMobileNumber, otp: mobileOTP },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success("Mobile number verified successfully");
        // Update profile with new mobile number and enable the field
        setProfile({ ...profile, MobileNumber: newMobileNumber });
        setShowMobileVerification(false);
        setMobileOTPSent(false);
        setMobileOTP("");
        setNewMobileNumber("");
        setMobileOtpTimer(0);
        setCanResendMobileOTP(false);
        // Clear mobile validation errors
        setErrors({ ...errors, MobileNumber: "" });
      } else {
        toast.error(res.data.message || "Failed to verify OTP");
      }
    } catch (error) {
      console.error("Verify mobile OTP error:", error);
      toast.error(error.response?.data?.message || "Error verifying OTP");
    } finally {
      setVerifyingMobile(false);
    }
  };

  // Email Verification Functions
  const handleSendEmailOTP = async () => {
    if (!newEmail) {
      toast.error("Please enter email address");
      return;
    }

    try {
      setSendingEmailOTP(true);
      const res = await axios.post(
        `${backendUrl}/api/technician/profile/send-email-otp`,
        { newEmail },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success("OTP sent to your email");
        setEmailOTPSent(true);
        setEmailOtpTimer(120);
        setCanResendEmailOTP(false);

        // In development mode, auto-fill OTP
        if (res.data.otp) {
          setEmailOTP(res.data.otp);
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
        `${backendUrl}/api/technician/profile/verify-email-otp`,
        { newEmail, otp: emailOTP },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success("Email verified successfully");
        // Update profile with new email and enable the field
        setProfile({ ...profile, Email: newEmail });
        setShowEmailVerification(false);
        setEmailOTPSent(false);
        setEmailOTP("");
        setNewEmail("");
        setEmailOtpTimer(0);
        setCanResendEmailOTP(false);
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
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          </div>
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
          <p className="text-gray-600 mt-3 text-lg">Manage your profile information and services</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Sidebar - Profile Photo & Quick Actions */}
          <div className="xl:col-span-1 space-y-6">
            {/* Profile Photo Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="text-center">
                <div className="relative inline-block">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile Preview"
                      className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-md mx-auto"
                    />
                  ) : profile.Photo ? (
                    <img
                      src={`${backendUrl}${profile.Photo}`}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-blue-100 shadow-md mx-auto"
                      onError={(e) => {
                        console.error("Error loading photo from:", e.target.src);
                      }}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 border-4 border-blue-50 flex items-center justify-center mx-auto">
                      <User className="w-12 h-12 text-blue-400" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-all duration-200">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={(e) => handleFileSelect(e, "photo")}
                      className="hidden"
                    />
                  </label>
                </div>
                
                {/* Inline photo error message */}
                {errors.photo && (
                  <p className="text-red-500 text-xs font-medium text-center mt-2">{errors.photo}</p>
                )}
                
                <h2 className="text-xl font-bold text-gray-900 mt-4">{profile.Name || "Technician Name"}</h2>
                <p className="text-gray-600 text-sm mt-1">Service Technician</p>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{profile.MobileNumber || "Not provided"}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{profile.Email || "Not provided"}</span>
                  </div>
                </div>
              </div>


            </div>

            {/* ID Proof Upload Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                ID Proof Document
              </h3>
              
              <div className="mb-4">
                {profile.IDProof ? (
                  <div className="relative">
                    <img
                      src={`${backendUrl}${profile.IDProof}`}
                      alt="ID Proof"
                      className="w-full h-40 object-cover rounded-lg border-2 border-blue-100 shadow-sm"
                      onError={(e) => {
                        console.error("Error loading ID proof from:", e.target.src);
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-4">
                    <FileText className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-gray-500 text-sm text-center">No ID proof uploaded</span>
                  </div>
                )}
              </div>

              {/* ID Proof is view-only for technicians. Remove upload control. */}
              {profile.IDProof ? (
                <p className="text-xs text-gray-500 text-center"></p>
              ) : (
                <p className="text-xs text-gray-500 text-center">No ID proof uploaded</p>
              )}
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
                <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
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
                        disabled
                        aria-disabled="true"
                        title="Full name cannot be edited"
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          errors.Name ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                        }`}
                        placeholder="Full name"
                      />
                    </div>
                  {errors.Name && (
                    <p className="text-red-500 text-sm font-medium">{errors.Name}</p>
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
                      value={profile.MobileNumber}
                      onChange={(e) => {
                        const filteredValue = filterMobileInput(e.target.value);
                        handleProfileChange("MobileNumber", filteredValue);
                        validateField("MobileNumber", filteredValue);
                      }}
                      onBlur={(e) => validateField("MobileNumber", e.target.value)}
                      disabled
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        errors.MobileNumber ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                      }`}
                      placeholder="Enter 10-digit mobile number"
                    />
                    <button
                      onClick={() => {
                        setNewMobileNumber(profile.MobileNumber || "");
                        setMobileOTPSent(false);
                        setMobileOTP("");
                        setShowMobileVerification(true);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all duration-200 text-sm"
                    >
                      <Phone className="w-3 h-3" />
                      Verify
                    </button>
                  </div>
                  {errors.MobileNumber && (
                    <p className="text-red-500 text-sm font-medium">{errors.MobileNumber}</p>
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
                      disabled
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        errors.Email ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                      }`}
                      placeholder="Enter valid email address"
                    />
                    <button
                      onClick={() => {
                        setNewEmail(profile.Email || "");
                        setEmailOTPSent(false);
                        setEmailOTP("");
                        setShowEmailVerification(true);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all duration-200 text-sm"
                    >
                      <Mail className="w-3 h-3" />
                      Verify
                    </button>
                  </div>
                  {errors.Email && (
                    <p className="text-red-500 text-sm font-medium">{errors.Email}</p>
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
                        className="w-full px-4 py-3 border-2 rounded-xl"
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
                        className="w-full px-4 py-3 border-2 rounded-xl"
                        placeholder="City"
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

                    <div className="col-span-1 md:col-span-2 flex items-center gap-2">
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

            {/* Bank Details Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Bank Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Number */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankDetails.BankAccountNo}
                    onChange={(e) => {
                      const filteredValue = filterBankAccountInput(e.target.value);
                      handleBankDetailsChange("BankAccountNo", filteredValue);
                      validateField("BankAccountNo", filteredValue);
                    }}
                    onBlur={(e) => validateField("BankAccountNo", e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.BankAccountNo ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                    }`}
                    placeholder="9-18 digits only"
                  />
                  {errors.BankAccountNo && (
                    <p className="text-red-500 text-sm font-medium">{errors.BankAccountNo}</p>
                  )}
                </div>

                {/* IFSC Code */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={bankDetails.IFSCCode}
                    onChange={(e) => {
                      handleBankDetailsChange("IFSCCode", e.target.value.toUpperCase());
                      validateField("IFSCCode", e.target.value);
                    }}
                    onBlur={(e) => validateField("IFSCCode", e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.IFSCCode ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                    }`}
                    placeholder="Format: ABCD0123456"
                    maxLength="11"
                  />
                  {errors.IFSCCode && (
                    <p className="text-red-500 text-sm font-medium">{errors.IFSCCode}</p>
                  )}
                </div>
              </div>
            </div>

{/* Action Buttons */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-4 rounded-xl hover:from-red-600 hover:to-pink-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Shield className="w-5 h-5" />
                Change Password
              </button>
              
              <button
                onClick={handleSaveProfile}
                disabled={saving || Object.values(errors).some((err) => err !== "")}
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
            {/* Services Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Your Services</h2>
                  <p className="text-gray-600 mt-1">Services are managed by admin. Contact admin to update your services.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {selectedServices && selectedServices.length > 0 ? (
                  selectedServices.map((service) => (
                    <div
                      key={service._id || (service.ServiceCategoryID && service.ServiceCategoryID._id) || service.ServiceCategoryID}
                      className="bg-white border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900 text-sm">
                          {(service.ServiceCategoryID && (service.ServiceCategoryID.name || service.ServiceCategoryID.ServiceName)) || service.ServiceName || "Unknown Service"}
                        </h3>
                        <span className="text-xs text-gray-500">{(service.SubServices && service.SubServices.length) || 0} sub-services</span>
                      </div>

                      <ul className="space-y-2">
                        {service.SubServices && service.SubServices.length > 0 ? (
                          service.SubServices.map((sub) => (
                            <li key={sub._id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50">
                              {sub.image ? (
                                <img src={`${backendUrl}${sub.image}`} alt={sub.name} className="w-12 h-12 rounded-md object-cover" onError={(e)=>{e.target.style.display='none'}} />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center text-gray-400"> <Building className="w-5 h-5"/> </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-medium text-gray-900 truncate">{sub.name || sub.Name}</div>
                                  {sub.isActive !== undefined && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sub.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {sub.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  )}
                                </div>
                                {sub.description && <p className="text-xs text-gray-500 truncate">{sub.description}</p>}
                              </div>

                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-800">₹{sub.price || sub.Price || 0}</div>
                                <div className="text-xs text-gray-500">{sub.coinsRequired || sub.CoinsRequired || 0} coins</div>
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-gray-500">No sub-services available</li>
                        )}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Assigned</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      You haven't been assigned any services yet. Please contact the administrator to get services assigned to your profile.
                    </p>
                  </div>
                )}
              </div>
            </div>

            
          </div>
        </div>
      </div>

      {/* Mobile Verification Modal */}
      {showMobileVerification && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-200 to-purple-400 flex items-center justify-center p-4 z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowMobileVerification(false);
            setMobileOTPSent(false);
            setMobileOTP("");
            setNewMobileNumber("");
            setMobileOtpTimer(0);
            setCanResendMobileOTP(false);
          }
        }}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all duration-300 scale-100">
            {!mobileOTPSent ? (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Phone className="w-6 h-6 text-blue-400" />
                    Update Mobile
                  </h2>
                  <button
                    onClick={() => {
                      setShowMobileVerification(false);
                      setMobileOTPSent(false);
                      setMobileOTP("");
                      setNewMobileNumber("");
                      setMobileOtpTimer(0);
                      setCanResendMobileOTP(false);
                    }}
                    className="text-gray-400 hover:text-gray-300 transition-colors duration-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <label className="block text-sm font-semibold text-gray-300">
                    New Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={newMobileNumber}
                    onChange={(e) => setNewMobileNumber(filterMobileInput(e.target.value))}
                    disabled={sendingMobileOTP}
                    className="w-full px-4 py-3 border-2 border-gray-600 bg-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-900 disabled:cursor-not-allowed text-white placeholder-gray-500"
                    placeholder="Enter new mobile number"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowMobileVerification(false);
                      setMobileOTPSent(false);
                      setMobileOTP("");
                      setNewMobileNumber("");
                      setMobileOtpTimer(0);
                      setCanResendMobileOTP(false);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-600 rounded-lg text-gray-300 hover:bg-slate-700 font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMobileOTP}
                    disabled={sendingMobileOTP}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {sendingMobileOTP && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {sendingMobileOTP ? "Sending..." : "Send OTP"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* OTP Verification Screen */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Enter Verification Code
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Enter the 6-digit code sent to <span className="text-blue-300 font-semibold">{newMobileNumber}</span>
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
                        value={mobileOTP[index] || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (value.length <= 1) {
                            const newOTP = mobileOTP.split("");
                            newOTP[index] = value;
                            setMobileOTP(newOTP.join(""));
                            // Auto-focus next input
                            if (value && index < 5) {
                              const nextInput = document.querySelector(
                                `input[data-mobile-otp-index="${index + 1}"]`
                              );
                              nextInput?.focus();
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !mobileOTP[index] && index > 0) {
                            const prevInput = document.querySelector(
                              `input[data-mobile-otp-index="${index - 1}"]`
                            );
                            prevInput?.focus();
                          }
                        }}
                        data-mobile-otp-index={index}
                        disabled={verifyingMobile}
                        className={`w-12 h-12 text-center text-lg font-bold rounded-lg border-2 transition-all duration-200 focus:outline-none ${
                          mobileOTP[index]
                            ? "border-blue-500 bg-blue-500 bg-opacity-20 text-white"
                            : "border-gray-600 bg-slate-800 text-gray-400 focus:border-blue-500"
                        } disabled:cursor-not-allowed`}
                        placeholder="•"
                      />
                    ))}
                  </div>

                  {/* Timer and Resend */}
                  <div className="text-center mb-6">
                    {mobileOtpTimer > 0 ? (
                      <p className="text-gray-400 text-sm">
                        Resend OTP in{" "}
                        <span className="text-blue-400 font-semibold">
                          {Math.floor(mobileOtpTimer / 60)}:{String(mobileOtpTimer % 60).padStart(2, "0")}
                        </span>
                      </p>
                    ) : canResendMobileOTP ? (
                      <button
                        onClick={() => {
                          setMobileOTP("");
                          setMobileOtpTimer(0);
                          setCanResendMobileOTP(false);
                          handleSendMobileOTP();
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
                      setShowMobileVerification(false);
                      setMobileOTPSent(false);
                      setMobileOTP("");
                      setNewMobileNumber("");
                      setMobileOtpTimer(0);
                      setCanResendMobileOTP(false);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-600 rounded-lg text-gray-300 hover:bg-slate-700 font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyMobileOTP}
                    disabled={mobileOTP.length !== 6 || verifyingMobile}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {verifyingMobile && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {verifyingMobile ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 bg-gradient-to-br from-blue-200 to-purple-400 flex items-center justify-center p-4 z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowEmailVerification(false);
            setEmailOTPSent(false);
            setEmailOTP("");
            setNewEmail("");
            setEmailOtpTimer(0);
            setCanResendEmailOTP(false);
          }
        }}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all duration-300 scale-100">
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
                      setEmailOtpTimer(0);
                      setCanResendEmailOTP(false);
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
                      setEmailOtpTimer(0);
                      setCanResendEmailOTP(false);
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
                                `input[data-email-otp-index="${index + 1}"]`
                              );
                              nextInput?.focus();
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !emailOTP[index] && index > 0) {
                            const prevInput = document.querySelector(
                              `input[data-email-otp-index="${index - 1}"]`
                            );
                            prevInput?.focus();
                          }
                        }}
                        data-email-otp-index={index}
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
                    {emailOtpTimer > 0 ? (
                      <p className="text-gray-400 text-sm">
                        Resend OTP in{" "}
                        <span className="text-blue-400 font-semibold">
                          {Math.floor(emailOtpTimer / 60)}:{String(emailOtpTimer % 60).padStart(2, "0")}
                        </span>
                      </p>
                    ) : canResendEmailOTP ? (
                      <button
                        onClick={() => {
                          setEmailOTP("");
                          setEmailOtpTimer(0);
                          setCanResendEmailOTP(false);
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
                      setEmailOtpTimer(0);
                      setCanResendEmailOTP(false);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-600 rounded-lg text-gray-300 hover:bg-slate-700 font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyEmailOTP}
                    disabled={emailOTP.length !== 6 || verifyingEmail || (emailOTPSent && emailOtpTimer === 0)}
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Change Password
              </h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    oldPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={passwordForm.oldPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        oldPassword: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pr-12"
                    placeholder="Enter current password"
                  />
                  <button
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showOldPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPasswordForm({ ...passwordForm, newPassword: val });
                      validateField("Password", val);
                    }}
                    onBlur={(e) => validateField("Password", e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pr-12"
                    placeholder="Enter new password"
                  />
                  <button
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.Password && (
                  <p className="text-red-500 text-sm font-medium">{errors.Password}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPasswordForm({ ...passwordForm, confirmPassword: val });
                    validateField("ConfirmPassword", val);
                  }}
                  onBlur={(e) => validateField("ConfirmPassword", e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Confirm new password"
                />
                {errors.ConfirmPassword && (
                  <p className="text-red-500 text-sm font-medium">{errors.ConfirmPassword}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    oldPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianProfile;