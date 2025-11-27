import express from "express";
import multer from "multer";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import userAuth from "../middleware/userAuth.js";
import { ALLOWED_EXTENSIONS, ALLOWED_MIMETYPES, MAX_FILE_SIZE } from "../utils/imageUtils.js";
import {
  getTechnicianProfile,
  getTechnicianMobile,
  updateTechnicianProfile,
  changeTechnicianPassword,
  sendMobileOTP,
  sendEmailOTP,
  verifyMobileOTP,
  verifyEmailOTP,
} from "../controllers/technicianProfile.controller.js";

const router = express.Router();

// Ensure upload directories exist
async function ensureUploadDirectories() {
  try {
    if (!existsSync("uploads/photos")) {
      await mkdir("uploads/photos", { recursive: true });
    }
    if (!existsSync("uploads/idProofs")) {
      await mkdir("uploads/idProofs", { recursive: true });
    }
  } catch (error) {
    console.error("Error ensuring upload directories:", error);
  }
}

// Call on startup
ensureUploadDirectories();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "photo") {
      cb(null, "uploads/photos");
    } else if (file.fieldname === "idProof") {
      cb(null, "uploads/idProofs");
    } else {
      cb(null, "uploads");
    }
  },
  filename: function (req, file, cb) {
    const extension = file.originalname.split(".").pop();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}.${extension}`);
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "photo") {
    // Validate extension
    const ext = file.originalname.split(".").pop().toLowerCase();
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

// Configure multer upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }, // 500KB limit
});

// GET /api/technician/profile - Get technician profile (protected)
router.get("/", userAuth, getTechnicianProfile);

// GET /api/technician/profile/old-mobile - Return current mobile for prefill
router.get("/old-mobile", userAuth, getTechnicianMobile);

// POST /api/technician/profile/send-mobile-otp - Send OTP for mobile verification
router.post("/send-mobile-otp", userAuth, sendMobileOTP);

// POST /api/technician/profile/verify-mobile-otp - Verify mobile OTP
router.post("/verify-mobile-otp", userAuth, verifyMobileOTP);

// POST /api/technician/profile/send-email-otp - Send OTP for email verification
router.post("/send-email-otp", userAuth, sendEmailOTP);

// POST /api/technician/profile/verify-email-otp - Verify email OTP
router.post("/verify-email-otp", userAuth, verifyEmailOTP);

// PATCH /api/technician/profile - Update technician profile (protected, with file uploads)
router.patch(
  "/",
  userAuth,
  upload.fields([
    { name: "photo", maxCount: 1 },
    // ID Proof is managed by admin only, not by technician
    // { name: "idProof", maxCount: 1 },
  ]),
  updateTechnicianProfile
);

// POST /api/technician/profile/change-password - Change password (protected)
router.post("/change-password", userAuth, changeTechnicianPassword);

export default router;
