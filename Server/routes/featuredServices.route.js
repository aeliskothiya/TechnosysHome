import express from "express";
import { getFeaturedServices } from "../controllers/featuredServices.controller.js";

const router = express.Router();

// GET /api/featured-services?limit=8
router.get("/", getFeaturedServices);

export default router;
