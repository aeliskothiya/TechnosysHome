import express from 'express';
import { createPaymentOrder, verifyPaymentAuthorization } from '../controllers/bookingPayment.controller.js';
import verifyToken from '../middleware/userAuth.js';

const router = express.Router();

// Create payment order (authorize payment)
router.post('/create-order', verifyToken, createPaymentOrder);

// Verify payment authorization
router.post('/verify-authorization', verifyToken, verifyPaymentAuthorization);

export default router;
