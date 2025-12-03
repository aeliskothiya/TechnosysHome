// 

import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  getTechnicians,
  approveTechnician,
  rejectTechnician,
  getTechnicianStats,
  getTechnicianDetails 
} from "../controllers/admin.controller.js";

const router = express.Router();

// Protect all admin routes
router.use(userAuth);

// Check if user is admin
// router.use((req, res, next) => {
//   if (req.userType !== 'admin') {
//     return res.status(403).json({
//       success: false,
//       message: "Access denied. Admin only."
//     });
//   }
//   next();
// });
router.use(userAuth);
router.use((req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({ success: false, message: "Access denied. Admin only." });
  }
  next();
});

// Admin dashboard stats
// router.get("/stats", getTechnicianStats);
router.get("/technicians/stats", getTechnicianStats);

// Get technicians with optional status filter
router.get("/technicians", getTechnicians);

// Approve technician
router.patch("/technicians/:id/approve", approveTechnician);

// Reject technician
router.patch("/technicians/:id/reject", rejectTechnician);

// Get technician details
router.get("/technicians/:id", getTechnicianDetails);


// Admin dashboard
router.get("/dashboard", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to admin dashboard",
    user: req.userEmail
  });
});

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Admin API is working!",
    timestamp: new Date().toISOString()
  });
});

export default router;