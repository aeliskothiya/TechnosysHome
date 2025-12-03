import express from "express";
import passport from "passport";
import multer from "multer";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import userAuth from "../middleware/userAuth.js";
import jwt from "jsonwebtoken";
import { ALLOWED_EXTENSIONS, ALLOWED_MIMETYPES, MAX_FILE_SIZE } from "../utils/imageUtils.js";
// import {
//   isAuthenticated, login, logout, register, resetPassword,
//   sendResetOtp, sendVerifyotp, verifyEmail
// } from '../controllers/authController.js';
import {
  isAuthenticated,
  login,
  logout,
  register,
  resetPassword,
  sendResetOtp,
  sendMobileOtp,
  verifyMobileOtp,
  sendEmailOtp,
  verifyEmailOtp,
  sendCustomerMobileOtp,
  verifyCustomerMobileOtp,
  // updateCustomerProfile,
  // getCustomerProfile,
  logoutCustomer,
} from "../controllers/auth.controller.js";

const authRouter = express.Router();

// Ensure directories exist
const ensureDirectories = async () => {
  try {
    if (!existsSync("uploads/idProofs")) {
      await mkdir("uploads/idProofs", { recursive: true });
    }
    if (!existsSync("uploads/photos")) {
      await mkdir("uploads/photos", { recursive: true });
    }
  } catch (error) {
    console.error("Error creating directories:", error);
  }
};

// Call this function when server starts
ensureDirectories();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "idProof") {
      cb(null, "uploads/idProofs");
    } else if (file.fieldname === "photo") {
      cb(null, "uploads/photos");
    } else {
      cb(new Error("Invalid fieldname"));
    }
  },
  filename: function (req, file, cb) {
    // Create a unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = file.originalname.split(".").pop();
    cb(null, file.fieldname + "-" + uniqueSuffix + "." + extension);
  },
});

const fileFilter = (req, file, cb) => {
  // Check file extension
  const ext = file.originalname.split(".").pop().toLowerCase();
  
  // Check file types
  if (file.fieldname === "idProof") {
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed for ID proof"), false);
    }
  } else if (file.fieldname === "photo") {
    // Validate extension for photo
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      cb(new Error(`Invalid photo format. Only PNG, JPEG, JPG, WebP are allowed`), false);
      return;
    }
    // Validate MIME type
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(new Error("Invalid file type for photo"), false);
      return;
    }
    cb(null, true);
  } else {
    cb(new Error("Invalid fieldname"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // 500KB limit
  },
});

// Use multer middleware for register route
authRouter.post(
  "/register",
  upload.fields([
    { name: "idProof", maxCount: 1 },
    { name: "photo", maxCount: 1 },
  ]),
  register
);

// authRouter.post('/login', login);
// authRouter.post('/logout', logout);
// authRouter.post('/send-mobile-otp', sendMobileOtp);
// authRouter.post('/verify-mobile-otp', verifyMobileOtp);
// authRouter.post('/send-email-otp', sendEmailOtp);
// authRouter.post('/verify-email-otp', verifyEmailOtp);
// // authRouter.post('/send-verify-otp', userAuth, sendVerifyotp);
// // authRouter.post('/verify-account', userAuth, verifyEmail);
// authRouter.get('/is-auth', userAuth, isAuthenticated);
// authRouter.post('/send-reset-otp', sendResetOtp);
// authRouter.post('/reset-password', resetPassword);
authRouter.post("/send-mobile-otp", sendMobileOtp);
authRouter.post("/verify-mobile-otp", verifyMobileOtp);
authRouter.post("/send-email-otp", sendEmailOtp);
authRouter.post("/verify-email-otp", verifyEmailOtp);

authRouter.post("/login", login);
authRouter.post("/logout", logout);
// authRouter.post('/send-verify-otp', userAuth, sendVerifyotp);
// authRouter.post('/verify-account', userAuth, verifyEmail);
authRouter.get("/is-auth", userAuth, isAuthenticated);
authRouter.post("/send-reset-otp", sendResetOtp);
authRouter.post("/reset-password", resetPassword);


// Customer authentication routes
authRouter.post('/customer/send-mobile-otp', sendCustomerMobileOtp);
authRouter.post('/customer/verify-mobile-otp', verifyCustomerMobileOtp);
authRouter.post('/customer/logout', logoutCustomer);

// Customer profile routes (protected)
// authRouter.get('/customer/profile', userAuth, getCustomerProfile);
// authRouter.put('/customer/profile', userAuth, updateCustomerProfile);

// Google OAuth – start
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth – callback
authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5175/login",
    session: true,
  }),
  async (req, res) => {
    // Issue the SAME JWT cookie your app already uses, with a provider flag
    const token = jwt.sign(
      { id: req.user._id, provider: "google" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Send user back to your app (your routes are: /, /login, /email-verify, /reset-password)
    res.redirect("http://localhost:5175/");
  }
);

export default authRouter;
