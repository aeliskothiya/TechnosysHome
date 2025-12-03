// controllers/subscriptionPackage.controller.js
import SubscriptionPackage from "../models/SubscriptionPackage.js";
import { validationResult } from "express-validator";
import SubscriptionHistory from "../models/SubscriptionHistory.js";
import TechnicianWallet from "../models/TechnicianWallet.js";
import SubscriptionPayment from "../models/SubscriptionPayment.js";
import Invoice from "../models/Invoice.js";
import Technician from "../models/Technician.js";
import transporter from "../config/nodemailer.js";
import { getIo } from "../config/realtime.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import PDFDocument from "pdfkit";
import Razorpay from "razorpay";
import crypto from "crypto";
import { generateInvoice } from "../services/invoice.service.js";
import { verifyRazorpayAndFinalize } from "../services/payment.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Get all subscription packages
// @route   GET /api/subscription-packages
// @access  Public (All users)
export const getAllSubscriptionPackages = async (req, res) => {
  try {
    const { isActive } = req.query;

    let filter = {};
    // Only apply isActive filter if explicitly requested
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    } else {
      // By default, show active packages to non-admin users
      if (!req.userType || req.userType !== 'admin') {
        filter.isActive = true;
      }
    }

    const packages = await SubscriptionPackage.find(filter).sort({ price: 1 });

    return res.status(200).json({
      success: true,
      message: "Subscription packages retrieved successfully",
      data: packages
    });
  } catch (error) {
    console.error("Get subscription packages error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// @desc    Get single subscription package
// @route   GET /api/subscription-packages/:id
// @access  Public (All users)
export const getSubscriptionPackage = async (req, res) => {
  try {
    const subscriptionPackage = await SubscriptionPackage.findById(req.params.id);

    if (!subscriptionPackage) {
      return res.status(404).json({
        success: false,
        message: "Subscription package not found"
      });
    }

    // Non-admin users can only see active packages
    if ((!req.userType || req.userType !== 'admin') && !subscriptionPackage.isActive) {
      return res.status(404).json({
        success: false,
        message: "Subscription package not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription package retrieved successfully",
      data: subscriptionPackage
    });
  } catch (error) {
    console.error("Get subscription package error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// @desc    Create new subscription package
// @route   POST /api/subscription-packages
// @access  Admin only
export const createSubscriptionPackage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { name, coins, price, description, isActive = true } = req.body;

    // Check if package with same name already exists
    const existingPackage = await SubscriptionPackage.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingPackage) {
      return res.status(409).json({
        success: false,
        message: "Subscription package with this name already exists"
      });
    }

    const subscriptionPackage = new SubscriptionPackage({
      name,
      coins,
      price,
      description,
      isActive
    });

    await subscriptionPackage.save();

    return res.status(201).json({
      success: true,
      message: "Subscription package created successfully",
      data: subscriptionPackage
    });
  } catch (error) {
    console.error("Create subscription package error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// @desc    Update subscription package
// @route   PUT /api/subscription-packages/:id
// @access  Admin only
export const updateSubscriptionPackage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { name, coins, price, description, isActive } = req.body;

    // Check if package exists
    const existingPackage = await SubscriptionPackage.findById(req.params.id);
    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        message: "Subscription package not found"
      });
    }

    // Check if another package with same name exists (excluding current package)
    if (name && name !== existingPackage.name) {
      const duplicatePackage = await SubscriptionPackage.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });

      if (duplicatePackage) {
        return res.status(409).json({
          success: false,
          message: "Subscription package with this name already exists"
        });
      }
    }

    // Update package
    const updatedPackage = await SubscriptionPackage.findByIdAndUpdate(
      req.params.id,
      {
        name: name || existingPackage.name,
        coins: coins !== undefined ? coins : existingPackage.coins,
        price: price !== undefined ? price : existingPackage.price,
        description: description !== undefined ? description : existingPackage.description,
        isActive: isActive !== undefined ? isActive : existingPackage.isActive
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Subscription package updated successfully",
      data: updatedPackage
    });
  } catch (error) {
    console.error("Update subscription package error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// @desc    Delete subscription package
// @route   DELETE /api/subscription-packages/:id
// @access  Admin only
export const deleteSubscriptionPackage = async (req, res) => {
  try {
    const subscriptionPackage = await SubscriptionPackage.findByIdAndDelete(req.params.id);

    if (!subscriptionPackage) {
      return res.status(404).json({
        success: false,
        message: "Subscription package not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription package deleted successfully"
    });
  } catch (error) {
    console.error("Delete subscription package error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// @desc    Toggle package status
// @route   PATCH /api/subscription-packages/:id/toggle-status
// @access  Admin only
export const togglePackageStatus = async (req, res) => {
  try {
    const subscriptionPackage = await SubscriptionPackage.findById(req.params.id);

    if (!subscriptionPackage) {
      return res.status(404).json({
        success: false,
        message: "Subscription package not found"
      });
    }

    subscriptionPackage.isActive = !subscriptionPackage.isActive;
    await subscriptionPackage.save();

    return res.status(200).json({
      success: true,
      message: `Package ${subscriptionPackage.isActive ? 'activated' : 'deactivated'} successfully`,
      data: subscriptionPackage
    });
  } catch (error) {
    console.error("Toggle package status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// @desc    Purchase a subscription package (technician)
// @route   POST /api/subscription-packages/:id/purchase
// @access  Technician only
export const purchaseSubscription = async (req, res) => {
  try {
    if (!req.userType || req.userType !== 'technician') {
      return res.status(403).json({ success: false, message: 'Access denied. Technician only.' });
    }

    const packageId = req.params.id;
    const subscriptionPackage = await SubscriptionPackage.findById(packageId);

    if (!subscriptionPackage || !subscriptionPackage.isActive) {
      return res.status(404).json({ success: false, message: 'Subscription package not found or not active' });
    }

    const technicianId = req.userId;

    // Create subscription history record
    const history = new SubscriptionHistory({
      TechnicianID: technicianId,
      PackageID: subscriptionPackage._id,
      PurchasedAt: new Date()
    });

    await history.save();

    // Update or create technician wallet
    const coinsToAdd = subscriptionPackage.coins || 0;

    const updatedWallet = await TechnicianWallet.findOneAndUpdate(
      { TechnicianID: technicianId },
      {
        $inc: { BalanceCoins: coinsToAdd },
        $set: { LastUpdate: new Date() }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // If upsert created a document without BalanceCoins initialized, ensure default applied
    if (!updatedWallet.BalanceCoins && updatedWallet.BalanceCoins !== 0) {
      updatedWallet.BalanceCoins = coinsToAdd;
      updatedWallet.LastUpdate = new Date();
      await updatedWallet.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription purchased successfully',
      data: { history, wallet: updatedWallet }
    });
  } catch (error) {
    console.error('Purchase subscription error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// @desc    Get subscription purchase history for technician
// @route   GET /api/subscription-packages/history
// @access  Technician only
export const getSubscriptionHistory = async (req, res) => {
  try {
    if (!req.userType || req.userType !== 'technician') {
      return res.status(403).json({ success: false, message: 'Access denied. Technician only.' });
    }

    const technicianId = req.userId;

    const history = await SubscriptionHistory.find({ TechnicianID: technicianId })
      .populate({ path: 'PackageID', select: 'name coins price description' })
      .sort({ PurchasedAt: -1 })
      .lean();

    // Attach invoice URL when available using batched queries to avoid N+1 DB calls
    try {
      const historyIds = history.map(h => h._id);
      if (historyIds.length > 0) {
        // Fetch all payments that reference these history entries
        const payments = await SubscriptionPayment.find({ HistoryID: { $in: historyIds } })
          .select('_id HistoryID')
          .lean();

        // Map historyId -> payment (if multiple payments per history exist we pick the first)
        const paymentByHistory = Object.create(null);
        for (const p of payments) {
          const key = String(p.HistoryID);
          if (!paymentByHistory[key]) paymentByHistory[key] = p;
        }

        // Fetch invoices for these payments in one query
        const paymentIds = payments.map(p => p._id);
        let invoices = [];
        if (paymentIds.length > 0) {
          invoices = await Invoice.find({ ref_type: 'SubscriptionPayment', ref_id: { $in: paymentIds } })
            .select('ref_id invoice_pdf')
            .lean();
        }

        const invoiceByPayment = Object.create(null);
        for (const inv of invoices) {
          invoiceByPayment[String(inv.ref_id)] = inv;
        }

        // Attach invoice_pdf to each history item
        for (const h of history) {
          const key = String(h._id);
          const payment = paymentByHistory[key];
          if (payment) {
            const inv = invoiceByPayment[String(payment._id)];
            h.invoice_pdf = inv ? inv.invoice_pdf : null;
          } else {
            h.invoice_pdf = null;
          }
        }
      } else {
        // no history entries
        for (const h of history) h.invoice_pdf = null;
      }
    } catch (attachErr) {
      console.error('Attach invoice batch error', attachErr);
      for (const h of history) h.invoice_pdf = null;
    }


    return res.status(200).json({ success: true, message: 'Purchase history retrieved', data: history });
  } catch (error) {
    console.error('Get subscription history error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// @desc    Create Razorpay order for a subscription package (technician)
// @route   POST /api/subscription-packages/:id/create-order
// @access  Technician only
export const createRazorpayOrder = async (req, res) => {
  try {
    if (!req.userType || req.userType !== 'technician') {
      return res.status(403).json({ success: false, message: 'Access denied. Technician only.' });
    }

    const packageId = req.params.id;
    const subscriptionPackage = await SubscriptionPackage.findById(packageId);

    if (!subscriptionPackage || !subscriptionPackage.isActive) {
      return res.status(404).json({ success: false, message: 'Subscription package not found or not active' });
    }

    // Ensure Razorpay keys are present
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay keys not configured in env');
      return res.status(500).json({ success: false, message: 'Razorpay keys not configured on server' });
    }

    const amount = Math.round((subscriptionPackage.price || 0) * 100); // amount in paise

    // Build a short receipt id (Razorpay requires <= 40 chars)
    const rawReceipt = `rcpt_${req.userId}_${Date.now()}`;
    let receipt = rawReceipt;
    if (receipt.length > 40) {
      // try a compact form using last 8 chars of userId and last 6 of timestamp
      receipt = `rcpt_${String(req.userId).slice(-8)}_${String(Date.now()).slice(-6)}`;
    }
    if (receipt.length > 40) {
      // fallback to a short random hex string
      receipt = `rcpt_${crypto.randomBytes(8).toString('hex')}`;
    }

    const orderOptions = {
      amount,
      currency: 'INR',
      receipt,
      payment_capture: 1,
    };

    let order;
    try {
      order = await razorpayInstance.orders.create(orderOptions);
    } catch (provErr) {
      // log provider error details for debugging (avoid leaking secrets)
      try {
        console.error('Razorpay provider error creating order:', provErr && provErr.message ? provErr.message : provErr);
        // log full object for debugging (this stays server-side)
        console.error('Razorpay provider full error:', provErr);
      } catch (logErr) {
        console.error('Error logging provider error', logErr);
      }

      // Try to extract safe detail fields
      const provDetail = provErr?.error?.description || provErr?.error || provErr?.message || (typeof provErr === 'string' ? provErr : undefined);

      return res.status(502).json({
        success: false,
        message: 'Failed to create payment order with provider',
        detail: provDetail
      });
    }

    // Create pending payment record
    const payment = new SubscriptionPayment({
      TechnicianID: req.userId,
      PackageID: subscriptionPackage._id,
      Amount: subscriptionPackage.price,
      Method: 'Razorpay',
      Status: 'Pending',
      ProviderOrderId: order.id,
    });

    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Razorpay order created',
      data: { order, paymentId: payment._id },
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// @desc    Verify Razorpay payment signature and finalize subscription
// @route   POST /api/subscription-packages/verify-payment
// @access  Technician only
export const verifyRazorpayPayment = async (req, res) => {
  try {
    if (!req.userType || req.userType !== 'technician') {
      return res.status(403).json({ success: false, message: 'Access denied. Technician only.' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
      return res.status(400).json({ success: false, message: 'Incomplete payment verification data' });
    }

    // Use shared payment service to verify signature and finalize
    let updatedWallet = null;
    let history = null;

    const result = await verifyRazorpayAndFinalize({
      paymentModel: SubscriptionPayment,
      paymentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      onSuccess: async (paymentRecord) => {
        // Create subscription history
        history = new SubscriptionHistory({
          TechnicianID: req.userId,
          PackageID: paymentRecord.PackageID,
          PurchasedAt: new Date()
        });
        await history.save();

        // Update payment record with history id
        paymentRecord.HistoryID = history._id;
        await paymentRecord.save();

        // Update or create technician wallet
        const subscriptionPackage = await SubscriptionPackage.findById(paymentRecord.PackageID);
        const coinsToAdd = subscriptionPackage?.coins || 0;

        updatedWallet = await TechnicianWallet.findOneAndUpdate(
          { TechnicianID: req.userId },
          {
            $inc: { BalanceCoins: coinsToAdd },
            $set: { LastUpdate: new Date() }
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Generate invoice non-blocking
        (async () => {
          try {
            const tech = await Technician.findById(req.userId).lean();
            const subscriptionPackage = await SubscriptionPackage.findById(paymentRecord.PackageID).lean();
            generateInvoice({ refType: 'SubscriptionPayment', refId: paymentRecord._id, paymentRecord, subscriptionPackage, recipient: tech, historyId: paymentRecord.HistoryID })
              .catch(err => console.error('Invoice generation error', err));
          } catch (err) {
            console.error('Invoice generation dispatch error', err);
          }
        })();
      }
    });

    if (!result.success) {
      // signature verification failed; result.paymentRecord is available
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    return res.status(200).json({ success: true, message: 'Payment verified and subscription applied', data: { history, wallet: updatedWallet, payment: result.paymentRecord } });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};