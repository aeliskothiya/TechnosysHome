import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModels.js";
import transporter from "../config/nodemailer.js";
import UserGoogle from "../models/userGoogleModel.js";
import Technician from "../models/Technician.js";
import TechnicianBankDetails from "../models/TechnicianBankDetails.js";
import TechnicianServiceCategory from "../models/TechnicianServiceCategory.js";
import TempOtpVerification from "../models/TempOtpVerification.js";
import twilio from "twilio";
import Admin from "../models/Admin.js";
import LoginBlock from "../models/LoginBlock.js";
import axios from "axios";
import Customer from "../models/Customer.js";
import nodemailer from "nodemailer";
import { processUploadedImage, deleteImageFile } from "../utils/imageUtils.js";


//date = 12-10-25
export const register = async (req, res) => {
  try {
    // File validation
    if (!req.files || !req.files.idProof || !req.files.photo) {
      return res
        .status(400)
        .json({ success: false, message: "ID proof and photo are required" });
    }

    const {
      name,
      mobileNumber,
      email,
      password,
      address,
      serviceCategoryID,
      bankAccountNo,
      ifscCode,
    } = req.body;

    // Normalize address: accept `address` as object, JSON string (FormData) or flat fields
    let addrFromBody = address || req.body.Address || req.body.address;
    // If Address was sent as a JSON string (FormData), parse it
    if (typeof addrFromBody === "string") {
      try {
        addrFromBody = JSON.parse(addrFromBody);
      } catch (e) {
        // keep as string if not valid JSON
      }
    }

    const houseNumber = req.body.houseNumber || req.body.house_number || (addrFromBody && addrFromBody.houseNumber) || "";
    const street = req.body.street || (addrFromBody && addrFromBody.street) || "";
    const city = req.body.city || (addrFromBody && addrFromBody.city) || "";
    const pincode = req.body.pincode || req.body.pin || (addrFromBody && addrFromBody.pincode) || "";

    const addressObj = {
      houseNumber,
      street,
      city,
      pincode,
    };

    // Location: accept latitude/longitude or lat/lng or location.coordinates
    const lat = req.body.latitude || req.body.lat || (req.body.location && req.body.location.lat);
    const lng = req.body.longitude || req.body.lng || (req.body.location && req.body.location.lng);
    const coordsFromBody = req.body.location && req.body.location.coordinates;
    let locationObj = undefined;
    if ((lat && lng) || (Array.isArray(coordsFromBody) && coordsFromBody.length >= 2)) {
      if (Array.isArray(coordsFromBody) && coordsFromBody.length >= 2) {
        locationObj = { type: "Point", coordinates: coordsFromBody };
      } else {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
          locationObj = { type: "Point", coordinates: [lngNum, latNum] };
        }
      }
    }

    // --- DEBUG LOGS: show incoming payload for easier troubleshooting ---
    try {
      console.log("[register] req.body:", JSON.stringify(req.body));
    } catch (e) {
      console.log("[register] req.body (unserializable)", req.body);
    }
    console.log("[register] req.files keys:", req.files ? Object.keys(req.files) : req.files);
    console.log("[register] raw req.body.Address:", req.body.Address);
    console.log("[register] parsed addressObj:", addressObj);
    console.log("[register] parsed lat/lng:", { lat, lng, coordsFromBody });

    // Check required fields
    const missingFields = [];
    if (!name) missingFields.push("name");
    if (!mobileNumber) missingFields.push("mobileNumber");
    if (!email) missingFields.push("email");
    if (!password) missingFields.push("password");

    // For address, prefer structured object. If structured present, require specific subfields
    const hasAddressString = (typeof address === "string" && address.trim().length > 0) || (typeof req.body.Address === "string" && req.body.Address.trim().length > 0);
    const hasStructuredAddress = addressObj && Object.values(addressObj).some((v) => v && String(v).trim().length > 0);

    // If structured address provided, require houseNumber, city, pincode (street optional)
    if (hasStructuredAddress) {
      if (!addressObj.houseNumber || String(addressObj.houseNumber).trim().length === 0) missingFields.push("address.houseNumber");
      if (!addressObj.city || String(addressObj.city).trim().length === 0) missingFields.push("address.city");
      if (!addressObj.pincode || String(addressObj.pincode).trim().length === 0) missingFields.push("address.pincode");
    } else if (!hasAddressString) {
      // no structured address and no address string at all
      missingFields.push("address");
    }

    if (!serviceCategoryID) missingFields.push("serviceCategoryID");
    if (!bankAccountNo) missingFields.push("bankAccountNo");
    if (!ifscCode) missingFields.push("ifscCode");

    if (missingFields.length > 0) {
      console.log("[register] missing required fields:", missingFields);
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        missing: missingFields,
        received: {
          bodyPreview: {
            name: !!name,
            mobileNumber: !!mobileNumber,
            email: !!email,
            password: !!password,
            addressString: hasAddressString,
            structuredAddressPresent: hasStructuredAddress,
            serviceCategoryID: !!serviceCategoryID,
            bankAccountNo: !!bankAccountNo,
            ifscCode: !!ifscCode,
          },
        },
      });
    }

    // ✅ Ensure OTPs are verified
    const mobileVerified = await TempOtpVerification.findOne({
      contactType: "mobile",
      contactValue: mobileNumber,
      isVerified: true,
    });

    const emailVerified = await TempOtpVerification.findOne({
      contactType: "email",
      contactValue: email,
      isVerified: true,
    });

    if (!mobileVerified || !emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify both mobile and email before registration",
      });
    }

    // ✅ Ensure Technician doesn’t already exist
    const existingTechnician = await Technician.findOne({
      $or: [{ Email: email }, { MobileNumber: mobileNumber }],
    });

    if (existingTechnician) {
      return res.status(409).json({
        success: false,
        message: "Technician already exists with this email or mobile number",
      });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Process and convert photo to WebP
    let photoPath = null;
    try {
      const photoResult = await processUploadedImage(req.files.photo[0], "uploads/photos");
      if (!photoResult.success) {
        return res.status(400).json({
          success: false,
          message: `Photo upload error: ${photoResult.message}`
        });
      }
      photoPath = photoResult.filePath;
      console.log(`Photo processed and converted to WebP: ${photoPath}`);
    } catch (photoError) {
      console.error("Photo processing error:", photoError);
      return res.status(400).json({
        success: false,
        message: "Failed to process photo. Please ensure it's a valid image (PNG, JPEG, JPG, WebP) under 500 KB"
      });
    }

    // ✅ File path for ID Proof
    const idProofPath = `/uploads/idProofs/${req.files.idProof[0].filename}`;

    // ✅ Create technician (core profile)
    const technicianPayload = {
      Name: name,
      MobileNumber: mobileNumber,
      Email: email,
      Password: hashedPassword,
      Address: addressObj,
      IDProof: idProofPath,
      Photo: photoPath,
      VerifyStatus: "Pending",
      isMobileVerified: true,
      isEmailVerified: true,
      ActiveStatus: "Active",
    };

    if (locationObj) technicianPayload.location = locationObj;

    const technician = new Technician(technicianPayload);

    await technician.save();

    // ✅ Persist bank details and service-category mapping in separate collections
    try {
      const bank = new TechnicianBankDetails({
        TechnicianID: technician._id,
        BankAccountNo: bankAccountNo,
        IFSCCode: ifscCode,
      });
      await bank.save();

      const svc = new TechnicianServiceCategory({
        TechnicianID: technician._id,
        ServiceCategoryID: serviceCategoryID,
      });
      await svc.save();
    } catch (relErr) {
      console.error("Failed to save technician related records:", relErr);
      // Optionally continue — don't block registration if related records fail
    }

    // ✅ Mark OTP records as used
    await TempOtpVerification.updateMany(
      { contactValue: { $in: [mobileNumber, email] } },
      { $set: { isVerified: false } }
    );

    // ✅ Generate JWT
    const token = jwt.sign({ id: technician._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ✅ Welcome email
    try {
      await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: "Welcome to Technosys!",
        html: `
          <h2 style="color:#4F46E5;">Welcome to Technosys!</h2>
          <p>Dear ${name},</p>
          <p>Your technician account has been created successfully and is pending verification.</p>
          <p>Our team will review your application and notify you once approved.</p>
        `,
      });
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
    }

    return res.status(201).json({
      success: true,
      message: "Technician registered successfully",
      data: {
        id: technician._id,
        name: technician.Name,
        email: technician.Email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ success: false, message: "File too large. Maximum file size is 500 KB" });
    }

    if (error.message && error.message.includes("Invalid photo format")) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid photo format. Supported: PNG, JPEG, JPG, WebP" });
    }

    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Technician already exists" });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  const { email, password, recaptchaToken } = req.body;
  // Find login block info
  const loginBlock = await LoginBlock.findOne({ Email: email });
  // If failed attempts >= 1, require reCAPTCHA
  if (loginBlock && loginBlock.AttemptCount >= 1 ) {
    if (!recaptchaToken) {
      return res.status(400).json({ success: false, message: "reCAPTCHA required" });
    }
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
    try {
      const response = await axios.post(verifyUrl);
      if (!response.data.success) {
        return res.status(400).json({ success: false, message: "reCAPTCHA failed" });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: "reCAPTCHA error" });
    }
  }

  const { email: userEmail, password: userPassword } = req.body;

  if (!userEmail || !userPassword) {
    return res.status(400).json({
      success: false,
      message: "Email and Password are required",
    });
  }

  try {
    // Brute-force protection: check block status
    const loginBlock = await LoginBlock.findOne({ Email: userEmail });
    if (loginBlock && loginBlock.BlockedUntil && loginBlock.BlockedUntil > new Date()) {
      const waitMinutes = Math.ceil((loginBlock.BlockedUntil - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${waitMinutes} minute(s).`,
      });
    }

    let user = null;
    let userType = "";
    // Check if it's an admin login (admin emails might have a specific pattern or check both collections)
    const admin = await Admin.findOne({ username: userEmail });
    if (admin) {
      const isMatch = await bcrypt.compare(userPassword, admin.password);
      if (isMatch) {
        user = admin;
        userType = "admin";
      }
    }

    // If not admin, check technician
    if (!user) {
      const technician = await Technician.findOne({ Email: userEmail });

      if (technician) {
        // Check if technician is approved
        if (technician.VerifyStatus !== "Approved") {
          return res.status(403).json({
            success: false,
            message:
              "Your account is not yet approved. Please wait for verification.",
          });
        }

        // Check if technician is active
        if (technician.ActiveStatus !== "Active") {
          return res.status(403).json({
            success: false,
            message:
              "Your account has been deactivated. Please contact support.",
          });
        }

        const isMatch = await bcrypt.compare(userPassword, technician.Password);
        if (isMatch) {
          user = technician;
          userType = "technician";
        }
      }
    }

    // If no user found or password doesn't match
    if (!user) {
      // Update attempt count and block if needed
      if (loginBlock) {
        loginBlock.AttemptCount += 1;
        if (loginBlock.AttemptCount >= 3) {
          loginBlock.BlockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 min
          await loginBlock.save();
          return res.status(429).json({
            success: false,
            message: "Too many failed attempts. You are blocked for 5 minutes.",
          });
        } else {
          await loginBlock.save();
        }
      } else {
        await LoginBlock.create({ Email: userEmail, AttemptCount: 1 });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    } else {
      // On successful login, reset block info
      if (loginBlock) {
        loginBlock.AttemptCount = 0;
        loginBlock.BlockedUntil = null;
        await loginBlock.save();
      }
    }

    // Create token with user type information
    const token = jwt.sign(
      {
        id: user._id,
        type: userType,
        email: userType === "admin" ? user.username : user.Email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // return res.json({
    //   success: true,
    //   message: "Login successful",
    //   data: {
    //     id: technician._id,
    //     name: technician.Name,
    //     email: technician.Email,
    //     photo: technician.Photo,
    //   },
    // });

    // Prepare response data based on user type
    let responseData = {};
    if (userType === "admin") {
      responseData = {
        id: user._id,
        name: "Administrator",
        email: user.username,
        role: "admin",
      };
    } else {
      responseData = {
        id: user._id,
        name: user.Name,
        email: user.Email,
        role: "technician",
        photo: user.Photo,
      };
    }

    return res.json({
      success: true,
      message: "Login successful",
      data: responseData,
      userType: userType,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
// ================= GOOGLE LOGIN =================
export const googleLogin = async (req, res) => {
  try {
    const { googleId, name, email, picture } = req.body;

    if (!googleId || !email) {
      return res.json({
        success: false,
        message: "Google login failed. Missing data",
      });
    }

    let user = await UserGoogle.findOne({ googleId });

    if (!user) {
      user = new UserGoogle({
        googleId,
        name,
        email,
        picture,
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, message: "Google login successful" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// export const logout = async (req, res) => {
//   try {
//     res.clearCookie("token", {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
//     });
//     return res.json({ success: true, message: "Logged Out" });
//   } catch (error) {
//     return res.json({ success: false, message: error.message });
//   }
// };
// // ================= IS AUTH =================
// export const isAuthenticated = async (req, res) => {
//   try {
//     return res.json({ success: true });
//   } catch (error) {
//     res.json({ success: false, message: error.message });
//   }
// };

// ================= IS AUTH =================
export const isAuthenticated = async (req, res) => {
  try {
    return res.json({ success: true, user: req.user,isLoggedIn: true,
      message: "User is authenticated",
      userType: req.userType,
      userEmail: req.userEmail });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ================= LOGOUT =================
export const logout = async (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in production, false in development
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.json({ success: true, message: "Logged Out Successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// export const verifyMobileOtp = async (req, res) => {
//   try {
//     const { mobile, otp } = req.body;

//     if (!mobile || !otp) {
//       return res.status(400).json({
//         success: false,
//         message: "Mobile number and OTP are required",
//       });
//     }

//     // In a real implementation, you would:
//     // 1. Retrieve the stored OTP for this mobile number from your database
//     // 2. Check if it matches and hasn't expired
//     // 3. Mark the mobile as verified

//     // For this example, we'll just validate the OTP format
//     if (otp.length !== 6 || !/^\d+$/.test(otp)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid OTP format",
//       });
//     }

//     // In development mode, accept any 6-digit OTP
//     if (process.env.NODE_ENV === 'development') {
//       return res.status(200).json({
//         success: true,
//         message: "Mobile number verified successfully",
//         mobile: mobile
//       });
//     }

//     // In production, you would verify against the stored OTP
//     // This is a placeholder for your actual verification logic
//     const isOtpValid = true; // Replace with actual verification

//     if (isOtpValid) {
//       return res.status(200).json({
//         success: true,
//         message: "Mobile number verified successfully",
//         mobile: mobile
//       });
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid OTP",
//       });
//     }
//   } catch (error) {
//     console.error("Verify mobile OTP error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal server error",
//     });
//   }
// };

// Send Mobile OTP
// export const sendMobileOtp = async (req, res) => {
//   try {
//     const { mobile } = req.body;

//     if (!mobile) {
//       return res.status(400).json({
//         success: false,
//         message: "Mobile number is required",
//       });
//     }

//     // Check if mobile number is valid (10 digits)
//     if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
//       return res.status(400).json({
//         success: false,
//         message: "Please enter a valid 10-digit mobile number",
//       });
//     }

//     // Generate OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
//     console.log("Generated OTP:", otp); // For debugging, remove in production
//     // Check if technician with this mobile already exists
//     let technician = await Technician.findOne({ MobileNumber: mobile });

//     if (technician) {
//       // Update existing technician's OTP
//       technician.mobileOtp = otp;
//       technician.mobileOtpExpiry = otpExpiry;
//       await technician.save();
//     } else {
//       // Create a temporary record for OTP verification
//       technician = new Technician({
//         MobileNumber: mobile,
//         mobileOtp: otp,
//         mobileOtpExpiry: otpExpiry,
//         // Other fields will be filled during registration
//       });
//       await technician.save();
//     }

//     // In production, send SMS via Twilio
//     if (process.env.NODE_ENV === 'production') {
//       try {
//         const message = await twilioClient.messages.create({
//           body: `Your Technosys verification code is: ${otp}`,
//           from: process.env.TWILIO_PHONE_NUMBER,
//           to: `+91${mobile}` // Assuming Indian numbers
//         });

//         console.log("SMS sent with SID:", message.sid);

//         return res.status(200).json({
//           success: true,
//           message: "OTP sent successfully",
//           mobile: mobile
//         });
//       } catch (twilioError) {
//         console.error("Twilio error:", twilioError);
//         return res.status(500).json({
//           success: false,
//           message: "Failed to send OTP. Please try again later.",
//         });
//       }
//     } else {
//       // Development mode - return OTP in response
//       return res.status(200).json({
//         success: true,
//         message: "OTP sent successfully",
//         otp: otp, // Only for development
//         mobile: mobile
//       });
//     }
//   } catch (error) {
//     console.error("Send mobile OTP error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal server error",
//     });
//   }
// };

// Send Mobile OTP
export const sendMobileOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number is required" });
    }

    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter valid 10-digit mobile number",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000);

    // Upsert OTP record for this mobile
    await TempOtpVerification.findOneAndUpdate(
      { contactType: "mobile", contactValue: mobile },
      { otp, otpExpiry, isVerified: false },
      { upsert: true, new: true }
    );

    if (process.env.NODE_ENV === "production") {
      // Twilio SMS
      await twilioClient.messages.create({
        body: `Your Technosys verification code is: ${otp}.This OTP is valid for 2 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${mobile}`,
      });
      return res
        .status(200)
        .json({ success: true, message: "OTP sent successfully", mobile });
    } else {
      // Dev mode → return OTP
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully (Dev Mode)",
        otp,
        mobile,
      });
    }
  } catch (error) {
    console.error("Send mobile OTP error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Verify Mobile OTP
export const verifyMobileOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and OTP are required",
      });
    }

    const record = await TempOtpVerification.findOne({
      contactType: "mobile",
      contactValue: mobile,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "OTP not found. Please request again.",
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (record.otpExpiry < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }
    //
    record.isVerified = true;
    await record.save();

    return res
      .status(200)
      .json({ success: true, message: "Mobile verified successfully" });
  } catch (error) {
    console.error("Verify mobile OTP error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Send Email OTP
export const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000);

    await TempOtpVerification.findOneAndUpdate(
      { contactType: "email", contactValue: email },
      { otp, otpExpiry, isVerified: false },
      { upsert: true, new: true }
    );

    // Send Email
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Technosys Email Verification OTP",
      html: `<h3>Your OTP is: ${otp}</h3><p>Valid for 2 minutes</p>`,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      ...(process.env.NODE_ENV === "development" && { otp }),
    });
  } catch (error) {
    console.error("Send email OTP error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Verify Email OTP
export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP required" });

    const record = await TempOtpVerification.findOne({
      contactType: "email",
      contactValue: email,
    });

    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "OTP not found. Request again." });

    if (record.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    if (record.otpExpiry < new Date())
      return res.status(400).json({ success: false, message: "OTP expired" });

    record.isVerified = true;
    await record.save();

    return res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email OTP error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// export const sendVerifyotp = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const user = await userModel.findById(userId);
//     if (!user) return res.json({ success: false, message: "User not found" });
//     if (user.isAccountVerified) {
//       return res.json({ success: false, message: "Account Already Verified" });
//     }

//     const otp = String(Math.floor(100000 + Math.random() * 900000));
//     user.verifyOtp = otp;
//     user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
//     await user.save();

//     const mailOptions = {
//       from: process.env.SENDER_EMAIL,
//       to: user.email,
//       subject: "Account Verification OTP",
//       text: `Your OTP is ${otp}. Verify your account using this OTP.`,
//     };

//     await transporter.sendMail(mailOptions);
//     res.json({ success: true, message: "Verification OTP sent to email" });
//   } catch (error) {
//     return res.json({ success: false, message: error.message });
//   }
// };

// // ================= VERIFY EMAIL =================
// export const verifyEmail = async (req, res) => {
//   const userId = req.userId;
//   const { otp } = req.body;

//   if (!userId || !otp) {
//     return res.json({ success: false, message: 'Missing details' });
//   }

//   try {
//     const user = await Technician.findById(userId);
//     if (!user) return res.json({ success: false, message: 'User not found' });

//     // check OTP
//     if (!user.otp || user.otp !== otp) {
//       return res.json({ success: false, message: 'Invalid OTP' });
//     }

//     // check expiry
//     if (user.otpExpiry < Date.now()) {
//       return res.json({ success: false, message: 'OTP expired' });
//     }

//     // mark verified
//     user.VerifyStatus = "Approved";   // ya jo bhi status tum chaho
//     user.otp = "";
//     user.otpExpiry = null;

//     await user.save();

//     return res.json({ success: true, message: 'Email verified successfully' });
//   } catch (error) {
//     return res.json({ success: false, message: error.message });
//   }
// };

// ================= SEND RESET OTP =================
// export const sendResetOtp = async (req, res) => {
//   const { email } = req.body;

//   if (!email) return res.json({ success: false, message: "Email is Required" });

//   try {
//     const user = await Technician.findOne({ email });
//     if (!user) return res.json({ success: false, message: "User Not Found " });

//     const otp = String(Math.floor(100000 + Math.random() * 900000));
//     user.resetOtp = otp;
//     user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;
//     await user.save();

//     const mailOptions = {
//       from: process.env.SENDER_EMAIL,
//       to: user.email,
//       subject: "Password Reset OTP",
//       text: `Your OTP for resetting your password is ${otp}. Use this OTP to proceed.`,
//     };

//     await transporter.sendMail(mailOptions);
//     return res.json({ success: true, message: "OTP sent to your Email" });
//   } catch (error) {
//     return res.json({ success: false, message: error.message });
//   }
// };
// ================= SEND RESET OTP =================
// export const sendResetOtp = async (req, res) => {
//   const { email } = req.body;

//   if (!email) return res.json({ success: false, message: "Email is Required" });

//   try {
//     // CHANGE: Use userModel instead of Technician for consistency
//     const user = await Technician.findOne({ email });
//     if (!user) return res.json({ success: false, message: "User Not Found " });

//     const otp = String(Math.floor(100000 + Math.random() * 900000));
//     user.resetOtp = otp;
//     user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;
//     await user.save();

//     const mailOptions = {
//       from: process.env.SENDER_EMAIL,
//       to: user.email,
//       subject: "Password Reset OTP",
//       text: `Your OTP for resetting your password is ${otp}. Use this OTP to proceed.`,
//     };

//     await transporter.sendMail(mailOptions);
//     return res.json({ success: true, message: "OTP sent to your Email" });
//   } catch (error) {
//     return res.json({ success: false, message: error.message });
//   }
// };

// // ================= RESET PASSWORD =================
// export const resetPassword = async (req, res) => {
//   const { email, otp, newPassword } = req.body;

//   if (!email || !otp || !newPassword) {
//     return res.json({
//       success: false,
//       message: "Email, OTP, and new password are required",
//     });
//   }

//   try {
//     const user = await Technician.findOne({ email });
//     if (!user) return res.json({ success: false, message: "User not found" });

//     if (!user.resetOtp || user.resetOtp !== otp) {
//       return res.json({ success: false, message: "Invalid OTP" });
//     }

//     if (user.resetOtpExpireAt < Date.now()) {
//       return res.json({ success: false, message: "OTP is expired" });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedPassword;
//     user.resetOtp = "";
//     user.resetOtpExpireAt = 0;
//     await user.save();

//     return res.json({
//       success: true,
//       message: "Password has been reset successfully",
//     });
//   } catch (error) {
//     return res.json({ success: false, message: error.message });
//   }
// };

export const sendResetOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.json({ success: false, message: "Email is Required" });

  try {
    // Check if user exists in Technician model
    const user = await Technician.findOne({ Email: email });
    if (!user) return res.json({ success: false, message: "User Not Found" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = Date.now() + 2 * 60 * 1000; // 15 minutes

    // Store OTP in TempOtpVerification model
    await TempOtpVerification.findOneAndUpdate(
      { contactValue: email, contactType: "email" },
      {
        contactType: "email",
        contactValue: email,
        otp: otp,
        otpExpiry: otpExpiry,
        isVerified: false,
      },
      { upsert: true, new: true }
    );

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.Email,
      subject: "Password Reset OTP",
      text: `Your OTP for resetting your password is ${otp}. Use this OTP to proceed.`,
    };

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, message: "OTP sent to your Email" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.json({
      success: false,
      message: "Email, OTP, and new password are required",
    });
  }

  try {
    // Find the OTP record
    const otpRecord = await TempOtpVerification.findOne({
      contactValue: email,
      contactType: "email",
      otp: otp,
    });

    if (!otpRecord) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (otpRecord.otpExpiry < Date.now()) {
      return res.json({ success: false, message: "OTP is expired" });
    }

    if (otpRecord.isVerified) {
      return res.json({ success: false, message: "OTP already used" });
    }

    // Find user and update password
    const user = await Technician.findOne({ Email: email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.Password = hashedPassword;
    await user.save();

    // Mark OTP as used
    otpRecord.isVerified = true;
    await otpRecord.save();

    return res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};


export const sendCustomerMobileOtp = async (req, res) => {
  console.log("Customer OTP request body:", req.body); 
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required"
      });
    }

    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter valid 10-digit mobile number"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000);

    // Upsert OTP record for this mobile
    await TempOtpVerification.findOneAndUpdate(
      { contactType: "mobile", contactValue: mobile },
      { otp, otpExpiry, isVerified: false },
      { upsert: true, new: true }
    );

    if (process.env.NODE_ENV === "production") {
      // Twilio SMS
      await twilioClient.messages.create({
        body: `Your Technosys verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${mobile}`,
      });
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        mobile
      });
    } else {
      // Dev mode → return OTP (same as technician)
      console.log("Customer OTP (Dev Mode):", otp);
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully (Dev Mode)",
        otp,
        mobile,
      });
    }
  } catch (error) {
    console.error("Send customer mobile OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Verify Mobile OTP for Customer
export const verifyCustomerMobileOtp = async (req, res) => {
  console.log("Customer OTP verification request:", req.body);
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and OTP are required"
      });
    }

    const record = await TempOtpVerification.findOne({
      contactType: "mobile",
      contactValue: mobile,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "OTP not found. Please request again."
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    if (record.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired"
      });
    }

    // Check if customer exists
    let customer = await Customer.findOne({ Mobile: mobile });

    if (!customer) {
      // Create new customer if doesn't exist (auto-registration)
      customer = new Customer({
        Name: "Customer", // Default name, can be updated later
        Mobile: mobile,
      });
      await customer.save();
      console.log("New customer created:", customer._id);
    }

    // Mark OTP as verified
    record.isVerified = true;
    await record.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: customer._id,
        type: "customer",
        mobile: customer.Mobile,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: customer._id,
        name: customer.Name,
        mobile: customer.Mobile,
        email: customer.Email || null,
        address: customer.Address || null,
        role: "customer",
      },
    });
  } catch (error) {
    console.error("Verify customer mobile OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


// // Update Customer Profile
// export const updateCustomerProfile = async (req, res) => {
//   try {
//     const { name, email, address } = req.body;
//     const customerId = req.userId;

//     const customer = await Customer.findById(customerId);
//     if (!customer) {
//       return res.status(404).json({
//         success: false,
//         message: "Customer not found"
//       });
//     }

//     // Update fields if provided
//     if (name) customer.Name = name;
//     if (email) customer.Email = email;
//     if (address) customer.Address = address;

//     await customer.save();

//     return res.status(200).json({
//       success: true,
//       message: "Profile updated successfully",
//       data: {
//         id: customer._id,
//         name: customer.Name,
//         mobile: customer.Mobile,
//         email: customer.Email,
//         address: customer.Address,
//       },
//     });
//   } catch (error) {
//     console.error("Update profile error:", error);
    
//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: "Email already exists"
//       });
//     }
    
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });
//   }
// };

// // Get Customer Profile
// export const getCustomerProfile = async (req, res) => {
//   try {
//     const customerId = req.userId;

//     const customer = await Customer.findById(customerId);
//     if (!customer) {
//       return res.status(404).json({
//         success: false,
//         message: "Customer not found"
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: {
//         id: customer._id,
//         name: customer.Name,
//         mobile: customer.Mobile,
//         email: customer.Email,
//         address: customer.Address,
//         createdAt: customer.createdAt,
//       },
//     });
//   } catch (error) {
//     console.error("Get profile error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });
//   }
// };

// Logout Customer
export const logoutCustomer = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
//--------------------------------------------------End-------------------------------------------------------





// Function to clean up expired OTP records
export const cleanupExpiredOtps = async () => {
  try {
    const currentTime = new Date();
    const result = await TempOtpVerification.deleteMany({
      otpExpiry: { $lt: currentTime },
    });
    
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} expired OTP records at ${currentTime.toISOString()}`);
    }
  } catch (error) {
    console.error("❌ Error cleaning up expired OTPs:", error);
  }
};

// Run cleanup every 5 minutes (more efficient)
setInterval(cleanupExpiredOtps, 60 * 1000);

// Run cleanup immediately when server starts
cleanupExpiredOtps();
// setInterval(cleanupExpiredOtps, 60 * 60 * 1000);

// One-time admin creation endpoint

// export const createAdmin = async (req, res) => {
//   try {
//     const { username, password, secret } = req.body;
//     if (secret !== process.env.ADMIN_CREATION_SECRET) {
//       return res.status(403).json({ message: "Forbidden" });
//     }
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const admin = new Admin({ username, password: hashedPassword });
//     await admin.save();
//     res.status(201).json({ message: "Admin created" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
