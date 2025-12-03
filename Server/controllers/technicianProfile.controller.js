import Technician from "../models/Technician.js";
import TechnicianBankDetails from "../models/TechnicianBankDetails.js";
import TechnicianServiceCategory from "../models/TechnicianServiceCategory.js";
import TempOtpVerification from "../models/TempOtpVerification.js";
import SubServiceCategory from "../models/SubServiceCategory.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import twilio from "twilio";
import { mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { processUploadedImage, deleteImageFile } from "../utils/imageUtils.js";

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Sender display name helpers
const SENDER_NAME = process.env.SENDER_NAME || "Technosys";
const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || "no-reply@technosys.com";
const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;

// Helper function to delete old file
const deleteOldFile = async (filePath) => {
  if (!filePath) return;
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
      console.log(`Deleted old file: ${fullPath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
};

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to send email OTP
// Returns an object: { success: boolean, previewUrl?: string, error?: string }
const sendEmailOTPHelper = async (email, otp) => {
  try {
    const message = {
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      replyTo: REPLY_TO,
      to: email,
      subject: "Verify Your Email - Technosys",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Email Verification</h2>
          <p>Your OTP to verify email is:</p>
          <h3 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px;">${otp}</h3>
          <p>This OTP will expire in 10 minutes.</p>
          <p>Do not share this OTP with anyone.</p>
        </div>
      `,
    };

    // If SMTP credentials are present, use configured transporter
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const info = await transporter.sendMail(message);
      return { success: true };
    }

    // In development, create a Nodemailer test account (Ethereal) for previews
    if (process.env.NODE_ENV === "development") {
      const testAccount = await nodemailer.createTestAccount();
      const testTransport = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      const info = await testTransport.sendMail(message);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      return { success: true, previewUrl };
    }

    return { success: false, error: "SMTP not configured" };
  } catch (error) {
    console.error("Email OTP send error:", error);
    return { success: false, error: error.message || String(error) };
  }
};

// Helper function to send SMS OTP
const sendSmsOTP = async (mobile, otp) => {
  try {
    // Format phone number to E.164 format for Twilio
    // Remove any non-digit characters and add country code if needed
    let formattedPhone = mobile.replace(/\D/g, ""); // Remove non-digits
    
    // If phone number is 10 digits (Indian format), add country code +91
    if (formattedPhone.length === 10) {
      formattedPhone = "+91" + formattedPhone;
    } else if (formattedPhone.length === 12 && formattedPhone.startsWith("91")) {
      // If it's already 12 digits starting with 91
      formattedPhone = "+" + formattedPhone;
    } else if (!formattedPhone.startsWith("+")) {
      // If it doesn't start with +, add it
      formattedPhone = "+" + formattedPhone;
    }

    console.log("Sending SMS to:", formattedPhone);

    await twilioClient.messages.create({
      body: `Your Technosys verification OTP is: ${otp}. It will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });
    
    console.log("SMS sent successfully to:", formattedPhone);
    return true;
  } catch (error) {
    console.error("SMS OTP send error:", error.message || error);
    console.error("Error details:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    // Return false but don't crash - we'll still return OTP to user
    return false;
  }
};

// POST - Send OTP for mobile verification
export const sendMobileOTP = async (req, res) => {
  try {
    const technicianId = req.userId;
    const { newMobileNumber } = req.body;

    if (!newMobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    // Check if mobile already exists
    const existingTech = await Technician.findOne({
      MobileNumber: newMobileNumber,
      _id: { $ne: technicianId },
    });

    if (existingTech) {
      return res.status(400).json({
        success: false,
        message: "This mobile number is already registered",
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP in database regardless of SMS success
    await TempOtpVerification.findOneAndUpdate(
      { contactType: "mobile", contactValue: newMobileNumber },
      {
        otp,
        otpExpiry,
        isVerified: false,
      },
      { upsert: true, new: true }
    );

    console.log(`OTP for ${newMobileNumber}: ${otp}`);

    // Only send SMS in production mode
    let smsResult = false;
    if (process.env.NODE_ENV === "production") {
      smsResult = await sendSmsOTP(newMobileNumber, otp);
      if (!smsResult) {
        console.warn(`SMS delivery failed for ${newMobileNumber}`);
      }
    } else {
      console.log("[DEV MODE] SMS sending disabled. OTP stored in database for testing.");
    }

    // Prepare response
    const response = {
      success: true,
      message: process.env.NODE_ENV === "production" 
        ? (smsResult ? "OTP sent to your mobile number" : "OTP sent failed, please try again")
        : "OTP generated for testing (SMS not sent in dev mode)",
    };

    // Return OTP only in development mode for testing
    if (process.env.NODE_ENV === "development") {
      response.otp = otp;
    }

    return res.json(response);
  } catch (error) {
    console.error("Send mobile OTP error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// POST - Send OTP for email verification
export const sendEmailOTP = async (req, res) => {
  try {
    const technicianId = req.userId;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if email already exists
    const existingTech = await Technician.findOne({
      Email: newEmail,
      _id: { $ne: technicianId },
    });

    if (existingTech) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered",
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP in database regardless of email success
    await TempOtpVerification.findOneAndUpdate(
      { contactType: "email", contactValue: newEmail },
      {
        otp,
        otpExpiry,
        isVerified: false,
      },
      { upsert: true, new: true }
    );

    console.log(`OTP for ${newEmail}: ${otp}`);

    // Only send email in production mode or allow Ethereal preview in development
    const allowSendInDev = process.env.SEND_EMAIL_IN_DEV === "true";
    let sendResult = { success: false };
    if (process.env.NODE_ENV === "production" || allowSendInDev || (process.env.SMTP_USER && process.env.SMTP_PASS)) {
      sendResult = await sendEmailOTPHelper(newEmail, otp);
      if (!sendResult.success) {
        console.warn(`Email delivery failed for ${newEmail}: ${sendResult.error || "unknown"}`);
      }
    } else if (process.env.NODE_ENV === "development") {
      // In dev without SMTP, use Ethereal fallback to get preview URL
      sendResult = await sendEmailOTPHelper(newEmail, otp);
      if (!sendResult.success) {
        console.log("[DEV MODE] Email sending disabled. OTP stored in database for testing.");
      }
    }

    // Prepare response
    const response = {
      success: true,
      message:
        process.env.NODE_ENV === "production"
          ? sendResult.success
            ? "OTP sent to your email"
            : "OTP send failed, please try again"
          : "OTP generated for testing",
    };

    // In development include OTP for convenience and preview URL when available
    if (process.env.NODE_ENV === "development") {
      response.otp = otp;
      if (sendResult && sendResult.previewUrl) response.previewUrl = sendResult.previewUrl;
    }

    return res.json(response);
  } catch (error) {
    console.error("Send email OTP error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// POST - Verify mobile OTP
export const verifyMobileOTP = async (req, res) => {
  try {
    const { newMobileNumber, otp } = req.body;

    if (!newMobileNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and OTP are required",
      });
    }

    const verification = await TempOtpVerification.findOne({
      contactType: "mobile",
      contactValue: newMobileNumber,
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP",
      });
    }

    if (verification.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (new Date() > verification.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Mark verification record as verified
    await TempOtpVerification.updateOne(
      { _id: verification._id },
      { isVerified: true }
    );

    // Ensure the mobile is still not taken by another technician
    const existing = await Technician.findOne({ MobileNumber: newMobileNumber });
    if (existing && String(existing._id) !== String(req.userId)) {
      return res.status(400).json({
        success: false,
        message: "This mobile number was registered by another account",
      });
    }

    // Update technician record: set MobileNumber and isMobileVerified
    const technician = await Technician.findById(req.userId);
    if (!technician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }

    technician.MobileNumber = newMobileNumber;
    technician.isMobileVerified = true;
    await technician.save();

    // Remove the temp verification record after successful linking
    await TempOtpVerification.deleteOne({ _id: verification._id });

    return res.json({
      success: true,
      message: "Mobile number verified and updated successfully",
      data: { MobileNumber: technician.MobileNumber, isMobileVerified: technician.isMobileVerified },
    });
  } catch (error) {
    console.error("Verify mobile OTP error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// POST - Verify email OTP
export const verifyEmailOTP = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const verification = await TempOtpVerification.findOne({
      contactType: "email",
      contactValue: newEmail,
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP",
      });
    }

    if (verification.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (new Date() > verification.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Mark verification record as verified
    await TempOtpVerification.updateOne(
      { _id: verification._id },
      { isVerified: true }
    );

    // Ensure the email is still not taken by another technician
    const existing = await Technician.findOne({ Email: newEmail });
    if (existing && String(existing._id) !== String(req.userId)) {
      return res.status(400).json({
        success: false,
        message: "This email was registered by another account",
      });
    }

    // Update technician record: set Email and isEmailVerified
    const technician = await Technician.findById(req.userId);
    if (!technician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }

    technician.Email = newEmail;
    technician.isEmailVerified = true;
    await technician.save();

    // Remove the temp verification record after successful linking
    await TempOtpVerification.deleteOne({ _id: verification._id });

    return res.json({
      success: true,
      message: "Email verified and updated successfully",
      data: { Email: technician.Email, isEmailVerified: technician.isEmailVerified },
    });
  } catch (error) {
    console.error("Verify email OTP error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// GET /api/technician/profile - Fetch technician profile with bank details and services
export const getTechnicianProfile = async (req, res) => {
  try {
    const technicianId = req.userId;

    // Fetch technician data (exclude password)
    const technician = await Technician.findById(technicianId).select("-Password");
    if (!technician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }

    // Fetch bank details
    const bankDetails = await TechnicianBankDetails.findOne({
      TechnicianID: technicianId,
    }) || {};

      // Fetch services with populated ServiceCategory details
      const services = await TechnicianServiceCategory.find({
        TechnicianID: technicianId,
      }).populate("ServiceCategoryID");

      // For each service, fetch its sub-services
      const servicesWithSubServices = await Promise.all(
        services.map(async (service) => {
          const subServices = await SubServiceCategory.find({
            serviceCategoryId: service.ServiceCategoryID._id,
          });
          return {
            ...service.toObject(),
            SubServices: subServices,
          };
        })
      );

    return res.json({
      success: true,
      data: {
        technician,
        bankDetails,
          services: servicesWithSubServices,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// GET current mobile number for the authenticated technician
export const getTechnicianMobile = async (req, res) => {
  try {
    const technicianId = req.userId;
    if (!technicianId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const technician = await Technician.findById(technicianId).select('MobileNumber isMobileVerified');
    if (!technician) return res.status(404).json({ success: false, message: 'Technician not found' });

    return res.json({ success: true, data: { MobileNumber: technician.MobileNumber || null, isMobileVerified: !!technician.isMobileVerified } });
  } catch (err) {
    console.error('getTechnicianMobile error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/technician/profile - Update technician profile
export const updateTechnicianProfile = async (req, res) => {
  try {
    const technicianId = req.userId;

    console.log("Update profile request received for technician:", technicianId);
    console.log("Request body:", {
      Name: req.body.Name,
      Address: req.body.Address,
      MobileNumber: req.body.MobileNumber,
      Email: req.body.Email,
    });

    // Ensure upload directories exist
    if (!existsSync("uploads/photos")) {
      await mkdir("uploads/photos", { recursive: true });
    }
    if (!existsSync("uploads/idProofs")) {
      await mkdir("uploads/idProofs", { recursive: true });
    }

    // Fetch current technician once
    const currentTechnician = await Technician.findById(technicianId);
    if (!currentTechnician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

    // Prepare fields to update (keep backward compatibility)
    const updateFields = {};
    if (req.body.Name || req.body.name) updateFields.Name = req.body.Name || req.body.name;

    // Address: accept object or flat fields. If Address was posted as JSON string, parse it.
    let addrFromBody = req.body.Address || req.body.address;
    if (typeof addrFromBody === "string" && addrFromBody.trim().length > 0) {
      try {
        addrFromBody = JSON.parse(addrFromBody);
      } catch (e) {
        // keep as string if not valid JSON
      }
    }
    const houseNumber = req.body.houseNumber || req.body.house_number || (addrFromBody && addrFromBody.houseNumber);
    const street = req.body.street || (addrFromBody && addrFromBody.street);
    const city = req.body.city || (addrFromBody && addrFromBody.city);
    const pincode = req.body.pincode || req.body.pin || (addrFromBody && addrFromBody.pincode);

    if (addrFromBody || houseNumber || street || city || pincode) {
      updateFields.Address = {
        houseNumber: houseNumber || "",
        street: street || "",
        city: city || "",
        pincode: pincode || "",
      };
    }

    // Location: accept `latitude`/`longitude`, `lat`/`lng`, or `location.coordinates`
    const lat = req.body.latitude || req.body.lat || (req.body.location && req.body.location.lat);
    const lng = req.body.longitude || req.body.lng || (req.body.location && req.body.location.lng);
    const coordsFromBody = req.body.location && req.body.location.coordinates;

    if ((lat && lng) || (Array.isArray(coordsFromBody) && coordsFromBody.length >= 2)) {
      if (Array.isArray(coordsFromBody) && coordsFromBody.length >= 2) {
        updateFields.location = { type: "Point", coordinates: coordsFromBody };
      } else {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
          updateFields.location = { type: "Point", coordinates: [lngNum, latNum] };
        }
      }
    }

    // Handle mobile number update with verification
    if (req.body.MobileNumber) {
      console.log("Processing mobile number:", req.body.MobileNumber, "Current:", currentTechnician.MobileNumber);
      
      // Only require verification if mobile number is being changed
      if (req.body.MobileNumber !== currentTechnician.MobileNumber) {
        console.log("Mobile number changed, checking verification...");
        
        const verification = await TempOtpVerification.findOne({
          contactType: "mobile",
          contactValue: req.body.MobileNumber,
          isVerified: true,
        });

        if (!verification) {
          console.log("Mobile verification not found");
          return res.status(400).json({
            success: false,
            message: "Please verify mobile number first",
          });
        }

        console.log("Mobile verified, updating...");
        updateFields.MobileNumber = req.body.MobileNumber;
        await TempOtpVerification.deleteOne({ _id: verification._id });
      } else {
        console.log("Mobile number unchanged, skipping verification");
      }
    } else {
      console.log("No mobile number provided in request");
    }

    // Handle email update with verification
    if (req.body.Email) {
      console.log("Processing email:", req.body.Email, "Current:", currentTechnician.Email);
      
      // Only require verification if email is being changed
      if (req.body.Email !== currentTechnician.Email) {
        console.log("Email changed, checking verification...");
        
        const verification = await TempOtpVerification.findOne({
          contactType: "email",
          contactValue: req.body.Email,
          isVerified: true,
        });

        if (!verification) {
          console.log("Email verification not found");
          return res.status(400).json({
            success: false,
            message: "Please verify email first",
          });
        }

        console.log("Email verified, updating...");
        updateFields.Email = req.body.Email;
        await TempOtpVerification.deleteOne({ _id: verification._id });
      } else {
        console.log("Email unchanged, skipping verification");
      }
    } else {
      console.log("No email provided in request");
    }

    // Handle file uploads from multer
    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        try {
          // Process and convert photo to WebP
          const photoResult = await processUploadedImage(req.files.photo[0], "uploads/photos");
          if (!photoResult.success) {
            return res.status(400).json({
              success: false,
              message: `Photo upload error: ${photoResult.message}`
            });
          }
          // Delete old photo if it exists
          if (currentTechnician.Photo) {
            await deleteImageFile(currentTechnician.Photo);
          }
          updateFields.Photo = photoResult.filePath;
          console.log("Photo updated and converted to WebP:", updateFields.Photo);
        } catch (photoError) {
          console.error("Photo processing error:", photoError);
          return res.status(400).json({
            success: false,
            message: "Failed to process photo. Please ensure it's a valid image (PNG, JPEG, JPG, WebP) under 500 KB"
          });
        }
      }
      if (req.files.idProof && req.files.idProof[0]) {
        // Delete old ID proof if it exists
        if (currentTechnician.IDProof) {
          await deleteOldFile(currentTechnician.IDProof);
        }
        updateFields.IDProof = `/uploads/idProofs/${req.files.idProof[0].filename}`;
        console.log("ID Proof updated:", updateFields.IDProof);
      }
    }

    console.log("Fields to update:", updateFields);

    // Update technician profile
    const updatedTechnician = await Technician.findByIdAndUpdate(
      technicianId,
      updateFields,
      { new: true }
    ).select("-Password");

    if (!updatedTechnician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }

    // Update or create bank details
    let bankPayload = {};
    if (req.body.bankDetails) {
      try {
        const parsed =
          typeof req.body.bankDetails === "string"
            ? JSON.parse(req.body.bankDetails)
            : req.body.bankDetails;

        if (parsed.BankAccountNo) bankPayload.BankAccountNo = parsed.BankAccountNo;
        if (parsed.IFSCCode) bankPayload.IFSCCode = parsed.IFSCCode;
      } catch (parseErr) {
        console.error("Error parsing bankDetails:", parseErr);
      }
    }

    // Also check for flat fields
    if (req.body.BankAccountNo) bankPayload.BankAccountNo = req.body.BankAccountNo;
    if (req.body.IFSCCode) bankPayload.IFSCCode = req.body.IFSCCode;

    if (Object.keys(bankPayload).length > 0) {
      bankPayload.TechnicianID = technicianId;
      await TechnicianBankDetails.findOneAndUpdate(
        { TechnicianID: technicianId },
        { $set: bankPayload },
        { upsert: true, new: true }
      );
    }

    // Update service associations
    if (req.body.services !== undefined) {
      let services = req.body.services;

      // Parse if string
      if (typeof services === "string") {
        try {
          services = JSON.parse(services);
        } catch (parseErr) {
          services = [];
        }
      }

      // Remove all existing service associations
      await TechnicianServiceCategory.deleteMany({ TechnicianID: technicianId });

      // Insert new service associations
      if (Array.isArray(services) && services.length > 0) {
        const serviceDocs = services
          .map((service) => {
            const serviceId =
              service.ServiceCategoryID ||
              service.serviceId ||
              service._id ||
              service.id;

            return {
              TechnicianID: technicianId,
              ServiceCategoryID: serviceId,
              Price: service.Price || 0,
              CoinsRequired: service.CoinsRequired || 0,
            };
          })
          .filter((doc) => doc.ServiceCategoryID);

        if (serviceDocs.length > 0) {
          await TechnicianServiceCategory.insertMany(serviceDocs);
        }
      }
    }

    // Fetch updated data for response
    const currentBankDetails = await TechnicianBankDetails.findOne({
      TechnicianID: technicianId,
    }) || {};

    const currentServices = await TechnicianServiceCategory.find({
      TechnicianID: technicianId,
    }).populate("ServiceCategoryID");

    // Include sub-services for each service
    const currentServicesWithSub = await Promise.all(
      currentServices.map(async (service) => {
        const subServices = await SubServiceCategory.find({
          serviceCategoryId: service.ServiceCategoryID._id,
        });
        return {
          ...service.toObject(),
          SubServices: subServices,
        };
      })
    );

    console.log("Profile updated successfully");

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        technician: updatedTechnician,
        bankDetails: currentBankDetails,
        services: currentServicesWithSub,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// POST /api/technician/profile/change-password - Change technician password
export const changeTechnicianPassword = async (req, res) => {
  try {
    const technicianId = req.userId;
    const { oldPassword, newPassword } = req.body;

    // Validate inputs
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both old and new passwords are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // Fetch technician
    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

    // Verify old password
    const passwordMatch = await bcrypt.compare(
      oldPassword,
      technician.Password || ""
    );

    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    technician.Password = hashedPassword;
    await technician.save();

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export default {
  getTechnicianProfile,
  updateTechnicianProfile,
  changeTechnicianPassword,
  sendMobileOTP,
  sendEmailOTP,
  verifyMobileOTP,
  verifyEmailOTP,
};
