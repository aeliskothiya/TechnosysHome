import React, { useContext, useEffect, useRef, useState } from 'react';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export const EmailVerify = () => {
  const navigate = useNavigate();
  const { backendUrl, isLoggedIn, userData, getUserData, fetchUserData } = useContext(AppContext);
  const refreshUserData = getUserData || fetchUserData;

  const inputRefs = useRef([]);
  const [timer, setTimer] = useState(0); // Cooldown timer in seconds
  const [otpStatus, setOtpStatus] = useState(null); // null | 'error' | 'success'

  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  // Redirect if already verified
  useEffect(() => {
    if (isLoggedIn && userData?.isAccountVerified) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, userData, navigate]);

  // Countdown for resend button
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

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

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData)
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    paste.split('').forEach((char, i) => {
      if (inputRefs.current[i]) inputRefs.current[i].value = char;
    });
    const nextIndex = Math.min(paste.length, inputRefs.current.length - 1);
    if (inputRefs.current[nextIndex]) inputRefs.current[nextIndex].focus();
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      const otpArray = inputRefs.current.map((el) => (el ? el.value : ''));
      const otp = otpArray.join('');

      if (otp.length !== 6) {
        toast.error('Please enter the 6-digit OTP');
        return;
      }

      const { data } = await axios.post(`${backendUrl}/api/auth/verify-account`, { otp });

      if (data?.success) {
        setOtpStatus('success');
        toast.success(data.message || 'Email verified successfully');

        // Wait for animation before redirect to login with state
        setTimeout(async () => {
          if (refreshUserData) await refreshUserData();
          navigate('/login', { 
            replace: true,
            state: { fromVerification: true }
          });
        }, 1000);
      } else {
        setOtpStatus('error');
        toast.error(data?.message || 'Verification failed');

        // Reset animation after shake
        setTimeout(() => setOtpStatus(null), 500);
      }
    } catch (error) {
      setOtpStatus('error');
      toast.error(error.response?.data?.message || error.message || 'Something went wrong');
      setTimeout(() => setOtpStatus(null), 500);
    }
  };

  const resendOtpHandler = async () => {
    try {
      setTimer(60); // Start cooldown
      const { data } = await axios.post(`${backendUrl}/api/auth/send-verify-otp`);
      if (data?.success) {
        toast.success(data.message || 'OTP resent successfully');
      } else {
        toast.error(data?.message || 'Failed to resend OTP');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Something went wrong');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative">
      <style>
        {`
          @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            50% { transform: translateX(4px); }
            75% { transform: translateX(-4px); }
            100% { transform: translateX(0); }
          }
          .animate-shake {
            animation: shake 0.4s ease-in-out;
          }
        `}
      </style>

      <img
        onClick={() => navigate('/')}
  src={assets.navbarlogo}
        alt="Logo"
        className="absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer transition-transform hover:scale-105"
      />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden mx-4">
        <div className="bg-indigo-600 py-6 px-6">
          <h1 className="text-white text-2xl font-bold text-center">Verify Your Email</h1>
          <p className="text-indigo-200 text-center text-sm mt-2">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        <form onSubmit={onSubmitHandler} onPaste={handlePaste} className="p-8">
          <div className="flex justify-between mb-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                required
                placeholder="•"
                className={`w-12 h-12 text-center text-xl rounded-lg border transition-all
                  ${otpStatus === 'error' 
                    ? 'animate-shake border-red-500 bg-red-50' 
                    : otpStatus === 'success' 
                    ? 'border-green-500 bg-green-50 animate-pulse' 
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                  }
                `}
                ref={(el) => (inputRefs.current[index] = el)}
                onInput={(e) => handleInput(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              />
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Verify Email
          </button>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={resendOtpHandler}
              disabled={timer > 0}
              className={`text-indigo-600 hover:text-indigo-700 transition-colors ${
                timer > 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
            </button>
          </div>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};