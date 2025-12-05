import express from "express";
import {
  submitComplaint,
  getComplaint,
  getCustomerComplaints,
  getAllComplaints,
  getTechnicianComplaints,
} from "../controllers/complaint.controller.js";
import userAuth from "../middleware/userAuth.js";

const complaintRouter = express.Router();

// Admin: Get all complaints
complaintRouter.get("/admin/all", userAuth, getAllComplaints);

// Technician: Get all complaints for their bookings
complaintRouter.get("/technician/all", userAuth, getTechnicianComplaints);

// Get all complaints for customer's bookings (must be before /:bookingId)
complaintRouter.get("/customer/all", userAuth, getCustomerComplaints);

// Submit or update complaint
complaintRouter.post("/submit", userAuth, submitComplaint);

// Get complaint for a specific booking
complaintRouter.get("/:bookingId", userAuth, getComplaint);

export default complaintRouter;
