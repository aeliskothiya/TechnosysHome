import express from 'express';
import {
  getTechnicianDashboard,
  getWeeklyEarnings,
  getMonthlyEarnings,
  getMonthlyEarningsByMonth,
  getBookingStatus,
  getRevenueByService,
  getRecentFeedback,
  getUpcomingBookings,
  getMostBookedServices,
  getRatingTrend,
  getRecentTransactions,
  getPeakHours,
  getTopLocations
} from '../controllers/technicianAnalytics.controller.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

// All routes require authentication
router.get('/dashboard', userAuth, getTechnicianDashboard);
router.get('/weekly-earnings', userAuth, getWeeklyEarnings);
router.get('/monthly-earnings', userAuth, getMonthlyEarnings);
router.get('/monthly-earnings-by-month', userAuth, getMonthlyEarningsByMonth);
router.get('/booking-status', userAuth, getBookingStatus);
router.get('/revenue-by-service', userAuth, getRevenueByService);
router.get('/recent-feedback', userAuth, getRecentFeedback);
router.get('/upcoming-bookings', userAuth, getUpcomingBookings);
router.get('/most-booked-services', userAuth, getMostBookedServices);
router.get('/rating-trend', userAuth, getRatingTrend);
router.get('/recent-transactions', userAuth, getRecentTransactions);
router.get('/peak-hours', userAuth, getPeakHours);
router.get('/top-locations', userAuth, getTopLocations);

export default router;
