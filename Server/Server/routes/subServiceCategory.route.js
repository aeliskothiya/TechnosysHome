import express from "express";
import multer from "multer";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import userAuth from "../middleware/userAuth.js";
import { ALLOWED_MIMETYPES, MAX_FILE_SIZE } from "../utils/imageUtils.js";
import {
  getAllSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  getSubCategory,
} from "../controllers/subServiceCategory.controller.js";

const router = express.Router();

// Ensure uploads/subcategories directory exists
const ensureSubcategoriesDir = async () => {
  try {
    if (!existsSync("uploads/subcategories")) {
      await mkdir("uploads/subcategories", { recursive: true });
    }
  } catch (error) {
    console.error("Error creating subcategories upload directory:", error);
  }
};
ensureSubcategoriesDir();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/subcategories");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = file.originalname.split(".").pop();
    cb(null, "subcategory-" + uniqueSuffix + "." + extension);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "image") {
    // Validate MIME type using imageUtils whitelist
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(new Error("Invalid file type. Only image files (PNG, JPEG, JPG, WebP) are allowed"), false);
      return;
    }
    cb(null, true);
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 }, // 500KB (consistent with other uploads)
});

// GET /api/sub-service-categories - list, optional ?serviceCategoryId=
router.get("/", getAllSubCategories);

// GET /api/sub-service-categories/:id
router.get("/:id", getSubCategory);

// POST - admin only
router.post("/", userAuth, upload.single("image"), createSubCategory);

// PUT - admin only
router.put("/:id", userAuth, upload.single("image"), updateSubCategory);

// DELETE - admin only (soft)
router.delete("/:id", userAuth, deleteSubCategory);

export default router;
