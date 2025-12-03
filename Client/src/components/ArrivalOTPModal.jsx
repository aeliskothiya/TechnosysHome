import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Lock } from 'lucide-react';

const ArrivalOTPModal = ({ bookingId, backendUrl, onClose, onSuccess, mode = 'arrival' }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [expiresAt, setExpiresAt] = useState(null);
  const [remaining, setRemaining] = useState(120);
  const [resendEnabled, setResendEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const otpInputRefs = useRef([]);

  const closeDisabled = true; // cannot close until verified

  const requestOTP = async () => {
    try {
      const endpoint = mode === 'completion' ? 'generate-completion-otp' : 'generate-arrival-otp';
      const { data } = await axios.post(`${backendUrl}/api/bookings/${endpoint}`, { bookingId }, { withCredentials: true });
      if (data.success) {
        setExpiresAt(new Date(data.expiresAt));
        setRemaining(120);
        setResendEnabled(false);
        toast.info(mode === 'completion' ? 'Completion OTP resent to customer' : 'OTP resent to customer');
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  // countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((r) => {
        const next = Math.max(0, r - 1);
        if (next === 0) setResendEnabled(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpInput = (e, index) => {
    const value = e.target.value;
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, idx) => {
      if (idx < 6) newOtp[idx] = char;
    });
    setOtp(newOtp);

    const nextEmpty = newOtp.findIndex((val) => !val);
    if (nextEmpty !== -1) {
      otpInputRefs.current[nextEmpty]?.focus();
    } else {
      otpInputRefs.current[5]?.focus();
    }
  };

  const submitOTP = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = mode === 'completion' ? 'verify-completion-otp' : 'verify-arrival-otp';
      const { data } = await axios.post(`${backendUrl}/api/bookings/${endpoint}`, { bookingId, otp: code }, { withCredentials: true });
      if (data.success) {
        toast.success(mode === 'completion' ? 'Service marked completed' : 'Arrival verified. Service started');
        onSuccess?.();
      } else {
        toast.error(data.message || 'Invalid OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 w-full max-w-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* Header with gradient icon */}
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {mode === 'completion' ? 'Enter Completion Code' : 'Enter Verification Code'}
          </h3>
          <p className="text-slate-400 text-sm text-center">
            {mode === 'completion' 
              ? 'Enter the 6-digit code sent to customer' 
              : 'Enter the 6-digit code sent to customer'}
          </p>
        </div>

        {/* OTP Input Section */}
        <div className="px-6 pb-6">
          <div className="flex gap-2 justify-center mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (otpInputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpInput(e, index)}
                onKeyDown={(e) => handleOtpKeyDown(e, index)}
                onPaste={handleOtpPaste}
                className="w-12 h-14 text-center text-2xl font-bold bg-slate-800 border-2 border-slate-600 rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all duration-200 hover:border-slate-500"
                autoComplete="off"
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={submitOTP}
              disabled={submitting || otp.join('').length !== 6}
              className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 ${
                submitting || otp.join('').length !== 6
                  ? 'bg-slate-700 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/30'
              }`}
            >
              {submitting ? 'Verifying…' : 'Verify Code'}
            </button>

            <button
              onClick={requestOTP}
              disabled={!resendEnabled}
              className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
                resendEnabled
                  ? 'bg-slate-800 text-white border-2 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                  : 'bg-slate-900 text-slate-600 border-2 border-slate-800 cursor-not-allowed'
              }`}
            >
              {resendEnabled ? 'Resend OTP' : `Resend OTP in ${formatTime(remaining)}`}
            </button>
          </div>

          {/* Warning message */}
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-amber-200 text-xs text-center leading-relaxed">
              {mode === 'completion' 
                ? '⚠️ Only request this code if the service is completely finished.' 
                : '⚠️ Do NOT proceed unless you have arrived at the location.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArrivalOTPModal;
