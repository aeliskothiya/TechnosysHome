import express from "express";
import {
  submitFeedback,
  getFeedback,
  getCustomerFeedbacks,
  getAllFeedbacks,
  getTechnicianFeedbacks,
} from "../controllers/feedback.controller.js";
import userAuth from "../middleware/userAuth.js";

const feedbackRouter = express.Router();

// Admin: Get all feedbacks
feedbackRouter.get("/admin/all", userAuth, getAllFeedbacks);

// Technician: Get all feedbacks for their bookings
feedbackRouter.get("/technician/all", userAuth, getTechnicianFeedbacks);

// Get all feedbacks for customer's bookings (must be before /:bookingId)
feedbackRouter.get("/customer/all", userAuth, getCustomerFeedbacks);

// Submit or update feedback
feedbackRouter.post("/submit", userAuth, submitFeedback);

// Get feedback for a specific booking
feedbackRouter.get("/:bookingId", userAuth, getFeedback);

export default feedbackRouter;
