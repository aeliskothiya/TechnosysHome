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

    const packages = await SubscriptionPackage.find({}).sort({ price: 1 });

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

    // verify signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const paymentRecord = await SubscriptionPayment.findById(paymentId);
    if (!paymentRecord) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (generated_signature !== razorpay_signature) {
      paymentRecord.Status = 'Failed';
      paymentRecord.ProviderPaymentId = razorpay_payment_id;
      paymentRecord.ProviderSignature = razorpay_signature;
      await paymentRecord.save();

      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    // Signature valid -> mark success and create history + update wallet
    paymentRecord.Status = 'Success';
    paymentRecord.ProviderPaymentId = razorpay_payment_id;
    paymentRecord.ProviderSignature = razorpay_signature;
    await paymentRecord.save();

    // Create subscription history
    const history = new SubscriptionHistory({
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

    const updatedWallet = await TechnicianWallet.findOneAndUpdate(
      { TechnicianID: req.userId },
      {
        $inc: { BalanceCoins: coinsToAdd },
        $set: { LastUpdate: new Date() }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Generate invoice PDF, store it and email to technician
    (async () => {
      try {
        // fetch technician details
        const tech = await Technician.findById(req.userId).lean();
        const invoiceDir = path.join(process.cwd(), 'uploads', 'invoices');
        if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });

        const invoiceFilename = `invoice_${String(paymentRecord._id)}.pdf`;
        const invoicePath = path.join(invoiceDir, invoiceFilename);

        // create PDF: try rendering your HTML template via Puppeteer for pixel-perfect output
        try {
          // prepare HTML populated from template
          const invoiceDate = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
          const amountDisplay = `₹${(paymentRecord.Amount || subscriptionPackage?.price || 0).toFixed(2)}`;

          // try to read logo (prefer PNG, fallback to SVG). PNG will also be used for PDFKit fallback.
          // Resolve paths relative to this file so server working dir won't break asset lookup
          const logoPngPath = path.join(__dirname, '..', '..', 'Client', 'public', 'navbarlogo.png');
          const logoSvgPath = path.join(__dirname, '..', '..', 'Client', 'public', 'navbarlogo.svg');
          console.debug('Resolved logo paths:', { logoPngPath, logoSvgPath });
          let logoDataUri = null;
          let logoBuffer = null;
          try {
            if (fs.existsSync(logoPngPath)) {
              // PNG exists — use directly
              logoBuffer = fs.readFileSync(logoPngPath);
              logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            } else if (fs.existsSync(logoSvgPath)) {
              // SVG exists — embed as data URI for HTML rendering
              const svgText = fs.readFileSync(logoSvgPath, 'utf8');
              logoDataUri = `data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}`;

              // Try to rasterize the SVG to PNG so PDFKit fallback can use it.
              try {
                // Prefer sharp if available
                const sharpModule = await import('sharp').catch(() => null);
                if (sharpModule) {
                  const sharp = sharpModule.default || sharpModule;
                  try {
                    const pngBuf = await sharp(Buffer.from(svgText)).png().toBuffer();
                    logoBuffer = pngBuf;
                    logoDataUri = `data:image/png;base64,${pngBuf.toString('base64')}`;
                  } catch (sharpErr) {
                    // fall through to try puppeteer
                    logoBuffer = null;
                  }
                }
              } catch (e) {
                // ignore
              }

              // If still no PNG buffer, try using puppeteer to render the SVG to PNG (if available)
              if (!logoBuffer) {
                try {
                  const puppeteerModule = await import('puppeteer').catch(() => null);
                  if (puppeteerModule) {
                    const puppeteer = puppeteerModule.default || puppeteerModule;
                    const b = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
                    const p = await b.newPage();
                    // wrap SVG in simple HTML so it renders alone
                    await p.setContent(`<html><body style="margin:0;padding:0">${svgText}</body></html>`, { waitUntil: 'networkidle0' });
                    const pngBuf = await p.screenshot({ omitBackground: true, type: 'png' });
                    await b.close();
                    logoBuffer = pngBuf;
                    logoDataUri = `data:image/png;base64,${pngBuf.toString('base64')}`;
                  }
                } catch (puppErr) {
                  // ignore — will fallback to placeholder
                }
              }
            }
          } catch (logoErr) {
            console.warn('Could not load logo for invoice:', logoErr?.message || logoErr);
          }

          const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice</title>
  <style>
    :root{ --accent:#4a56e2; --muted:#f3f6fb; --text:#333; --light:#6b7280; --border:#e6eaf2; --paper-bg:#ffffff; font-size:14px; }
    *{box-sizing:border-box}
    body{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;  padding:30px 20px; }
    .sheet{ max-width:800px; margin:0 auto; border-radius:4px;overflow:hidden; }
    .pad{padding:28px 36px}
    .header{display:flex;align-items:flex-start;justify-content:space-between}
    .brand{display:flex;gap:12px;align-items:center}
    .brand h1{font-size:20px;margin:0;padding:0;line-height:1}
    .meta{ text-align:right;color:var(--light) }
    .meta .date{font-weight:600;color:var(--accent)}
    .meta .invoice{margin-top:6px;font-weight:600}
    .addresses{display:flex;gap:20px;margin-top:18px}
    .addr{flex:1;padding:18px;border-radius:4px}
    .addr h4{margin:0 0 8px 0}
    .muted small{display:block;color:var(--light)}
    table{width:100%;border-collapse:collapse;margin-top:26px}
    thead th{border-bottom:2px solid var(--border);text-align:left;padding:12px 8px;color:var(--accent);font-weight:700}
    tbody td{padding:14px 8px;border-bottom:1px solid var(--border);vertical-align:top}
    tbody tr td:nth-child(1){width:32px}
    .col-price,.col-qty,.col-sub{white-space:nowrap;text-align:right}
    .totals{display:flex;justify-content:flex-end;margin-top:18px}
    .totals .box{width:240px}
    .totals .row{display:flex;justify-content:space-between;padding:8px 0;color:var(--light)}
    .totals .row.total{background:linear-gradient(180deg,#3f45d6,#2b2fc4);color:#fff;padding:12px;border-radius:4px;margin-top:8px;align-items:center}
    .totals .row.total .label{font-weight:700}
    .payment{margin-top:30px}
    .payment h5{color:var(--accent);margin-bottom:8px}
    .notes{margin-top:12px;color:var(--light);font-size:13px}
    .footer{background:var(--muted);padding:12px 36px;font-size:13px;color:var(--light);display:flex;justify-content:space-between;align-items:center}
  </style>
</head>
<body>
  <div class="sheet">
    <div class="pad">
      <div class="header">
        <div class="brand">
          <div class="logo" style="padding:0;margin:0;width:55px;height:55px;display:flex;align-items:center;justify-content:center;">
            ${logoDataUri ? `<img src="${logoDataUri}" alt="logo" style="width:55px;height:55px;object-fit:contain;margin:0;padding:0"/>` : ''}
          </div>
          <div style="margin:0;padding:0;line-height:1;">
            <h1>Technosys</h1>
          </div>
        </div>
        <div class="meta">
          <div class="date">${invoiceDate}</div>
          <div class="invoice">Invoice # <strong>${paymentRecord._id}</strong></div>
        </div>
      </div>

      <table class="addresses-table" style="width:100%;border-collapse:separate;border-spacing:0;margin-top:18px;">
        <tr>
          <td style="vertical-align:top;padding-right:12px;width:50%;">
            <div class="addr" style="margin:0">
              <h4>Supplier Company INC</h4>
              <div class="muted">
                <small>Number: 23456789</small>
                <small>6622 Abshire Mills</small>
                <small>Port Orlofurt, 05820</small>
                <small>United States</small>
              </div>
            </div>
          </td>
          <td style="vertical-align:top;padding-left:12px;width:50%;text-align:right;">
            <div class="addr" style="margin:0;text-align:right">
              <h4>${tech?.Name || 'Customer'}</h4>
              <div class="muted" style="text-align:right">
                <small>Number: ${tech?.MobileNumber || ''}</small>
                <small>Email: ${tech?.Email || ''}</small>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th>Index</th>
            <th>Product details</th>
            <th class="col-price">Price</th>
            <th class="col-qty">Qty.</th>
            <th class="col-sub">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1.</td>
            <td>${subscriptionPackage?.name || 'Subscription Package'}</td>
            <td class="col-price">${amountDisplay}</td>
            <td class="col-qty">${subscriptionPackage?.coins || 0}</td>
            <td class="col-sub">${amountDisplay}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="box">
          <div class="row"><div class="label">Net total:</div><div class="value">${amountDisplay}</div></div>
          <div class="row total"><div class="label">Total:</div><div class="value">${amountDisplay}</div></div>
        </div>
      </div>

      <div class="payment">
        <h5>PAYMENT DETAILS</h5>
        <div>
          Method: ${paymentRecord.Method || 'Razorpay'}<br>
          Payment ID: ${paymentRecord.ProviderPaymentId || '-'}<br>
        </div>

        <div class="notes">
          <strong>Notes</strong>
          <p>Thank you for your purchase. If you need help, contact Technosys support.</p>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>Supplier Company</div>
      <div>info@company.com | +1-202-555-0106</div>
    </div>
  </div>
</body>
</html>`;
          let pdfGenerated = false;

          // Try Puppeteer (headless Chromium) for exact rendering of the HTML template
          try {
            const puppeteerModule = await import('puppeteer');
            const puppeteer = puppeteerModule.default || puppeteerModule;
            const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            await page.pdf({ path: invoicePath, format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '12mm', right: '12mm' } });
            await browser.close();
            pdfGenerated = true;
          } catch (puppErr) {
            console.warn('Puppeteer PDF generation failed, falling back to PDFKit:', puppErr?.message || puppErr);
            pdfGenerated = false;
          }

          // Fallback to PDFKit if Puppeteer isn't available or failed
          if (!pdfGenerated) {
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const stream = fs.createWriteStream(invoicePath);
            doc.pipe(stream);

            const ACCENT = '#4a56e2';
            const LIGHT = '#6b7280';
            const BORDER = '#e6eaf2';
            // Header: try to render PNG logo (logoBuffer) on the left, title centered
            const headerY = doc.y;
            if (typeof logoBuffer !== 'undefined' && logoBuffer) {
              try {
                doc.image(logoBuffer, 40, headerY, { width: 56, height: 28 });
              } catch (e) {
                // ignore image errors and use placeholder
                doc.rect(40, headerY, 56, 28).fill('#6b46ff');
                doc.fillColor('#fff').fontSize(14).text('M', 58, headerY + 6, { align: 'center' });
                doc.fillColor('#000');
              }
            } else {
              // placeholder square
              doc.rect(40, headerY, 56, 28).fill('#6b46ff');
              doc.fillColor('#fff').fontSize(14).text('M', 58, headerY + 6, { align: 'center' });
              doc.fillColor('#000');
            }

            doc.fontSize(22).fillColor(ACCENT).text('Technosys Invoice', 0, headerY, { align: 'center' }).moveDown(0.5);
            doc.fontSize(11).fillColor(LIGHT).text(`Date: ${invoiceDate}`).text(`Invoice ID: ${paymentRecord._id}`).text(`Payment ID: ${paymentRecord.ProviderPaymentId || '-'}`).moveDown(1.2);

            doc.fontSize(13).fillColor('#000').text('Supplier', { underline: true });
            doc.fontSize(11).fillColor(LIGHT).text('Technosys Pvt Ltd').text('Customer Support Street, India').text('Email: support@technosys.com').moveDown(1);

            doc.fontSize(13).fillColor('#000').text('Billed To:', { underline: true });
            doc.fontSize(11).fillColor(LIGHT).text(`${tech?.Name || ''}`).text(`${tech?.Email || ''}`).text(`${tech?.MobileNumber || ''}`).moveDown(1);

            const tableTop = doc.y + 5;
            doc.fontSize(12).fillColor(ACCENT);
            doc.text('Index', 40, tableTop);
            doc.text('Product Details', 100, tableTop);
            doc.text('Price', 330, tableTop, { width: 80, align: 'right' });
            doc.text('Qty', 410, tableTop, { width: 60, align: 'right' });
            doc.text('Subtotal', 470, tableTop, { width: 80, align: 'right' });

            doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).strokeColor(BORDER).lineWidth(1).stroke();

            let rowY = tableTop + 30;
            const priceNum = Number(paymentRecord.Amount || subscriptionPackage?.price || 0);
            doc.fontSize(11).fillColor('#000');
            doc.text('1.', 40, rowY);
            doc.text(subscriptionPackage?.name || 'Subscription Package', 100, rowY);
            doc.text(`₹${priceNum.toFixed(2)}`, 330, rowY, { width: 80, align: 'right' });
            doc.text('1', 410, rowY, { width: 60, align: 'right' });
            doc.text(`₹${priceNum.toFixed(2)}`, 470, rowY, { width: 80, align: 'right' });

            rowY += 25;
            doc.moveDown(2);

            const totalY = rowY + 20;
            doc.fontSize(12).fillColor(LIGHT).text('Net Total:', 350, totalY, { width: 120, align: 'right' });
            doc.fontSize(12).fillColor('#000').text(`₹${priceNum.toFixed(2)}`, 470, totalY, { width: 80, align: 'right' });

            doc.rect(350, totalY + 30, 200, 30).fill(ACCENT);
            doc.fillColor('#fff').fontSize(13).text('Total:', 360, totalY + 38);
            doc.text(`₹${priceNum.toFixed(2)}`, 470, totalY + 38, { width: 80, align: 'right' });
            doc.fillColor('#000');

            doc.moveDown(4);
            doc.fontSize(12).fillColor(ACCENT).text('Notes');
            doc.fontSize(11).fillColor(LIGHT).text('Thank you for your purchase. If you need help, contact Technosys support.').moveDown(2);

            doc.moveTo(40, 780).lineTo(550, 780).strokeColor(BORDER).stroke();
            doc.fontSize(10).fillColor(LIGHT).text('Technosys Pvt Ltd', 40, 790);
            doc.text('support@technosys.com | +91 9876543210', 350, 790, { align: 'right' });

            doc.end();

            // wait for stream finish when using PDFKit
            await new Promise((resolve, reject) => {
              stream.on('finish', resolve);
              stream.on('error', reject);
            });
          }

          // If Puppeteer was used it already wrote the file; if fallback used, file is written after stream finish above.

          // store Invoice document
          const invoiceDoc = new Invoice({
            ref_type: 'SubscriptionPayment',
            ref_id: paymentRecord._id,
            invoice_pdf: `/uploads/invoices/${invoiceFilename}`,
          });
          await invoiceDoc.save();

          // Emit a synthetic SubscriptionHistory db_change so clients subscribed
          // to SubscriptionHistory will receive an update and can refresh their
          // view (this avoids the user needing to manually refresh to see invoice).
          try {
            const io = getIo();
            if (io && paymentRecord.HistoryID) {
              // fetch the history document (populate PackageID) and attach invoice_pdf
              const histDoc = await SubscriptionHistory.findById(paymentRecord.HistoryID)
                .populate({ path: 'PackageID', select: 'name coins price description' })
                .lean();

              if (histDoc) {
                histDoc.invoice_pdf = invoiceDoc.invoice_pdf;
                io.emit('db_change', { model: 'SubscriptionHistory', operation: 'update', doc: histDoc });
              }
            }
          } catch (emitErr) {
            console.warn('Realtime emit for SubscriptionHistory after invoice save failed', emitErr);
          }

          // send email with attachment if email exists
          if (tech?.Email) {
            const mailOptions = {
              from: process.env.SENDER_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER,
              to: tech.Email,
              subject: 'Your Technosys Invoice',
              html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">` +
                `<h2 style="color: #155DFC; text-align: center;">Invoice from Technosys</h2>` +
                `<p>Dear <strong>${tech?.Name || ''}</strong>,</p>` +
                `<p>Thank you for your purchase. Please find the invoice attached for your recent subscription.</p>` +
                `<div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; margin: 18px 0;">` +
                `<p style="margin: 0;"><strong>Invoice Details</strong></p>` +
                `<ul style="margin: 8px 0 0 16px; padding: 0;">` +
                `<li><strong>Invoice ID:</strong> ${paymentRecord._id}</li>` +
                `<li><strong>Payment ID:</strong> ${paymentRecord.ProviderPaymentId || ''}</li>` +
                `<li><strong>Package:</strong> ${subscriptionPackage?.name || ''}</li>` +
                `<li><strong>Amount:</strong> ${amountDisplay}</li>` +
                `</ul>` +
                `</div>` +
                `<p>If you have any questions, please contact our support team.</p>` +
                `<p>Best regards,<br/><strong>Technosys Team</strong></p>` +
                `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"/>` +
                `<p style="color: #6b7280; font-size: 12px; text-align: center;">This is an automated message. Please do not reply to this email.</p>` +
                `</div>`,
              attachments: [
                { filename: invoiceFilename, path: invoicePath }
              ],
            };

            try {
              await transporter.sendMail(mailOptions);
              console.log(`Invoice email sent to: ${tech.Email}`);
            } catch (mailErr) {
              console.error('Invoice email send failed', mailErr);
            }
          }
        } catch (invErr) {
          console.error('Invoice generation error', invErr);
        }

      } catch (invErr) {
        console.error('Invoice generation error', invErr);
      }
    })();

    return res.status(200).json({ success: true, message: 'Payment verified and subscription applied', data: { history, wallet: updatedWallet, payment: paymentRecord } });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};