
// import React, { useState } from 'react';

// export function LoginCustomer() {
//   const [mobile, setMobile] = useState("");
//   const [otp, setOtp] = useState("");
//   const [step, setStep] = useState("mobile"); // 'mobile' or 'otp'
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   // Send OTP to mobile
//   const sendOtp = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       // Replace with your backend endpoint
//       const res = await fetch("/api/auth/customer/send-mobile-otp", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ mobile }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         setStep("otp");
//       } else {
//         setError(data.message || "Failed to send OTP");
//       }
//     } catch (err) {
//       setError("Network error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Verify OTP
//   const verifyOtp = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       // Replace with your backend endpoint
//       const res = await fetch("/api/auth/customer/verify-mobile-otp", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ mobile, otp }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         // Redirect or show success
//         window.location.href = "/";
//       } else {
//         setError(data.message || "Invalid OTP");
//       }
//     } catch (err) {
//       setError("Network error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={{ maxWidth: 400, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
//       <h2 style={{ textAlign: "center", marginBottom: 24 }}>Customer Login / Signup</h2>
//       {step === "mobile" && (
//         <>
//           <label htmlFor="mobile">Mobile Number</label>
//           <input
//             id="mobile"
//             type="text"
//             value={mobile}
//             onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
//             maxLength={10}
//             placeholder="Enter 10-digit mobile number"
//             style={{ width: "100%", padding: 8, marginBottom: 16 }}
//           />
//           <button
//             onClick={sendOtp}
//             disabled={loading || mobile.length !== 10}
//             style={{ width: "100%", padding: 10, background: "#4F46E5", color: "#fff", border: "none", borderRadius: 4 }}
//           >
//             {loading ? "Sending..." : "Send OTP"}
//           </button>
//         </>
//       )}
//       {step === "otp" && (
//         <>
//           <label htmlFor="otp">Enter OTP</label>
//           <input
//             id="otp"
//             type="text"
//             value={otp}
//             onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
//             maxLength={6}
//             placeholder="Enter 6-digit OTP"
//             style={{ width: "100%", padding: 8, marginBottom: 16 }}
//           />
//           <button
//             onClick={verifyOtp}
//             disabled={loading || otp.length !== 6}
//             style={{ width: "100%", padding: 10, background: "#4F46E5", color: "#fff", border: "none", borderRadius: 4 }}
//           >
//             {loading ? "Verifying..." : "Verify OTP & Login"}
//           </button>
//           <div style={{ marginTop: 12 }}>
//             <button onClick={() => setStep("mobile")} style={{ background: "none", border: "none", color: "#4F46E5", cursor: "pointer" }}>Change mobile number</button>
//           </div>
//         </>
//       )}
//       {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
//     </div>
//   );
// }


// import React, { useState, useContext } from 'react';
// import { AppContext } from '../context/AppContext';

// export function LoginCustomer() {
//   const [mobile, setMobile] = useState("");
//   const [otp, setOtp] = useState("");
//   const [step, setStep] = useState("mobile"); // 'mobile' or 'otp'
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const { backendUrl } = useContext(AppContext); // Get backendUrl from context

//   // Send OTP to mobile
//   const sendOtp = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       // ✅ CORRECT ENDPOINT - Use the right path and include backendUrl
//       const res = await fetch(`${backendUrl}/api/auth/customer/send-mobile-otp`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ mobile }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         setStep("otp");
//       } else {
//         setError(data.message || "Failed to send OTP");
//       }
//     } catch (err) {
//       setError("Network error");
//       console.error("Send OTP error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Verify OTP
//   const verifyOtp = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       // ✅ CORRECT ENDPOINT - Use the right path and include backendUrl
//       const res = await fetch(`${backendUrl}/api/auth/customer/verify-mobile-otp`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ mobile, otp }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         // Redirect or show success
//         window.location.href = "/";
//       } else {
//         setError(data.message || "Invalid OTP");
//       }
//     } catch (err) {
//       setError("Network error");
//       console.error("Verify OTP error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={{ maxWidth: 400, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
//       <h2 style={{ textAlign: "center", marginBottom: 24 }}>Customer Login / Signup</h2>
//       {step === "mobile" && (
//         <>
//           <label htmlFor="mobile">Mobile Number</label>
//           <input
//             id="mobile"
//             type="text"
//             value={mobile}
//             onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
//             maxLength={10}
//             placeholder="Enter 10-digit mobile number"
//             style={{ width: "100%", padding: 8, marginBottom: 16 }}
//           />
//           <button
//             onClick={sendOtp}
//             disabled={loading || mobile.length !== 10}
//             style={{ width: "100%", padding: 10, background: "#4F46E5", color: "#fff", border: "none", borderRadius: 4 }}
//           >
//             {loading ? "Sending..." : "Send OTP"}
//           </button>
//         </>
//       )}
//       {step === "otp" && (
//         <>
//           <label htmlFor="otp">Enter OTP</label>
//           <input
//             id="otp"
//             type="text"
//             value={otp}
//             onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
//             maxLength={6}
//             placeholder="Enter 6-digit OTP"
//             style={{ width: "100%", padding: 8, marginBottom: 16 }}
//           />
//           <button
//             onClick={verifyOtp}
//             disabled={loading || otp.length !== 6}
//             style={{ width: "100%", padding: 10, background: "#4F46E5", color: "#fff", border: "none", borderRadius: 4 }}
//           >
//             {loading ? "Verifying..." : "Verify OTP & Login"}
//           </button>
//           <div style={{ marginTop: 12 }}>
//             <button onClick={() => setStep("mobile")} style={{ background: "none", border: "none", color: "#4F46E5", cursor: "pointer" }}>Change mobile number</button>
//           </div>
//         </>
//       )}
//       {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
//     </div>
//   );
// }

// import React, { useState, useContext } from 'react';
// import { AppContext } from '../context/AppContext';
// import { toast } from 'react-toastify';
// import { useNavigate } from 'react-router-dom';


// export function LoginCustomer() {
//   const [mobile, setMobile] = useState("");
//   const [otp, setOtp] = useState("");
//   const [step, setStep] = useState("mobile");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const { backendUrl, setIsLoggedIn, setUserData } = useContext(AppContext);
//   const navigate = useNavigate();

//   // Send OTP to mobile
//   const sendOtp = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const res = await fetch(`${backendUrl}/api/auth/customer/send-mobile-otp`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ mobile }),
//       });
      
//       const data = await res.json();
      
//       if (data.success) {
//         setStep("otp");
//         toast.success("OTP sent successfully!");
        
//         // Auto-fill OTP in development mode
//         if (process.env.NODE_ENV !== 'production' && data.otp) {
//           setOtp(data.otp);
//           toast.info(`OTP auto-filled: ${data.otp}`);
//         }
//       } else {
//         setError(data.message || "Failed to send OTP");
//         toast.error(data.message || "Failed to send OTP");
//       }
//     } catch (err) {
//       setError("Network error");
//       toast.error("Network error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Verify OTP
//   const verifyOtp = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const res = await fetch(`${backendUrl}/api/auth/customer/verify-mobile-otp`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ mobile, otp }),
//         credentials: 'include'
//       });
      
//       const data = await res.json();
      
//       if (data.success) {
//         setIsLoggedIn(true);
//         setUserData(data.data);
//         toast.success("Login successful!");
//         navigate("/customer");
//       } else {
//         setError(data.message || "Invalid OTP");
//         toast.error(data.message || "Invalid OTP");
//       }
//     } catch (err) {
//       setError("Network error");
//       toast.error("Network error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={{ maxWidth: 400, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
//       <h2 style={{ textAlign: "center", marginBottom: 24 }}>Customer Login / Signup</h2>
      
//       {step === "mobile" && (
//         <>
//           <label htmlFor="mobile">Mobile Number</label>
//           <input
//             id="mobile"
//             type="text"
//             value={mobile}
//             onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
//             maxLength={10}
//             placeholder="Enter 10-digit mobile number"
//             style={{ width: "100%", padding: 8, marginBottom: 16 }}
//           />
//           <button
//             onClick={sendOtp}
//             disabled={loading || mobile.length !== 10}
//             style={{ width: "100%", padding: 10, background: "#4F46E5", color: "#fff", border: "none", borderRadius: 4 }}
//           >
//             {loading ? "Sending..." : "Send OTP"}
//           </button>
//         </>
//       )}
      
//       {step === "otp" && (
//         <>
//           <label htmlFor="otp">Enter OTP</label>
//           <input
//             id="otp"
//             type="text"
//             value={otp}
//             onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
//             maxLength={6}
//             placeholder="Enter 6-digit OTP"
//             style={{ width: "100%", padding: 8, marginBottom: 16 }}
//           />
//           <button
//             onClick={verifyOtp}
//             disabled={loading || otp.length !== 6}
//             style={{ width: "100%", padding: 10, background: "#4F46E5", color: "#fff", border: "none", borderRadius: 4 }}
//           >
//             {loading ? "Verifying..." : "Verify OTP & Login"}
//           </button>
          
//           <div style={{ marginTop: 12 }}>
//             <button 
//               onClick={() => {
//                 setStep("mobile");
//                 setOtp("");
//               }} 
//               style={{ background: "none", border: "none", color: "#4F46E5", cursor: "pointer" }}
//             >
//               Change mobile number
//             </button>
//           </div>
//         </>
//       )}
      
//       {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
//     </div>
//   );
// }



import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export function LoginCustomer() {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { backendUrl, setIsLoggedIn, setUserData } = useContext(AppContext);
  const navigate = useNavigate();

  // OTP Countdown states
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Add this ref for OTP inputs
  const otpInputRefs = useRef([]);

  // OTP input handlers
  const handleOtpInput = (e, index) => {
    const value = e.target.value.replace(/\D/g, ''); // Only numbers
    if (value) {
      const newOtp = otp.split('');
      newOtp[index] = value;
      const joinedOtp = newOtp.join('');
      setOtp(joinedOtp);
      
      // Auto-focus next input
      if (index < 5 && value) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input on backspace
        otpInputRefs.current[index - 1]?.focus();
      }
      
      const newOtp = otp.split('');
      newOtp[index] = '';
      setOtp(newOtp.join(''));
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setOtp(pastedData);
      // Focus the last input after paste
      setTimeout(() => {
        otpInputRefs.current[5]?.focus();
      }, 0);
    }
  };

  const resetOtpInputs = () => {
    setOtp('');
    otpInputRefs.current.forEach(input => {
      if (input) input.value = '';
    });
    if (otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  };

  // Format time for display (MM:SS)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  // Send OTP to mobile
  const sendOtp = async () => {
    setIsSendingOtp(true);
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/auth/customer/send-mobile-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setStep("otp");
        
        // Set OTP expiry time (15 minutes from now)
        setTimeLeft(2 * 60); // 15 minutes in seconds
        setCanResendOtp(false);
        
        toast.success("OTP sent successfully!");
        
        // Auto-fill OTP in development mode
        if (process.env.NODE_ENV !== 'production' && data.otp) {
          setOtp(data.otp);
          toast.info(`OTP auto-filled: ${data.otp}`);
        }
      } else {
        setError(data.message || "Failed to send OTP");
        toast.error(data.message || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
    setLoading(true);
    setError("");
    
    if (timeLeft === 0) {
      toast.error("OTP has expired. Please request a new one.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/auth/customer/verify-mobile-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp }),
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (data.success) {
        setIsLoggedIn(true);
        setUserData(data.data);
        setTimeLeft(0); // Reset timer
        setCanResendOtp(false);
        toast.success("Login successful!");
        navigate("/customer");
      } else {
        setError(data.message || "Invalid OTP");
        toast.error(data.message || "Invalid OTP");
      }
    } catch (err) {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOtp = async () => {
    setIsSendingOtp(true);
    setError("");
    resetOtpInputs();
    
    try {
      const res = await fetch(`${backendUrl}/api/auth/customer/send-mobile-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setTimeLeft(2 * 60); // Reset to 15 minutes
        setCanResendOtp(false);
        toast.success("OTP resent successfully!");
        
        // Auto-fill OTP in development mode
        if (process.env.NODE_ENV !== 'production' && data.otp) {
          setOtp(data.otp);
          toast.info(`OTP auto-filled: ${data.otp}`);
        }
      } else {
        setError(data.message || "Failed to resend OTP");
        toast.error(data.message || "Failed to resend OTP");
      }
    } catch (err) {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg 
                className="w-10 h-10 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Customer Login
            </h2>
            <p className="text-gray-600 mt-2">
              Enter your mobile number to get started
            </p>
          </div>

          {step === "mobile" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg px-4 py-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-colors">
                  <svg
                    className="w-5 h-5 text-gray-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500"
                    required
                  />
                </div>
                {mobile.length === 10 && (
                  <p className="text-green-600 text-xs mt-1">
                    ✓ Valid mobile number
                  </p>
                )}
              </div>

              <button
                onClick={sendOtp}
                disabled={isSendingOtp || mobile.length !== 10}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-70 shadow-md hover:shadow-lg"
              >
                {isSendingOtp ? (
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
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </button>

              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-6">
              <div className="text-center mb-2">
                <p className="text-gray-600">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-semibold text-gray-900">+91 {mobile}</span>
                </p>
                
                {/* Countdown Timer */}
                {/* {timeLeft > 0 ? (
                  <div className="flex items-center justify-center space-x-2 mt-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <p className="text-red-400 text-sm font-medium">
                      Expires in: <span className="font-bold">{formatTime(timeLeft)}</span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-red-400 text-sm font-medium">
                      OTP has expired
                    </p>
                  </div>
                )} */}
              </div>

              {/* OTP Input Fields */}
              <div className="flex justify-between gap-3 mb-6">
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
                    className="w-12 h-12 bg-gray-50 text-center text-xl font-semibold rounded-lg text-gray-900 border-2 border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    autoFocus={index === 0}
                    disabled={timeLeft === 0}
                  />
                ))}
              </div>

              <button
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6 || timeLeft === 0}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-70 shadow-md hover:shadow-lg"
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
                    Verifying...
                  </>
                ) : timeLeft === 0 ? (
                  "OTP Expired"
                ) : (
                  "Verify & Login"
                )}
              </button>

              {/* Resend OTP Option */}
              <div className="text-center">
                {canResendOtp || timeLeft === 0 ? (
                  <button
                    onClick={resendOtp}
                    disabled={isSendingOtp}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {isSendingOtp ? "Sending..." : "Resend OTP"}
                  </button>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Resend OTP in <span className="font-medium">{formatTime(timeLeft)}</span>
                  </p>
                )}
              </div>

              {/* Change Mobile Number */}
              <div className="text-center">
                <button 
                  onClick={() => {
                    setStep("mobile");
                    setOtp("");
                    setTimeLeft(0);
                    setCanResendOtp(false);
                    resetOtpInputs();
                  }} 
                  className="text-gray-600 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  Change mobile number
                </button>
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              By continuing, you agree to our{" "}
              <a href="/terms" className="text-indigo-600 hover:text-indigo-500">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-indigo-600 hover:text-indigo-500">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}