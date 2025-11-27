import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  upsertAvailability,
  getAvailability,
  listAvailability,
} from "../controllers/technicianAvailability.controller.js";

const router = express.Router();

// POST /api/technician-availability   (technician creates/updates their availability)
router.post("/", userAuth, upsertAvailability);

// GET /api/technician-availability/:technicianId?date=YYYY-MM-DD
router.get("/:technicianId", userAuth, getAvailability);

// GET /api/technician-availability?technicianId=...   (list all dates)
router.get("/", userAuth, listAvailability);

export default router;
