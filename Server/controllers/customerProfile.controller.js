import Customer from "../models/Customer.js";
import nodemailer from "nodemailer";
import TempOtpVerification from "../models/TempOtpVerification.js";
import dotenv from "dotenv";
dotenv.config();

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper to generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Helper to send email OTP. Returns an object { success, previewUrl?, error? }
const sendEmailOTPHelper = async (email, otp) => {
  try {
    const message = {
      from: process.env.SENDER_EMAIL || "no-reply@technosys.local",
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

    // If SMTP credentials are present, use the configured transporter
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const info = await transporter.sendMail(message);
      return { success: true };
    }

    // In development, create a Nodemailer test account (Ethereal) so developers can preview emails
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

    // If no SMTP and not in dev, indicate sending not configured
    return { success: false, error: "SMTP not configured" };
  } catch (error) {
    console.error("Email OTP send error:", error);
    return { success: false, error: error.message || String(error) };
  }
};

// POST - Send OTP for email verification
export const sendCustomerEmailOTP = async (req, res) => {
  try {
    const customerId = req.params.id;
    const { newEmail } = req.body;
    if (!newEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    // Check if email already exists
    const existing = await Customer.findOne({ Email: newEmail, _id: { $ne: customerId } });
    if (existing) {
      return res.status(400).json({ success: false, message: "This email is already registered" });
    }
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    console.log(`Customer OTP for ${newEmail}: ${otp}`);
    // Use same contactType as other flows ("email") for consistency
    await TempOtpVerification.findOneAndUpdate(
      { contactType: "email", contactValue: newEmail },
      { otp, otpExpiry, isVerified: false },
      { upsert: true, new: true }
    );
    // Allow sending in production or when explicitly enabled in development via env
    const allowSendInDev = process.env.SEND_EMAIL_IN_DEV === "true";
    let sendResult = { success: false };
    if (process.env.NODE_ENV === "production" || allowSendInDev || (process.env.SMTP_USER && process.env.SMTP_PASS)) {
      sendResult = await sendEmailOTPHelper(newEmail, otp);
    } else if (process.env.NODE_ENV === "development") {
      // In dev without SMTP, use Ethereal fallback
      sendResult = await sendEmailOTPHelper(newEmail, otp);
    } else {
      console.log("[DEV MODE] Email sending disabled. OTP stored in database for testing.");
    }

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
    console.error("Send customer email OTP error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// POST - Verify email OTP
export const verifyCustomerEmailOTP = async (req, res) => {
  try {
    const customerId = req.params.id;
    let { newEmail, otp } = req.body || {};
    // Accept common variations in field names
    newEmail = newEmail || req.body?.Email || req.body?.email;

    if (!newEmail || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    // Try to find verification record using standard 'email' contactType, fallback to any matching value
    let verification = await TempOtpVerification.findOne({
      contactType: "email",
      contactValue: newEmail,
    });

    if (!verification) {
      // fallback: try any record with the matching contactValue
      verification = await TempOtpVerification.findOne({ contactValue: newEmail });
    }

    if (!verification) {
      // helpful debug log in dev
      console.warn(`OTP record not found for ${newEmail}. Showing any stored record for debugging:`);
      const dbg = await TempOtpVerification.findOne({ contactValue: newEmail });
      console.warn(dbg);
      return res.status(400).json({ success: false, message: "OTP not found. Please request a new OTP" });
    }

    if (verification.otp !== otp) {
      // log verification document for debugging
      console.warn(`OTP mismatch for ${newEmail}. Stored: ${verification.otp} provided: ${otp}`);
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (new Date() > verification.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    await TempOtpVerification.updateOne({ _id: verification._id }, { isVerified: true });
    // Update customer email
    await Customer.findByIdAndUpdate(customerId, { Email: newEmail });
    return res.json({ success: true, message: "Email verified and updated successfully" });
  } catch (error) {
    console.error("Verify customer email OTP error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// GET - Get customer profile
export const getCustomerProfile = async (req, res) => {
  try {
    const customerId = req.params.id;

    // Fetch customer details
    const customer = await Customer.findById(customerId).select("-__v");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer
    });

  } catch (error) {
    console.error("Error fetching customer profile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// 📌 UPDATE customer profile
export const updateCustomerProfile = async (req, res) => {
  try {
    const customerId = req.params.id;
      const { Name, Mobile, Email } = req.body;

      const updateData = {};

      // Basic fields (keep backward compatibility with different casing)
      if (Name || req.body.name) updateData.Name = Name || req.body.name;
      if (Mobile || req.body.mobile) updateData.Mobile = Mobile || req.body.mobile;
      if (Email || req.body.email) updateData.Email = Email || req.body.email;

      // Address: accept either an object `Address` or flat fields: houseNumber, street, city, pincode
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
        updateData.Address = {
          houseNumber: houseNumber || "",
          street: street || "",
          city: city || "",
          pincode: pincode || "",
        };
      }

      // Location: accept `latitude` & `longitude` or `lat` & `lng` or `location.coordinates`
      const lat = req.body.latitude || req.body.lat || (req.body.location && req.body.location.lat);
      const lng = req.body.longitude || req.body.lng || (req.body.location && req.body.location.lng);
      const coordsFromBody = req.body.location && req.body.location.coordinates;

      if ((lat && lng) || (Array.isArray(coordsFromBody) && coordsFromBody.length >= 2)) {
        if (Array.isArray(coordsFromBody) && coordsFromBody.length >= 2) {
          // assume [lng, lat]
          updateData.location = { type: "Point", coordinates: coordsFromBody };
        } else {
          const latNum = parseFloat(lat);
          const lngNum = parseFloat(lng);
          if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
            updateData.location = { type: "Point", coordinates: [lngNum, latNum] };
          }
        }
      }

    // const updatedCustomer = await Customer.findByIdAndUpdate(
    //   customerId,
    //   {
    //     Name,
    //     Mobile,
    //     Email,
    //     Address,
    //   },
    //   { new: true }
    // ).select("-__v");

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      updateData,
      { new: true }
    ).select("-__v");

    if (!updatedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedCustomer,
    });
  } catch (error) {
    console.error("Error updating profile:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Mobile or Email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }

};


