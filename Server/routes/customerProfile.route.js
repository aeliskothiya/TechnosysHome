import express from "express";
import { getCustomerProfile, updateCustomerProfile, sendCustomerEmailOTP, verifyCustomerEmailOTP } from "../controllers/customerProfile.controller.js";

const router = express.Router();

// GET customer profile by customer ID
router.get("/:id", getCustomerProfile);
// UPDATE profile
router.put("/:id", updateCustomerProfile);
// Send email OTP
router.post("/send-email-otp/:id", sendCustomerEmailOTP);
// Verify email OTP
router.post("/verify-email-otp/:id", verifyCustomerEmailOTP);

export default router;
