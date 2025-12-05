import express from "express";
import { getThresholds, updateThresholds } from "../controllers/thresholds.controller.js";
import userAuth from "../middleware/userAuth.js";

const thresholdsRouter = express.Router();

// Get current thresholds
thresholdsRouter.get("/", userAuth, getThresholds);

// Update thresholds (Admin only)
thresholdsRouter.put("/", userAuth, updateThresholds);

export default thresholdsRouter;
