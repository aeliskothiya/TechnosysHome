import express from "express";
import multer from "multer";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import userAuth from "../middleware/userAuth.js";
import {
  createOrGetChat,
  getMessages,
  sendMessage,
  markMessagesRead,
  getUserChats,
} from "../controllers/chat.controller.js";

const router = express.Router();

// Constants for chat images (5MB max, matching your project requirements)
const MAX_CHAT_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ["png", "jpeg", "jpg", "gif", "webp"];
const ALLOWED_MIMETYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];
const MAX_ATTACHMENTS = 5;

// Ensure upload directory exists
async function ensureChatUploadDirectory() {
  try {
    if (!existsSync("uploads/chat")) {
      await mkdir("uploads/chat", { recursive: true });
      console.log("✅ Created uploads/chat directory");
    }
  } catch (error) {
    console.error("Error ensuring chat upload directory:", error);
  }
}

ensureChatUploadDirectory();

// Configure multer for chat image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/chat");
  },
  filename: function (req, file, cb) {
    const extension = file.originalname.split(".").pop();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `chat-${uniqueSuffix}.${extension}`);
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Validate extension
  const ext = file.originalname.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    cb(
      new Error(
        `Invalid image format. Only PNG, JPEG, JPG, GIF, WebP are allowed`
      ),
      false
    );
    return;
  }

  // Validate MIME type
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(new Error("Invalid file type"), false);
    return;
  }

  cb(null, true);
};

// Configure multer upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_CHAT_IMAGE_SIZE, // 5MB limit
    files: MAX_ATTACHMENTS, // Max 5 files per message
  },
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum 5MB per image allowed.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_ATTACHMENTS} images allowed per message.`,
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

// Routes
router.get("/list", userAuth, getUserChats); // Get all user's chats
router.get("/:bookingId", userAuth, createOrGetChat); // Create or get chat for booking
router.get("/:bookingId/messages", userAuth, getMessages); // Get message history
router.post(
  "/:bookingId/message",
  userAuth,
  upload.array("images", MAX_ATTACHMENTS),
  handleMulterError,
  sendMessage
); // Send message with optional images
router.post("/:bookingId/read", userAuth, markMessagesRead); // Mark messages as read (POST)
router.patch("/:bookingId/read", userAuth, markMessagesRead); // Mark messages as read (PATCH)

export default router;
