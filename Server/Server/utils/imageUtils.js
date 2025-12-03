import sharp from "sharp";
import { unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

// Constants
export const MAX_FILE_SIZE = 500 * 1024; // 500 KB
export const ALLOWED_EXTENSIONS = ["png", "jpeg", "jpg", "webp"];
export const ALLOWED_MIMETYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

/**
 * Validate file size
 * @param {number} fileSize - Size in bytes
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateFileSize = (fileSize) => {
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `File size must be less than 500 KB. Your file is ${(fileSize / 1024).toFixed(2)} KB`,
    };
  }
  return { valid: true, message: "File size is valid" };
};

/**
 * Validate file extension
 * @param {string} filename - Original filename
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateFileExtension = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      message: `Invalid file extension. Allowed formats: PNG, JPEG, JPG, WebP`,
    };
  }
  return { valid: true, message: "File extension is valid" };
};

/**
 * Validate MIME type
 * @param {string} mimetype - File MIME type
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateMimeType = (mimetype) => {
  if (!ALLOWED_MIMETYPES.includes(mimetype)) {
    return {
      valid: false,
      message: "Invalid file type. Only image files (PNG, JPEG, JPG, WebP) are allowed",
    };
  }
  return { valid: true, message: "MIME type is valid" };
};

/**
 * Convert and compress image to WebP format
 * @param {string} inputPath - Path to original file
 * @param {string} outputPath - Path where WebP file will be saved
 * @param {number} quality - Compression quality (1-100, default 75)
 * @returns {Promise<object>} - { success: boolean, message: string, filePath: string }
 */
export const convertToWebP = async (inputPath, outputPath, quality = 75) => {
  try {
    if (!existsSync(inputPath)) {
      return {
        success: false,
        message: "Input file not found",
      };
    }

    // Ensure output filename ends with .webp
    const finalOutputPath = outputPath.endsWith(".webp")
      ? outputPath
      : outputPath.replace(/\.[^.]+$/, ".webp");

    // Convert to WebP
    await sharp(inputPath)
      .webp({ quality })
      .toFile(finalOutputPath);

    // Delete original file after successful conversion
    try {
      await unlink(inputPath);
      console.log(`Original file deleted: ${inputPath}`);
    } catch (err) {
      console.warn(`Could not delete original file ${inputPath}:`, err.message);
    }

    // Get file size
    const fs = await import("fs");
    const fileStats = await new Promise((resolve, reject) => {
      fs.stat(finalOutputPath, (err, stats) => {
        if (err) reject(err);
        else resolve(stats);
      });
    });

    console.log(
      `Image converted to WebP: ${finalOutputPath} (${(fileStats.size / 1024).toFixed(2)} KB)`
    );

    return {
      success: true,
      message: "Image converted to WebP successfully",
      filePath: finalOutputPath,
      fileSize: fileStats.size,
    };
  } catch (error) {
    console.error("Error converting image to WebP:", error);
    return {
      success: false,
      message: `Failed to convert image: ${error.message}`,
    };
  }
};

/**
 * Process uploaded image: validate, convert to WebP, and return processed path
 * @param {object} file - Multer file object
 * @param {string} uploadDir - Directory where file was uploaded
 * @returns {Promise<object>} - { success: boolean, message: string, filePath: string, originalName: string }
 */
export const processUploadedImage = async (file, uploadDir) => {
  try {
    if (!file) {
      return { success: false, message: "No file provided" };
    }

    // Validate file size
    const sizeValidation = validateFileSize(file.size);
    if (!sizeValidation.valid) {
      // Delete uploaded file
      try {
        await unlink(file.path);
      } catch (err) {
        console.warn("Could not delete invalid file:", err.message);
      }
      return { success: false, message: sizeValidation.message };
    }

    // Validate extension
    const extValidation = validateFileExtension(file.originalname);
    if (!extValidation.valid) {
      try {
        await unlink(file.path);
      } catch (err) {
        console.warn("Could not delete invalid file:", err.message);
      }
      return { success: false, message: extValidation.message };
    }

    // Validate MIME type
    const mimeValidation = validateMimeType(file.mimetype);
    if (!mimeValidation.valid) {
      try {
        await unlink(file.path);
      } catch (err) {
        console.warn("Could not delete invalid file:", err.message);
      }
      return { success: false, message: mimeValidation.message };
    }

    // Convert to WebP
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const webpOutputPath = path.join(
      uploadDir,
      `${path.basename(file.path).split("-")[0]}-${uniqueSuffix}.webp`
    );

    const conversionResult = await convertToWebP(file.path, webpOutputPath, 80);

    if (!conversionResult.success) {
      return {
        success: false,
        message: conversionResult.message,
      };
    }

    // Return the database-ready path (relative path for storage in DB)
    // Extract just the folder name from uploadDir (works with both / and \)
    const folderName = uploadDir.includes(path.sep) 
      ? uploadDir.split(path.sep).pop() 
      : uploadDir.split('/').pop();
    const dbPath = `/uploads/${folderName}/${path.basename(webpOutputPath)}`;

    return {
      success: true,
      message: "Image processed successfully",
      filePath: dbPath,
      originalName: file.originalname,
      processedSize: conversionResult.fileSize,
    };
  } catch (error) {
    console.error("Error processing uploaded image:", error);
    return {
      success: false,
      message: `Image processing failed: ${error.message}`,
    };
  }
};

/**
 * Delete image file
 * @param {string} filePath - Relative path to file in DB
 * @returns {Promise<boolean>} - Success status
 */
export const deleteImageFile = async (filePath) => {
  if (!filePath) return false;
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
      console.log(`Image file deleted: ${fullPath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting image file ${filePath}:`, error);
    return false;
  }
};
