import SubServiceCategory from "../models/SubServiceCategory.js";
import ServiceCategory from "../models/ServiceCategory.js";
import { processUploadedImage, deleteImageFile } from "../utils/imageUtils.js";

// GET /api/sub-service-categories?serviceCategoryId=
export const getAllSubCategories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.serviceCategoryId) {
      filter.serviceCategoryId = req.query.serviceCategoryId;
    }
    // Only return active subcategories by default for public listing
    if (req.query.includeInactive !== 'true') {
      filter.isActive = true;
    }

    const subs = await SubServiceCategory.find(filter)
      .sort({ name: 1 })
      .select("name description price coinsRequired serviceCategoryId image isActive");

    return res.json({ success: true, data: subs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const sub = await SubServiceCategory.findById(id);
    if (!sub) return res.status(404).json({ success: false, message: 'Sub category not found' });
    return res.json({ success: true, data: sub });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubCategory = async (req, res) => {
  try {
    if (req.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can add sub-categories' });
    }

    const { name, serviceCategoryId, price } = req.body;
    let { coinsRequired, description } = req.body;
    if (typeof coinsRequired === 'string') coinsRequired = Number(coinsRequired);

    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!serviceCategoryId) return res.status(400).json({ success: false, message: 'serviceCategoryId is required' });

    // Ensure parent category exists
    const parent = await ServiceCategory.findById(serviceCategoryId);
    if (!parent) return res.status(404).json({ success: false, message: 'Parent service category not found' });

    // Check duplicate name within same category (case-insensitive)
    const exists = await SubServiceCategory.findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
      serviceCategoryId,
    });
    if (exists) return res.status(409).json({ success: false, message: 'Sub-category already exists for this category' });

    // Process uploaded image: validate, convert to WebP, and get DB path
    let imagePath = null;
    if (req.file) {
      const imageResult = await processUploadedImage(req.file, 'uploads/subcategories');
      if (!imageResult.success) {
        return res.status(400).json({ success: false, message: imageResult.message });
      }
      imagePath = imageResult.filePath;
    }

    const sub = await SubServiceCategory.create({
      name: name.trim(),
      serviceCategoryId,
      description: description ? String(description).trim() : "",
      price: price ? Number(price) : 0,
      coinsRequired: Number(coinsRequired || 0),
      image: imagePath,
    });

    return res.status(201).json({ success: true, data: sub, message: 'Sub-category created' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Sub-category already exists' });
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    if (req.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can update sub-categories' });
    }

    const { id } = req.params;
    const { name, price } = req.body;
    let { coinsRequired, description } = req.body;
    if (typeof coinsRequired === 'string') coinsRequired = Number(coinsRequired);

    const sub = await SubServiceCategory.findById(id);
    if (!sub) return res.status(404).json({ success: false, message: 'Sub-category not found' });

    if (name && name.trim()) {
      // Check duplicate within same category excluding current
      const duplicate = await SubServiceCategory.findOne({
        _id: { $ne: id },
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        serviceCategoryId: sub.serviceCategoryId,
      });
      if (duplicate) return res.status(409).json({ success: false, message: 'Sub-category name already exists for this category' });
      sub.name = name.trim();
    }

    if (price !== undefined) sub.price = Number(price);
    if (coinsRequired !== undefined) sub.coinsRequired = Number(coinsRequired);
    if (description !== undefined) sub.description = String(description || "").trim();

    // Handle image upload with WebP conversion
    const oldImagePath = sub.image;
    if (req.file) {
      const imageResult = await processUploadedImage(req.file, 'uploads/subcategories');
      if (!imageResult.success) {
        return res.status(400).json({ success: false, message: imageResult.message });
      }
      sub.image = imageResult.filePath;
      // Delete old image file if it exists
      if (oldImagePath) {
        await deleteImageFile(oldImagePath);
      }
    }

    if (req.body.isActive !== undefined) {
      let isActive = req.body.isActive;
      if (typeof isActive === 'string') isActive = isActive === 'true';
      sub.isActive = isActive;
    }

    await sub.save();

    return res.json({ success: true, data: sub, message: 'Sub-category updated successfully' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Sub-category name already exists' });
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    if (req.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can delete sub-categories' });
    }

    const { id } = req.params;
    const sub = await SubServiceCategory.findById(id);
    if (!sub) return res.status(404).json({ success: false, message: 'Sub-category not found' });

    // Soft delete
    sub.isActive = false;
    await sub.save();

    return res.json({ success: true, message: 'Sub-category deactivated successfully', data: sub });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
