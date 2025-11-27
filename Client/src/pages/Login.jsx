import React, { useState, useContext, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { assets } from "../assets/assets";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { Navbar } from "../components/Navbar";
import MapPicker from "../components/MapPicker";

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { backendUrl, setIsLoggedIn, getUserData, userData } =
    useContext(AppContext);

  // Check if we're coming from successful verification
  const [state, setState] = useState(
    location.state?.fromVerification ? "Login" : "Login"
  );

  // Validation functions
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    address: "",
    serviceCategoryID: "",
    bankAccountNo: "",
    ifscCode: "",
    idProof: "",
    photo: "",
    houseNumber: "",
    street: "",
    city: "",
    pincode: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    mobile: false,
    password: false,
    address: false,
    serviceCategoryID: false,
    bankAccountNo: false,
    ifscCode: false,
    houseNumber: false,
    street: false,
    city: false,
    pincode: false,
  });

  // OTP Countdown states
  const [otpExpiryTime, setOtpExpiryTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    address: "",
    addressObj: {},
    latitude: undefined,
    longitude: undefined,
    serviceCategoryID: "",
    bankAccountNo: "",
    ifscCode: "",
  });
  const [showMapPickerSignup, setShowMapPickerSignup] = useState(false);

  const [idProof, setIdProof] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [idProofName, setIdProofName] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [serviceCategories, setServiceCategories] = useState([]);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const recaptchaRef = React.useRef();

  // Verification states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [verificationType, setVerificationType] = useState(""); // 'email' or 'mobile'
  const [verificationId, setVerificationId] = useState(""); // For Firebase verification

  // Password show hide
  const [showPassword, setShowPassword] = useState({
    login: false,
    signup: false,
  });

  // Toggle password visibility
  const togglePasswordVisibility = (type) => {
    setShowPassword((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Add this ref for OTP inputs
  const otpInputRefs = useRef([]);

  // Validation functions
  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "name":
        if (!value.trim()) error = "Name is required";
        else if (value.trim().length < 2)
          error = "Name must be at least 2 characters";
        else if (/[0-9]/.test(value)) error = "Name should not contain numbers";
        else if (!/^[a-zA-Z\s]*$/.test(value))
          error = "Name should only contain letters and spaces";
        break;

      case "email":
        if (!value) error = "Email is required";
        else if (!/^(?=.{6,254}$)([a-z0-9_\-\.]+)@([a-z0-9\-]+\.)+([a-z]{2,})$/.test(value.toLowerCase()))
          error = "Invalid email format";
        break;

      case "mobile":
        if (!value) error = "Mobile number is required";
        else if (!/^\d{10}$/.test(value))
          error = "Mobile must be exactly 10 digits";
        break;

      case "password":
        if (!value) error = "Password is required";
        else if (value.length < 8)
          error = "Password must be at least 8 characters";
        else if (!/(?=.*[a-z])/.test(value))
          error = "Password must contain at least one lowercase letter";
        else if (!/(?=.*[A-Z])/.test(value))
          error = "Password must contain at least one uppercase letter";
        else if (!/(?=.*\d)/.test(value))
          error = "Password must contain at least one number";
        else if (!/(?=.*[@$!%*?&])/.test(value))
          error =
            "Password must contain at least one special character (@$!%*?&)";
        break;

        case "address":
          // Address is auto-generated from structured fields; skip validation
          break;

        case "houseNumber":
          if (!value || String(value).trim().length === 0) error = "House/Flat is required";
          break;
        // street and city are optional — no validation
        case "pincode":
          if (!value || String(value).trim().length === 0) error = "Pincode is required";
          else if (!/^[0-9]{1,6}$/.test(String(value))) error = "Pincode must be numeric and max 6 digits";
          break;

      case "serviceCategoryID":
        if (!value) error = "Service category is required";
        break;

      case "bankAccountNo":
        if (!value.trim()) error = "Bank account number is required";
        else if (!/^\d+$/.test(value))
          error = "Bank account should contain only numbers";
        else if (value.length < 9)
          error = "Bank account number should be at least 9 digits";
        else if (value.length > 18)
          error = "Bank account number should not exceed 18 digits";
        break;

      case "ifscCode":
        if (!value.trim()) error = "IFSC code is required";
        else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase()))
          error = "Invalid IFSC code format (e.g., ABCD0123456)";
        break;

      default:
        break;
    }

    return error;
  };

  // Handle input change with filtering
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    let filteredValue = value;

    // Apply filters based on field type
    switch (name) {
      case "name":
        filteredValue = value.replace(/[0-9]/g, ""); // Remove numbers
        break;
      case "mobile":
        filteredValue = value.replace(/\D/g, "").slice(0, 10); // Only numbers, max 10
        break;
      case "bankAccountNo":
        filteredValue = value.replace(/\D/g, "").slice(0, 18); // Only numbers, max 18
        break;
      case "ifscCode":
        filteredValue = value.toUpperCase().replace(/[^A-Z0-9]/g, ""); // Only uppercase letters and numbers
        break;
      default:
        filteredValue = value;
    }

    setFormData({
      ...formData,
      [name]: filteredValue,
    });

    // Mark field as touched and validate in real-time
    if (!touched[name]) {
      setTouched((prev) => ({ ...prev, [name]: true }));
    }
    const error = validateField(name, filteredValue);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Handle blur events
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const value = name === "mobile" ? mobile : name === "email" ? email : formData[name];
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Special handlers for mobile and email
  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setMobile(value);

    if (!touched.mobile) {
      setTouched((prev) => ({ ...prev, mobile: true }));
    }
    const error = validateField("mobile", value);
    setErrors((prev) => ({ ...prev, mobile: error }));
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);

    // Always validate on change (real-time validation)
    if (!touched.email) {
      setTouched((prev) => ({ ...prev, email: true }));
    }
    const error = validateField("email", value);
    setErrors((prev) => ({ ...prev, email: error }));
  };

  // File validation
  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (500KB max)
      const MAX_FILE_SIZE = 500 * 1024; // 500 KB
      if (file.size > MAX_FILE_SIZE) {
        const fileSizeKB = (file.size / 1024).toFixed(2);
        setErrors({ 
          ...errors, 
          [fileType]: `File size must be less than 500 KB. Your file is ${fileSizeKB} KB` 
        });
        return;
      }

      // Check file type
      let allowedTypes = [];
      if (fileType === "idProof") {
        allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "application/pdf",
        ];
      } else if (fileType === "photo") {
        allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];
      }

      if (!allowedTypes.includes(file.type)) {
        const allowedFormats =
          fileType === "idProof" ? "JPG, PNG, PDF" : "PNG, JPEG, JPG, WebP";
        setErrors({
          ...errors,
          [fileType]: `Only ${allowedFormats} files are allowed`,
        });
        return;
      }

      // File is valid
      setErrors({ ...errors, [fileType]: "" });

      if (fileType === "idProof") {
        setIdProof(file);
        setIdProofName(file.name);
      } else if (fileType === "photo") {
        setPhoto(file);
        setPhotoName(file.name);
      }
    }
  };

  // Drag event handlers
  const handleDragOver = (e, fileType) => {
    e.preventDefault();
  };

  const handleDragLeave = (e, fileType) => {
    e.preventDefault();
  };

  const handleDrop = (e, fileType) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange({ target: { files: e.dataTransfer.files } }, fileType);
    }
  };

  // OTP input handlers
  const handleOtpInput = (e, index) => {
    const value = e.target.value.replace(/\D/g, ""); // Only numbers
    if (value) {
      const newOtp = otp.split("");
      newOtp[index] = value;
      const joinedOtp = newOtp.join("");
      setOtp(joinedOtp);

      // Auto-focus next input
      if (index < 5 && value) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Move to previous input on backspace
        otpInputRefs.current[index - 1]?.focus();
      }

      const newOtp = otp.split("");
      newOtp[index] = "";
      setOtp(newOtp.join(""));
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pastedData.length === 6) {
      setOtp(pastedData);
      // Focus the last input after paste
      setTimeout(() => {
        otpInputRefs.current[5]?.focus();
      }, 0);
    }
  };

  const resetOtpInputs = () => {
    setOtp("");
    otpInputRefs.current.forEach((input) => {
      if (input) input.value = "";
    });
    if (otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  };

  // Format time for display (MM:SS)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Countdown timer effect
  useEffect(() => {
    let timer;

    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            setCanResendOtp(true);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeLeft]);

  // Send OTP function
  const sendOtp = async (type) => {
    setIsSendingOtp(true);
    setVerificationType(type);
    setCanResendOtp(false); // Reset resend ability

    // Reset OTP inputs when sending new OTP
    resetOtpInputs();

    try {
      let endpoint = "";
      let payload = {};

      if (type === "email") {
        if (!email) {
          toast.error("Please enter email first");
          setIsSendingOtp(false);
          return;
        }
        endpoint = "/api/auth/send-email-otp";
        payload = { email };
      } else if (type === "mobile") {
        if (!mobile) {
          toast.error("Please enter mobile number first");
          setIsSendingOtp(false);
          return;
        }
        endpoint = "/api/auth/send-mobile-otp";
        payload = { mobile };
      }

      const { data } = await axios.post(`${backendUrl}${endpoint}`, payload);

      if (data.success) {
        setShowOtpModal(true);

        // Set OTP expiry time (15 minutes from now)
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + 15);
        setOtpExpiryTime(expiryTime);
        setTimeLeft(2 * 60); // 15 minutes in seconds
        setCanResendOtp(false);

        toast.success(`OTP sent to your ${type}`);

        // Store verification ID for mobile OTP (Firebase)
        if (type === "mobile" && data.verificationId) {
          setVerificationId(data.verificationId);
        }

        // For development - auto-fill OTP
        if (process.env.NODE_ENV === "development" && data.otp) {
          setOtp(data.otp);
        }
      } else {
        toast.error(data.message || `Failed to send ${type} OTP`);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          `Failed to send ${type} OTP`
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP function
  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    if (timeLeft === 0) {
      toast.error("OTP has expired. Please request a new one.");
      return;
    }

    try {
      let endpoint = "";
      let payload = {};

      if (verificationType === "email") {
        endpoint = "/api/auth/verify-email-otp";
        payload = { email, otp };
      } else if (verificationType === "mobile") {
        endpoint = "/api/auth/verify-mobile-otp";
        payload = { mobile, otp, verificationId };
      }

      const { data } = await axios.post(`${backendUrl}${endpoint}`, payload);

      if (data.success) {
        if (verificationType === "email") {
          setIsEmailVerified(true);
        } else {
          setIsMobileVerified(true);
        }

        setShowOtpModal(false);
        setOtp("");
        setVerificationId("");
        setTimeLeft(0); // Reset timer
        setCanResendOtp(false);
        resetOtpInputs(); // Reset OTP inputs on success
        toast.success(`${verificationType} verified successfully!`);
      } else {
        toast.error(data.message || "Invalid OTP");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || "Failed to verify OTP"
      );
    }
  };

  // Fetch service categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/service-categories`
        );
        if (data.success) {
          setServiceCategories(data.data || []);
        } else {
          toast.error(data.message || "Failed to load service categories");
        }
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to load service categories"
        );
      }
    };
    fetchCategories();
  }, [backendUrl]);

  useEffect(() => {
    // Set active tab based on state
    setActiveTab(state === "Login" ? "login" : "signup");
    // Always reset reCAPTCHA on mount and tab switch
    setShowRecaptcha(false);
    setRecaptchaToken("");
    // If coming from verification, show success message
    if (location.state?.fromVerification) {
      toast.success("Email verified successfully! You can now login.");
      // Clear the state to avoid showing the message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [state, location.state]);

  // Sync structured address fields into the read-only `address` for realtime preview
  React.useEffect(() => {
    const addr = formData.addressObj || {};
    const parts = [];
    // Show houseNumber and city primarily, include other parts if available
    if (addr.houseNumber) parts.push(addr.houseNumber);
    if (addr.city) parts.push(addr.city);
    if (addr.street) parts.push(addr.street);
    if (addr.pincode) parts.push(addr.pincode);
    const addressStr = parts.filter(Boolean).join(", ");
    setFormData((prev) => ({ ...prev, address: addressStr }));
  }, [formData.addressObj]);

  const removeFile = (fileType) => {
    if (fileType === "idProof") {
      setIdProof(null);
      setIdProofName("");
    } else if (fileType === "photo") {
      setPhoto(null);
      setPhotoName("");
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = {};
    const newTouched = {};

    // Validate form data fields
    Object.keys(formData).forEach((key) => {
      newTouched[key] = true;
      newErrors[key] = validateField(key, formData[key]);
    });

    // Validate structured address subfields (houseNumber and pincode required)
    const houseVal = formData.addressObj?.houseNumber || "";
    const pinVal = formData.addressObj?.pincode || "";
    newTouched.houseNumber = true;
    newTouched.pincode = true;
    if (!houseVal || String(houseVal).trim().length === 0) {
      newErrors.houseNumber = "House/Flat number is required";
    } else {
      newErrors.houseNumber = "";
    }
    if (!pinVal || String(pinVal).trim().length === 0) {
      newErrors.pincode = "Pincode is required";
    } else {
      newErrors.pincode = "";
    }

    // Validate mobile and email
    newTouched.mobile = true;
    newErrors.mobile = validateField("mobile", mobile);
    newTouched.email = true;
    newErrors.email = validateField("email", email);

    // Validate files
    if (state === "Sign Up") {
      if (!idProof) newErrors.idProof = "ID proof is required";
      if (!photo) newErrors.photo = "Photo is required";
    }

    setTouched(newTouched);
    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error !== "");

    if (state === "Sign Up") {
      if (hasErrors) {
        toast.error("Please fix the validation errors before submitting.");
        return;
      }

      if (!isMobileVerified) {
        toast.error("Please verify your mobile number before submitting.");
        return;
      }
      if (!isEmailVerified) {
        toast.error("Please verify your email address before submitting.");
        return;
      }
    }

    setLoading(true);

    try {
      axios.defaults.withCredentials = true;

      if (state === "Sign Up") {
        // Create FormData for signup with files
        const formDataToSend = new FormData();
        formDataToSend.append("name", formData.name);
        formDataToSend.append("email", email);
        formDataToSend.append("password", formData.password);
        // Address: prefer structured object if present
        try {
          if (formData.addressObj && typeof formData.addressObj === "object" && Object.keys(formData.addressObj).length > 0) {
            formDataToSend.append("Address", JSON.stringify(formData.addressObj));
          } else {
            formDataToSend.append("address", formData.address || "");
          }
        } catch (err) {
          formDataToSend.append("address", formData.address || "");
        }
        if (formData.latitude && formData.longitude) {
          formDataToSend.append("latitude", String(formData.latitude));
          formDataToSend.append("longitude", String(formData.longitude));
        }
        formDataToSend.append("serviceCategoryID", formData.serviceCategoryID);
        formDataToSend.append("bankAccountNo", formData.bankAccountNo);
        formDataToSend.append("ifscCode", formData.ifscCode);
        formDataToSend.append("mobileNumber", mobile);

        if (idProof) formDataToSend.append("idProof", idProof);
        if (photo) formDataToSend.append("photo", photo);

        const { data } = await axios.post(
          `${backendUrl}/api/auth/register`,
          formDataToSend
        );

        if (data?.success) {
          // Instead of setting isLoggedIn to true and navigating to home,
          // show success message and navigate to login page
          toast.success("Registration successful! Please login to continue.");
          setState("Login"); // Switch to login tab
          setActiveTab("login"); // Set active tab to login
          navigate("/login"); // Navigate to login page

          // Reset form data
          setFormData({
              name: "",
              password: "",
              address: "",
              addressObj: {},
              latitude: undefined,
              longitude: undefined,
              serviceCategoryID: "",
              bankAccountNo: "",
              ifscCode: "",
          });
          setMobile("");
          setEmail("");
          setIsMobileVerified(false);
          setIsEmailVerified(false);
          setIdProof(null);
          setIdProofName("");
          setPhoto(null);
          setPhotoName("");
        } else {
          toast.error(data?.message || "Registration failed");
        }
      } else {
        // Login case
        let loginPayload = {
          email: email,
          password: formData.password,
        };
        // Only send reCAPTCHA if shown and token is present
        if (showRecaptcha && recaptchaToken) {
          loginPayload.recaptchaToken = recaptchaToken;
        }

        const { data } = await axios.post(
          `${backendUrl}/api/auth/login`,
          loginPayload
        );

        if (data?.success) {
          setIsLoggedIn(true);
          await getUserData();
          toast.success("Login successful!");

          setShowRecaptcha(false);
          setRecaptchaToken("");

          if (data.userType === "admin") {
            navigate("/admin/dashboard"); // Admins go to admin dashboard
          } 
           if (data.userType === "technician") {
            navigate("/technician/dashboard"); // Technicians go to home
          } 
          // else {
          //   navigate("/"); // Fallback for any other role
          // }
        } else {
          toast.error(data?.message || "Login failed");
          // Show reCAPTCHA after first failed attempt
          setShowRecaptcha(true);
          // Reset reCAPTCHA widget
          if (recaptchaRef.current) {
            recaptchaRef.current.reset();
            setRecaptchaToken("");
          }
        }
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || "Something went wrong"
      );
      // Show reCAPTCHA after any error on login
      if (state === "Login") {
        setShowRecaptcha(true);
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
          setRecaptchaToken("");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Login handler
  const handleGoogleLogin = () => {
    window.open(`${backendUrl}/api/auth/google`, "_self");
  };

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4 pt-20">
      <Navbar />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>
      </div>

      <div className="w-full max-w-4xl bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/20">
        {/* Left Side - Enhanced Illustration */}
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 p-3 flex-col justify-center items-center text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white to-transparent"></div>
          </div>
          
          <div className="relative z-10 text-center mb-8">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Join Our Technician Network
            </h2>
            <p className="opacity-90 text-blue-100 text-lg">
              Connect with customers seeking your expertise
            </p>
          </div>
          
          {/* Feature List */}
          <div className="relative z-10 space-y-3 mb-8">
            {['Instant Job Matching', 'Secure Payments', 'Growth Opportunities'].map((feature, index) => (
              <div key={index} className="flex items-center space-x-3 text-blue-100">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="relative z-10 text-center">
            {state === "Sign Up" ? (
              <>
                <p className="text-sm opacity-80 text-blue-100 mb-3">Already have an account?</p>
                <button
                  onClick={() => setState("Login")}
                  className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-medium transition-all duration-300 backdrop-blur-sm border border-white/30 hover:border-white/50 hover:scale-105"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                <p className="text-sm opacity-80 text-blue-100 mb-3">Don't have an account?</p>
                <button
                  onClick={() => setState("Sign Up")}
                  className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-medium transition-all duration-300 backdrop-blur-sm border border-white/30 hover:border-white/50 hover:scale-105"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Side - Enhanced Form */}
        <div className="w-full md:w-3/5 p-3 md:p-5">
          {/* Tab Navigation - Enhanced Mobile */}
          <div className="md:hidden flex mb-8 bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-1.5 shadow-inner">
            <button
              onClick={() => setState("Login")}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === "login"
                  ? "bg-white text-indigo-700 shadow-lg transform scale-105"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setState("Sign Up")}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === "signup"
                  ? "bg-white text-indigo-700 shadow-lg transform scale-105"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              Register
            </button>
          </div>

          {/* Enhanced Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-indigo-600 bg-clip-text text-transparent">
              {state === "Sign Up"
                ? "Create Technician Account"
                : "Welcome Back"}
            </h2>
            <p className="text-gray-600 mt-3 text-lg">
              {state === "Sign Up"
                ? "Fill in your details to join our network"
                : "Sign in to your technician account"}
            </p>
          </div>

          <form onSubmit={onSubmitHandler} className="space-y-5">
            {state === "Sign Up" && (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Full Name Field */}
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <div
                    className={`flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-300 group-hover:shadow-md ${
                      errors.name
                        ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200"
                        : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
                    }`}
                  >
                    <svg className="w-5 h-5 text-gray-400 mr-3 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      value={formData.name}
                      name="name"
                      className="w-full bg-transparent outline-none text-sm placeholder-gray-400"
                      type="text"
                      placeholder="Enter your full name (letters)"
                      required
                    />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Service Category Field */}
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Service Category *
                  </label>
                    <div className="flex items-center border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all duration-300 group-hover:shadow-md">
                    <svg className="w-5 h-5 text-gray-400 mr-3 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-4 0H9m4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v12m4 0V9" />
                    </svg>
                    <select
                      onChange={handleInputChange}
                      value={formData.serviceCategoryID}
                      name="serviceCategoryID"
                      className="w-full bg-transparent outline-none text-sm appearance-none"
                      required
                    >
                      <option value="">Select specialty</option>
                      {serviceCategories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Mobile Number Field */}
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mobile Number *
                  </label>
                  <div className="flex gap-3">
                    <div
                      className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-300 group-hover:shadow-md ${
                        errors.mobile
                          ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200"
                          : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
                      }`}
                    >
                      <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <input
                        onChange={handleMobileChange}
                        onBlur={handleBlur}
                        value={mobile}
                        className="w-full bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="10-digit mobile number"
                        name="mobile"
                        maxLength={10}
                        disabled={isMobileVerified}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => sendOtp("mobile")}
                      disabled={
                        isMobileVerified ||
                        isSendingOtp ||
                        mobile.length !== 10 ||
                        errors.mobile
                      }
                      className={`px-6 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 transform hover:scale-105 ${
                        isMobileVerified
                          ? "bg-green-100 text-green-800 border-2 border-green-200 cursor-not-allowed"
                          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-2 border-indigo-200"
                      } ${
                        isSendingOtp || mobile.length !== 10 || errors.mobile
                          ? "opacity-50 cursor-not-allowed hover:scale-100"
                          : ""
                      }`}
                    >
                      {isMobileVerified
                        ? "✓ Verified"
                        : isSendingOtp
                        ? "Sending..."
                        : "Verify"}
                    </button>
                  </div>
                  {errors.mobile && (
                    <p className="text-red-500 text-xs mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {errors.mobile}
                    </p>
                  )}
                </div>

                {/* Address Field */}
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address *
                  </label>
                    <div
                      className={`flex items-center border-2 rounded-xl px-4 py-2 transition-all duration-300 group-hover:shadow-md ${
                      errors.address
                        ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200"
                        : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
                    }`}
                  >
                    <svg className="w-5 h-5 text-gray-400 mr-3 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex items-center gap-3 w-full">
                      <input
                        value={formData.address}
                        name="address"
                        className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
                        type="text"
                        placeholder="Your complete address"
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => setShowMapPickerSignup(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-semibold transition-all duration-300 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-105"
                      >
                        Pick on map
                      </button>
                    </div>
                  </div>
                  {errors.address && (
                    <p className="text-red-500 text-xs mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {errors.address}
                    </p>
                  )}
                </div>

                {/* Structured Address Fields */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">House/Flat *</label>
                      <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-300 group-hover:shadow-md ${errors.houseNumber ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200" : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"}`}>
                        <input
                          type="text"
                          placeholder="House/Flat"
                          value={formData.addressObj?.houseNumber || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData({ ...formData, addressObj: { ...(formData.addressObj || {}), houseNumber: value } });
                            if (!touched.houseNumber) setTouched((prev) => ({ ...prev, houseNumber: true }));
                            setErrors((prev) => ({ ...prev, houseNumber: validateField("houseNumber", value) }));
                          }}
                          onBlur={() => {
                            setTouched((prev) => ({ ...prev, houseNumber: true }));
                            setErrors((prev) => ({ ...prev, houseNumber: validateField("houseNumber", formData.addressObj?.houseNumber || "") }));
                          }}
                          name="houseNumber"
                          className="w-full bg-transparent outline-none text-sm placeholder-gray-400"
                        />
                      </div>
                      {touched.houseNumber && errors.houseNumber && (
                        <p className="text-red-500 text-xs mt-2 flex items-center">{errors.houseNumber}</p>
                      )}
                    </div>

                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Street</label>
                      <div className="flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-300 group-hover:shadow-md border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                        <input
                          type="text"
                          placeholder="Street"
                          value={formData.addressObj?.street || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData({ ...formData, addressObj: { ...(formData.addressObj || {}), street: value } });
                            if (!touched.street) setTouched((prev) => ({ ...prev, street: true }));
                          }}
                          name="street"
                          className="w-full bg-transparent outline-none text-sm placeholder-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                      <div className="flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-300 group-hover:shadow-md border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                        <input
                          type="text"
                          placeholder="City"
                          value={formData.addressObj?.city || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData({ ...formData, addressObj: { ...(formData.addressObj || {}), city: value } });
                            if (!touched.city) setTouched((prev) => ({ ...prev, city: true }));
                          }}
                          name="city"
                          className="w-full bg-transparent outline-none text-sm placeholder-gray-400"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode *</label>
                      <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-300 group-hover:shadow-md ${errors.pincode ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200" : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"}`}>
                        <input
                          type="text"
                          placeholder="Pincode"
                          value={formData.addressObj?.pincode || ""}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setFormData({ ...formData, addressObj: { ...(formData.addressObj || {}), pincode: value } });
                            if (!touched.pincode) setTouched((prev) => ({ ...prev, pincode: true }));
                            setErrors((prev) => ({ ...prev, pincode: validateField("pincode", value) }));
                          }}
                          onBlur={() => {
                            setTouched((prev) => ({ ...prev, pincode: true }));
                            setErrors((prev) => ({ ...prev, pincode: validateField("pincode", formData.addressObj?.pincode || "") }));
                          }}
                          name="pincode"
                          className="w-full bg-transparent outline-none text-sm placeholder-gray-400"
                        />
                      </div>
                      {touched.pincode && errors.pincode && (
                        <p className="text-red-500 text-xs mt-2 flex items-center">{errors.pincode}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bank Account Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bank Account No. *
                    </label>
                    <div
                      className={`flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-300 group-hover:shadow-md ${
                        errors.bankAccountNo
                          ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200"
                          : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
                      }`}
                    >
                      <svg className="w-5 h-5 text-gray-400 mr-3 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <input
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        value={formData.bankAccountNo}
                        name="bankAccountNo"
                        className="w-full bg-transparent outline-none text-sm placeholder-gray-400"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Enter account number"
                        maxLength={18}
                        required
                      />
                    </div>
                    {errors.bankAccountNo && (
                      <p className="text-red-500 text-xs mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {errors.bankAccountNo}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      IFSC Code *
                    </label>
                    <div
                      className={`flex items-center border-2 rounded-xl px-4 py-2.5 transition-all duration-300 group-hover:shadow-md ${
                        errors.ifscCode
                          ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200"
                          : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
                      }`}
                    >
                      <svg className="w-5 h-5 text-gray-400 mr-3 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                      <input
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        value={formData.ifscCode}
                        name="ifscCode"
                        className="w-full bg-transparent outline-none text-sm placeholder-gray-400"
                        type="text"
                        placeholder="e.g., ABCD0123456"
                        pattern="[A-Z]{4}0[A-Z0-9]{6}"
                        title="IFSC code format: ABCD0123456"
                        maxLength="11"
                        required
                      />
                    </div>
                    {errors.ifscCode && (
                      <p className="text-red-500 text-xs mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {errors.ifscCode}
                      </p>
                    )}
                  </div>
                </div>

                {/* File Upload Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ID Proof Field */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ID Proof *
                    </label>
                    <div
                      onDragOver={(e) => handleDragOver(e, "idProof")}
                      onDragLeave={(e) => handleDragLeave(e, "idProof")}
                      onDrop={(e) => handleDrop(e, "idProof")}
                      className="border-2 border-dashed border-gray-300 rounded-2xl p-3 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-300 cursor-pointer group-hover:shadow-md"
                    >
                      {idProof ? (
                        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 rounded-xl border border-indigo-200">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-indigo-700 truncate font-medium">
                              {idProofName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile("idProof")}
                            className="text-red-500 hover:text-red-700 ml-2 transition-colors flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="idProof" className="cursor-pointer">
                          <div className="w-12 h-12 mx-auto mb-3 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <span className="block text-indigo-600 hover:text-indigo-700 text-sm font-semibold mb-2">
                            Upload ID Proof
                          </span>
                          <p className="text-xs text-gray-500">
                            PDF, JPG, PNG (Max 500 KB)
                          </p>
                          <input
                            id="idProof"
                            onChange={(e) => handleFileChange(e, "idProof")}
                            className="hidden"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            required
                          />
                        </label>
                      )}
                    </div>
                    {errors.idProof && (
                      <p className="text-red-500 text-xs mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {errors.idProof}
                      </p>
                    )}
                  </div>

                  {/* Photo Field */}
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Photo *
                    </label>
                    <div
                      onDragOver={(e) => handleDragOver(e, "photo")}
                      onDragLeave={(e) => handleDragLeave(e, "photo")}
                      onDrop={(e) => handleDrop(e, "photo")}
                      className="border-2 border-dashed border-gray-300 rounded-2xl p-3 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-300 cursor-pointer group-hover:shadow-md"
                    >
                      {photo ? (
                        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 rounded-xl border border-indigo-200">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-indigo-700 truncate font-medium">
                              {photoName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile("photo")}
                            className="text-red-500 hover:text-red-700 ml-2 transition-colors flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="photo" className="cursor-pointer">
                          <div className="w-12 h-12 mx-auto mb-3 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="block text-indigo-600 hover:text-indigo-700 text-sm font-semibold mb-2">
                            Upload Photo
                          </span>
                          <p className="text-xs text-gray-500">
                            PNG, JPEG, JPG, WebP (Max 500 KB)
                          </p>
                          <input
                            id="photo"
                            onChange={(e) => handleFileChange(e, "photo")}
                            className="hidden"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            required
                          />
                        </label>
                      )}
                    </div>
                    {errors.photo && (
                      <p className="text-red-500 text-xs mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {errors.photo}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              </>
            )}

            <div className={`${state === "Sign Up" ? "" : ""} space-y-4`}>
              {/* Email Field */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="flex gap-3">
                  <div
                    className={`flex items-center gap-3 flex-1 border-2 rounded-xl px-4 py-3 transition-all duration-300 group-hover:shadow-md ${
                      errors.email
                        ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200"
                        : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
                    }`}
                  >
                    <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      onChange={handleEmailChange}
                      onBlur={handleBlur}
                      value={email}
                      className="w-full text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      type="email"
                      placeholder="Enter your email"
                      disabled={isEmailVerified}
                      required
                      name="email"
                    />
                  </div>
                  {state === "Sign Up" && (
                    <button
                      type="button"
                      onClick={() => sendOtp("email")}
                      disabled={
                        isEmailVerified ||
                        isSendingOtp ||
                        !email.includes("@") ||
                        errors.email
                      }
                      className={`px-6 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 transform hover:scale-105 ${
                        isEmailVerified
                          ? "bg-green-100 text-green-800 border-2 border-green-200 cursor-not-allowed"
                          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-2 border-indigo-200"
                      } ${
                        isSendingOtp || !email.includes("@") || errors.email
                          ? "opacity-50 cursor-not-allowed hover:scale-100"
                          : ""
                      }`}
                    >
                      {isEmailVerified
                        ? "✓ Verified"
                        : isSendingOtp
                        ? "Sending..."
                        : "Verify"}
                    </button>
                  )}
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password *
                </label>
                <div
                    className={`flex items-center border-2 rounded-xl px-4 py-2.5 transition-all duration-300 group-hover:shadow-md ${
                    errors.password
                      ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200"
                      : "border-gray-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
                  }`}
                >
                  <svg className="w-5 h-5 text-gray-400 mr-3 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    value={formData.password}
                    name="password"
                    className="w-full bg-transparent outline-none text-sm pr-10 placeholder-gray-400"
                    type={
                      state === "Login"
                        ? showPassword.login
                          ? "text"
                          : "password"
                        : showPassword.signup
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    required
                  />
                  {/* Show/Hide Password Button */}
                  <button
                    type="button"
                    onClick={() =>
                      state === "Login"
                        ? togglePasswordVisibility("login")
                        : togglePasswordVisibility("signup")
                    }
                    className="text-gray-400 hover:text-indigo-600 focus:outline-none transition-colors ml-2 p-1 rounded-lg hover:bg-indigo-50"
                  >
                    {state === "Login" ? (
                      showPassword.login ? (
                        // Eye open icon (password visible)
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        // Eye closed icon (password hidden) - DEFAULT STATE
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )
                    ) : showPassword.signup ? (
                      // Eye open icon (password visible)
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      // Eye closed icon (password hidden) - DEFAULT STATE
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {errors.password}
                  </p>
                )}
              </div>

              {state === "Login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => navigate("/reset-password")}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {/* Conditional Google reCAPTCHA for Login only */}
            {state === "Login" && showRecaptcha && (
              <div className="flex justify-center mb-4">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                  onChange={(token) => setRecaptchaToken(token)}
                  theme="light"
                />
              </div>
            )}

            {/* Enhanced Submit Button */}
            <button
              type="submit"
              disabled={
                loading ||
                (state === "Login" && showRecaptcha && !recaptchaToken)
              }
              className="w-full py-3 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center disabled:opacity-70 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {state === "Sign Up"
                    ? "Creating Account..."
                    : "Signing In..."}
                </>
              ) : state === "Sign Up" ? (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create Account
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Enhanced Footer Links */}
          <div className="mt-8 text-center">
            {state === "Sign Up" ? (
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => setState("Login")}
                  className="font-semibold text-indigo-600 hover:text-indigo-500 transition-all duration-300 hover:underline"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => setState("Sign Up")}
                  className="font-semibold text-indigo-600 hover:text-indigo-500 transition-all duration-300 hover:underline"
                >
                  Register as Technician
                </button>
              </p>
            )}
          </div>

          {/* Enhanced Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Enhanced Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-4 py-2 px-4 border-2 border-gray-200 rounded-2xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-[1.02]"
          >
            <img src={assets.google} alt="Google" className="w-5 h-5" />
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>

      {/* Map Picker Modal for Signup */}
      {showMapPickerSignup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden transform animate-scale-in">
            <MapPicker
              initialLat={formData.latitude}
              initialLng={formData.longitude}
              onClose={() => setShowMapPickerSignup(false)}
              onSave={({ address, lat, lng }) => {
                setFormData((prev) => ({
                  ...prev,
                  addressObj: address || {},
                  latitude: lat,
                  longitude: lng,
                    address:
                    (address?.houseNumber ? address.houseNumber + " " : "") +
                    (address?.street ? address.street + ", " : "") +
                    (address?.city ? address.city + ", " : "") +
                    (address?.pincode ? address.pincode : ""),
                }));
                setShowMapPickerSignup(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Enhanced OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-700/50 transform animate-scale-in">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-white text-2xl font-bold mb-3">
                Enter Verification Code
              </h3>
              <p className="text-indigo-200 mb-2">
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold text-white">
                  {verificationType === "email" ? email : mobile}
                </span>
              </p>
            </div>

            {/* OTP Input Fields */}
            <div className="flex justify-between gap-3 mb-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={otp[index] || ""}
                  onChange={(e) => handleOtpInput(e, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onPaste={handleOtpPaste}
                  className="w-14 h-14 bg-slate-700/50 text-center text-2xl font-bold rounded-xl text-white border-2 border-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 backdrop-blur-sm"
                  ref={(el) => (otpInputRefs.current[index] = el)}
                  autoFocus={index === 0}
                  disabled={timeLeft === 0}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={verifyOtp}
                disabled={otp.length !== 6 || timeLeft === 0}
                className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-bold rounded-2xl hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 transform hover:scale-105"
              >
                {timeLeft === 0 ? "OTP Expired" : "Verify Code"}
              </button>
              <button
                onClick={() => {
                  setShowOtpModal(false);
                  setOtp("");
                  setVerificationId("");
                  setTimeLeft(0);
                  setCanResendOtp(false);
                  resetOtpInputs();
                }}
                className="flex-1 py-2 border-2 border-slate-600 text-slate-300 font-semibold rounded-2xl hover:bg-slate-700 hover:text-white transition-all duration-300"
              >
                Cancel
              </button>
            </div>

            {/* Resend OTP Option */}
            <div className="text-center mt-6">
              {canResendOtp || timeLeft === 0 ? (
                <button
                  onClick={() => sendOtp(verificationType)}
                  disabled={isSendingOtp}
                  className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold disabled:opacity-50 transition-colors underline"
                >
                  {isSendingOtp ? "Sending..." : "Resend OTP"}
                </button>
              ) : (
                <p className="text-slate-500 text-sm">
                  Resend OTP in{" "}
                  <span className="font-bold text-slate-400">{formatTime(timeLeft)}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};