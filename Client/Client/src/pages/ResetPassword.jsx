import React, { useState, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';

export const ResetPassword = () => {
  const { backendUrl: contextBackendUrl } = useContext(AppContext);
  const backendUrl = contextBackendUrl || "http://localhost:4000";
  axios.defaults.withCredentials = true;

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEmailsent, setISEmailsent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isOtpSubmited, setIsOtpSubmit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [isOtpExpired, setIsOtpExpired] = useState(false);

  const inputRefs = useRef([]);

  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false
  });

  // Timer effect for OTP expiration
  useEffect(() => {
    if (isEmailsent && !isOtpSubmited && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isOtpSubmited) {
      setIsOtpExpired(true);
    }
  }, [isEmailsent, isOtpSubmited, timeLeft]);

  // Format time to mm:ss
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle OTP input
  const handleInput = (e, index) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    e.target.value = val;
    if (val && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Email submit
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/send-reset-otp`, { email });
      data.success ? toast.success(data.message) : toast.error(data.message);
      if (data.success) {
        setISEmailsent(true);
        setTimeLeft(120); // Reset timer
        setIsOtpExpired(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // OTP submit
  const onSubmitOTP = (e) => {
    e.preventDefault();
    
    if (isOtpExpired) {
      toast.error("OTP has expired. Please request a new one.");
      return;
    }

    const otpValue = inputRefs.current.map((input) => input.value).join('');
    if (otpValue.length !== 6) {
      toast.error("Please enter the full 6-digit OTP");
      return;
    }
    setOtp(otpValue);
    setIsOtpSubmit(true);
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/send-reset-otp`, { email });
      data.success ? toast.success(data.message) : toast.error(data.message);
      if (data.success) {
        setTimeLeft(120); // Reset timer to 2 minutes
        setIsOtpExpired(false);
        // Clear previous OTP inputs
        inputRefs.current.forEach(input => input.value = '');
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // New password submit
  const onSubmitNewPassword = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!email || !otp || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/reset-password`, {
        email,
        otp,
        newPassword
      });
      
      if (data.success) {
        toast.success(data.message);
        navigate('/login');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-6 sm:px-0 bg-gradient-to-br from-blue-200 to-purple-400 relative">
      <img
        onClick={() => navigate('/')}
        src={assets.navbarlogo}
        alt="Logo"
        className="absolute left-5 sm:left-20 top-5 w-28 sm:w-22 cursor-pointer hover:scale-105 transition-transform"
      />

      {/* Email form */}
      {!isEmailsent && (
        <form
          onSubmit={handleEmailSubmit}
          className="bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm"
        >
          <h1 className="text-white text-2xl font-semibold text-center mb-4">Reset Password</h1>
          <p className="text-center mb-6 text-indigo-300">Enter your registered email address to receive a reset OTP.</p>
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
            <img src={assets.mail_icon} alt="" className="w-4 h-4" />
            <input
              type="email"
              placeholder="Email address"
              className="bg-transparent outline-none text-white w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-900 text-white rounded-full mt-3 hover:from-indigo-600 hover:to-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending OTP...' : 'Send Reset OTP'}
          </button>
        </form>
      )}

      {/* OTP form */}
      {!isOtpSubmited && isEmailsent && (
        <form
          onSubmit={onSubmitOTP}
          className="bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm"
        >
          <h1 className="text-white text-2xl font-semibold text-center mb-4">Enter OTP</h1>
          <p className="text-center mb-2 text-indigo-300">
            Enter the 6-digit code sent to <span className="font-medium">{email}</span>
          </p>
          
          {/* Timer display */}
          <div className="text-center mb-4">
            <p className={`text-sm font-medium ${timeLeft <= 30 ? 'text-red-400' : 'text-indigo-300'}`}>
              Time remaining: {formatTime(timeLeft)}
            </p>
            {isOtpExpired && (
              <p className="text-red-400 text-sm mt-1">OTP has expired</p>
            )}
          </div>

          <div className="flex justify-between mb-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                required
                className="w-12 h-12 bg-[#333A5c] text-center text-xl rounded-md text-white border border-gray-600 focus:border-indigo-400 focus:outline-none"
                ref={(el) => (inputRefs.current[index] = el)}
                onInput={(e) => handleInput(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={loading || isOtpExpired}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || isOtpExpired}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-900 text-white rounded-full hover:from-indigo-600 hover:to-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>

          <button
            type="button"
            onClick={handleResendOTP}
            disabled={loading || timeLeft > 0}
            className="w-full py-2 text-indigo-300 hover:text-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Resend OTP'}
          </button>
        </form>
      )}

      {/* New password form */}
      {isOtpSubmited && isEmailsent && (
        <form
          onSubmit={onSubmitNewPassword}
          className="bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm"
        >
          <h1 className="text-white text-2xl font-semibold text-center mb-4">Set New Password</h1>
          <p className="text-center mb-6 text-indigo-300">Create a new password for your account.</p>
          
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C] relative">
            <img src={assets.lock_icon} alt="" className="w-4 h-4" />
            <input
              type={showPassword.newPassword ? "text" : "password"}
              placeholder="New Password"
              className="bg-transparent outline-none text-white w-full pr-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('newPassword')}
              className="absolute right-3 text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              {showPassword.newPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="mb-6 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C] relative">
            <img src={assets.lock_icon} alt="" className="w-4 h-4" />
            <input
              type={showPassword.confirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              className="bg-transparent outline-none text-white w-full pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirmPassword')}
              className="absolute right-3 text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              {showPassword.confirmPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-900 text-white rounded-full hover:from-indigo-600 hover:to-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
};