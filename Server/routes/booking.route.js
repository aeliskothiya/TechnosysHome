import express from "express";
import {
  createBooking,
  precheckAvailability,
  broadcastBooking,
  acceptBooking,
  autoCancelIfNoAcceptance,
  cancelBooking,
  getCustomerBookings,
  getTechnicianPendingRequests,
  getTechnicianAcceptedBookings,
  getTechnicianCompletedBookings,
  getBookingById,
  generateArrivalOTP,
  verifyArrivalOTP,
  generateCompletionOTP,
  verifyCompletionOTP,
  completeService,
} from "../controllers/booking.controller.js";
import bookingPaymentRouter from "./bookingPayment.route.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.post("/create", userAuth, createBooking);
router.post("/precheck", userAuth, precheckAvailability);
// Payment routes handled by sub-router
router.use("/payment", bookingPaymentRouter);
router.post("/broadcast", userAuth, broadcastBooking);
router.post("/accept", userAuth, acceptBooking);
router.post("/auto-cancel", userAuth, autoCancelIfNoAcceptance);
router.post("/cancel", userAuth, cancelBooking);
router.get("/customer/:customerId", userAuth, getCustomerBookings);
router.get("/technician/pending", userAuth, getTechnicianPendingRequests);
router.get("/technician/accepted", userAuth, getTechnicianAcceptedBookings);
router.get("/technician/completed", userAuth, getTechnicianCompletedBookings);
router.post("/generate-arrival-otp", userAuth, generateArrivalOTP);
router.post("/verify-arrival-otp", userAuth, verifyArrivalOTP);
router.post("/generate-completion-otp", userAuth, generateCompletionOTP);
router.post("/verify-completion-otp", userAuth, verifyCompletionOTP);
router.post("/complete-service", userAuth, completeService);
router.get("/:id", userAuth, getBookingById);

export default router;
