import express from "express";
import multer from "multer";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { getAllCategories,getAllActiveCategories, createCategory, updateCategory, deleteCategory } from "../controllers/serviceCategory.controller.js";
import userAuth from "../middleware/userAuth.js";
import { ALLOWED_MIMETYPES, MAX_FILE_SIZE } from "../utils/imageUtils.js";

const router = express.Router();

// Ensure uploads/categories directory exists
const ensureCategoriesDir = async () => {
	try {
		if (!existsSync("uploads/categories")) {
			await mkdir("uploads/categories", { recursive: true });
		}
	} catch (error) {
		console.error("Error creating categories upload directory:", error);
	}
};
ensureCategoriesDir();

// Multer storage for category images
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "uploads/categories");
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		const extension = file.originalname.split(".").pop();
		cb(null, "category-" + uniqueSuffix + "." + extension);
	},
});

const fileFilter = (req, file, cb) => {
	// Validate extension
	const ext = file.originalname.split(".").pop().toLowerCase();
	if (!['png', 'jpeg', 'jpg', 'webp'].includes(ext)) {
		cb(new Error("Invalid file extension. Only PNG, JPEG, JPG, WebP are allowed"), false);
		return;
	}
	// Validate MIME type
	if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
		cb(new Error("Invalid file type. Only image files (PNG, JPEG, JPG, WebP) are allowed"), false);
		return;
	}
	cb(null, true);
};

const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: MAX_FILE_SIZE }, // 500KB (consistent with other uploads)
});

// GET /api/service-categories - Public (list active categories)
router.get("/", getAllCategories);

// GET /api/service-categories/active - ONLY active categories
router.get("/active", getAllActiveCategories);

// POST /api/service-categories - Admin only (create category)
router.post("/", userAuth, upload.single("image"), createCategory);

// PUT /api/service-categories/:id - Admin only (update category)
router.put("/:id", userAuth, upload.single("image"), updateCategory);

// DELETE /api/service-categories/:id - Admin only (delete category)
router.delete("/:id", userAuth, deleteCategory);

export default router;
