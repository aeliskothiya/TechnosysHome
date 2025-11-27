// routes/subscriptionPackage.route.js
import express from "express";
import { body } from "express-validator";
import {
  getAllSubscriptionPackages,
  getSubscriptionPackage,
  createSubscriptionPackage,
  updateSubscriptionPackage,
  deleteSubscriptionPackage,
  togglePackageStatus
  ,purchaseSubscription,
  getSubscriptionHistory
  ,createRazorpayOrder,
  verifyRazorpayPayment
} from "../controllers/subscriptionPackage.controller.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// Validation rules
const packageValidationRules = [
  body("name")
    .notEmpty()
    .withMessage("Package name is required")
    .isLength({ max: 100 })
    .withMessage("Package name cannot exceed 100 characters")
    .trim(),
  body("coins")
    .isInt({ min: 1 })
    .withMessage("Coins must be a positive integer"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a non-negative number"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters")
    .trim()
];

// Public routes
router.get("/", getAllSubscriptionPackages);

// Technician purchase history (must come before ":id" route)
router.get("/history", userAuth, (req, res, next) => {
  if (req.userType !== 'technician') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Technician privileges required."
    });
  }
  next();
}, getSubscriptionHistory);

router.get("/:id", getSubscriptionPackage);

// Technician purchase route
router.post("/:id/purchase", userAuth, (req, res, next) => {
  if (req.userType !== 'technician') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Technician privileges required."
    });
  }
  next();
}, purchaseSubscription);

// Create Razorpay order (technician)
router.post('/:id/create-order', userAuth, (req, res, next) => {
  if (req.userType !== 'technician') {
    return res.status(403).json({ success: false, message: 'Access denied. Technician privileges required.' });
  }
  next();
}, createRazorpayOrder);

// Razorpay health check (helps debug env/config)
router.get('/razorpay-health', (req, res) => {
  const ok = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  return res.status(200).json({ success: true, message: 'Razorpay health', data: { configured: ok } });
});

// Verify Razorpay payment (technician)
router.post('/verify-payment', userAuth, (req, res, next) => {
  if (req.userType !== 'technician') {
    return res.status(403).json({ success: false, message: 'Access denied. Technician privileges required.' });
  }
  next();
}, verifyRazorpayPayment);

// Admin protected routes
router.post("/", userAuth, (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required."
    });
  }
  next();
}, packageValidationRules, createSubscriptionPackage);

router.put("/:id", userAuth, (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required."
    });
  }
  next();
}, packageValidationRules, updateSubscriptionPackage);

router.delete("/:id", userAuth, (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required."
    });
  }
  next();
}, deleteSubscriptionPackage);

router.patch("/:id/toggle-status", userAuth, (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required."
    });
  }
  next();
}, togglePackageStatus);

export default router;