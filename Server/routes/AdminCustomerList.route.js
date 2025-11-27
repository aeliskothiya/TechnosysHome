import express from "express";
import controller from "../controllers/AdminCustomerList.controller.js";

const router = express.Router();

// GET /api/admin/customers/
router.get("/", controller.getAllCustomers);
router.get("/all", controller.getAllCustomersRaw);

export default router;
