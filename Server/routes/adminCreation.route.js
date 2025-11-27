import express from "express";
import { createAdmin } from "../controllers/adminRegister.controller.js";

const router = express.Router();

// ⚠️ Use this only once to create an admin, then DELETE or DISABLE it.
router.post("/create", createAdmin);

export default router;
