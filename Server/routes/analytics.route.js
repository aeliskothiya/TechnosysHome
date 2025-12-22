import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  getDashboardAnalytics,
  getWeeklyRevenue,
  getMonthlyRevenue,
  getBookingStatusDistribution,
  getRevenueByService,
  getPeakHours,
  getTopTechnicians,
  getTopServices,
  getTopLocations,
  getPerformanceMetrics,
  getFinancialSummary,
  getMostBookedServices,
  getMonthlyBookingsByCategory
} from "../controllers/analytics.controller.js";

const router = express.Router();

// Protect all analytics routes - admin only
router.use(userAuth);
router.use((req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: "Access denied. Admin only." 
    });
  }
  next();
});

// Dashboard analytics endpoints
router.get("/dashboard", getDashboardAnalytics);
router.get("/weekly-revenue", getWeeklyRevenue);
router.get("/monthly-revenue", getMonthlyRevenue);
router.get("/booking-status", getBookingStatusDistribution);
router.get("/revenue-by-service", getRevenueByService);
router.get("/peak-hours", getPeakHours);
router.get("/top-technicians", getTopTechnicians);
router.get("/top-services", getTopServices);
router.get("/top-locations", getTopLocations);
router.get("/performance-metrics", getPerformanceMetrics);
router.get("/financial-summary", getFinancialSummary);
router.get("/most-booked-services", getMostBookedServices);
router.get("/monthly-bookings-by-category", getMonthlyBookingsByCategory);

export default router;
