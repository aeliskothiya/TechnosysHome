import Booking from "../models/Booking.js";
import Technician from "../models/Technician.js";
import TechnicianAvailability from "../models/TechnicianAvailability.js";
import ServiceCategory from "../models/ServiceCategory.js"; // kept if needed elsewhere
import SubServiceCategory from "../models/SubServiceCategory.js";
import Customer from "../models/Customer.js";
import ServiceRequest from "../models/ServiceRequest.js";
import TechnicianServiceCategory from "../models/TechnicianServiceCategory.js";
import TechnicianWallet from "../models/TechnicianWallet.js";
import BookingArrivalOTP from "../models/BookingArrivalOTP.js";
import FailedPaymentOperation from "../models/FailedPaymentOperation.js";
import Refund from "../models/Refund.js";
import AdminPayout from "../models/AdminPayout.js";
import Chat from "../models/Chat.js";
import mongoose from "mongoose";
import { getIo } from "../config/realtime.js";
import transporter from "../config/nodemailer.js";
import cron from "node-cron";
import { refundRazorpayPayment, captureRazorpayPayment } from "../services/payment.service.js";
import { generateInvoice } from "../services/invoice.service.js";

// Background job: Auto-cancel expired bookings
const scheduledCancellations = new Map(); // bookingId -> timeoutId
const scheduledArrivalCancellations = new Map(); // bookingId -> timeoutId for arrival deadline

async function executeCancellation(bookingId) {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('CustomerID', 'FirstName LastName Email');
    
    if (!booking) {
      console.log(`⚠️ Booking ${bookingId} not found for auto-cancel`);
      scheduledCancellations.delete(String(bookingId));
      return;
    }

    // Only cancel if still pending
    if (booking.Status !== "Pending") {
      console.log(`⚠️ Booking ${bookingId} is no longer pending (Status: ${booking.Status})`);
      scheduledCancellations.delete(String(bookingId));
      return;
    }

    // Update status to AutoCancelled
    booking.Status = "AutoCancelled";
    await booking.save();

    console.log(`✅ Auto-cancelled booking ${bookingId} at ${new Date().toISOString()}`);

    // Get socket.io instance
    const io = getIo();
    
    // Find service request to get broadcast technicians
    const serviceRequest = await ServiceRequest.findOne({ BookingID: booking._id }).lean();
    
    // Notify all technicians to remove the request
    if (serviceRequest?.BroadcastTechnicians) {
      serviceRequest.BroadcastTechnicians.forEach(tid => {
        io.to(String(tid)).emit("booking-request-closed", { 
          bookingId: String(booking._id) 
        });
      });
    }
    
    // Notify customer about auto-cancellation
    const customerId = String(booking.CustomerID);
    io.to(customerId).emit("booking-auto-cancelled", { 
      bookingId: String(booking._id),
      message: "Your booking was automatically cancelled due to no technician acceptance within 10 minutes."
    });

    // Process refund if payment was authorized
    if (booking.PaymentID) {
      console.log(`💳 Processing refund for auto-cancel booking...`);
      const refundResult = await processBookingRefund({
        bookingId: booking._id,
        paymentId: booking.PaymentID,
        customerId: booking.CustomerID._id,
        reason: "AutoCancelNoAcceptance"
      });

      if (refundResult.success) {
        // Send cancellation + refund email
        const payment = await (await import('../models/CustomerPayment.js')).default.findById(booking.PaymentID);
        await sendCancellationRefundEmail({
          customer: booking.CustomerID,
          booking,
          payment,
          reason: "AutoCancelNoAcceptance"
        });
      }
    }

    // Remove from scheduled map
    scheduledCancellations.delete(String(bookingId));
  } catch (err) {
    console.error(`❌ Failed to auto-cancel booking ${bookingId}:`, err);
    scheduledCancellations.delete(String(bookingId));
  }
}

export function scheduleAutoCancellation(bookingId, autoCancelAt) {
  const bookingIdStr = String(bookingId);
  
  // Clear existing timeout if any
  if (scheduledCancellations.has(bookingIdStr)) {
    clearTimeout(scheduledCancellations.get(bookingIdStr));
  }

  const delay = new Date(autoCancelAt).getTime() - Date.now();
  
  if (delay <= 0) {
    // Already expired, cancel immediately
    console.log(`⚡ Booking ${bookingIdStr} already expired, cancelling immediately`);
    executeCancellation(bookingId);
    return;
  }

  // Schedule the cancellation at exact time
  console.log(`⏰ Scheduled auto-cancel for booking ${bookingIdStr} in ${Math.round(delay/1000)} seconds (at ${new Date(autoCancelAt).toISOString()})`);
  
  const timeoutId = setTimeout(() => {
    executeCancellation(bookingId);
  }, delay);

  scheduledCancellations.set(bookingIdStr, timeoutId);
}

export function cancelScheduledAutoCancellation(bookingId) {
  const bookingIdStr = String(bookingId);
  
  if (scheduledCancellations.has(bookingIdStr)) {
    clearTimeout(scheduledCancellations.get(bookingIdStr));
    scheduledCancellations.delete(bookingIdStr);
    console.log(`🚫 Cancelled scheduled auto-cancel for booking ${bookingIdStr}`);
  }
}

// Execute arrival deadline cancellation
async function executeCancellationForNoArrival(bookingId) {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('SubCategoryID', 'name')
      .populate('CustomerID', 'FirstName LastName Email')
      .populate('TechnicianID', 'Name Email');
    
    if (!booking) {
      console.log(`[ARRIVAL] Booking ${bookingId} not found for arrival cancellation`);
      scheduledArrivalCancellations.delete(String(bookingId));
      return;
    }

    // Only cancel if confirmed and arrival not verified
    if (booking.Status !== "Confirmed" || booking.arrivalVerified) {
      console.log(`[ARRIVAL] Booking ${bookingId} status: ${booking.Status}, arrivalVerified: ${booking.arrivalVerified}`);
      scheduledArrivalCancellations.delete(String(bookingId));
      return;
    }

    // Check if we're past the arrival deadline
    if (!booking.ArrivalDeadline || Date.now() < booking.ArrivalDeadline.getTime()) {
      console.log(`[ARRIVAL] Not yet past arrival deadline for booking ${bookingId}`);
      scheduledArrivalCancellations.delete(String(bookingId));
      return;
    }

    // Update status to AutoCancelled
    booking.Status = "AutoCancelled";
    await booking.save();

    console.log(`[ARRIVAL] Auto-cancelled booking ${bookingId} - Technician did not arrive by deadline`);

    // Process refund if payment was authorized
    if (booking.PaymentID) {
      console.log(`💳 Processing refund for arrival deadline cancellation...`);
      const refundResult = await processBookingRefund({
        bookingId: booking._id,
        paymentId: booking.PaymentID,
        customerId: booking.CustomerID._id,
        reason: "AutoCancelNoArrival"
      });

      if (refundResult.success) {
        console.log(`✅ Refund processed for arrival cancellation`);
      }
    }

    // Send cancellation + refund email to customer using reusable function
    if (booking.PaymentID) {
      const payment = await (await import('../models/CustomerPayment.js')).default.findById(booking.PaymentID);
      await sendCancellationRefundEmail({
        customer: booking.CustomerID,
        booking,
        payment,
        reason: "AutoCancelNoArrival"
      });
    }

    // Send email to technician
    try {
      if (booking.TechnicianID?.Email) {
        const SENDER_NAME = process.env.SENDER_NAME || "Technosys";
        const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || "no-reply@technosys.local";
        const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;

        const technicianName = booking.TechnicianID.Name || 'Technician';
        const serviceName = booking.SubCategoryID?.name || 'Service';
        const timeSlot = booking.TimeSlot || 'scheduled time';
        const bookingDate = booking.Date ? new Date(booking.Date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'scheduled date';

        await transporter.sendMail({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          replyTo: REPLY_TO,
          to: booking.TechnicianID.Email,
          subject: "Booking Cancelled - Arrival Deadline Missed - Technosys",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Booking Cancelled</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px 16px 0 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                      <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                          <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
                            <span style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 1px;">BOOKING CANCELLED</span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Arrival Deadline Missed</h1>
                          <p style="margin: 10px 0 0; color: #fef3c7; font-size: 16px;">Booking has been cancelled</p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                      <tr>
                        <td style="padding: 40px 30px;">
                          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Dear ${technicianName},</p>
                          <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Your booking has been automatically cancelled because you did not arrive and verify your arrival within the scheduled time slot.</p>
                          
                          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; margin: 30px 0;">
                            <tr>
                              <td style="padding: 25px;">
                                <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Booking Details</p>
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                  <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Service:</td>
                                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${serviceName}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${bookingDate}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Required Arrival:</td>
                                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${timeSlot}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
                                    <td style="padding: 8px 0; color: #dc2626; font-size: 14px; font-weight: 700; text-align: right;">CANCELLED</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; margin: 25px 0;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="margin: 0 0 8px; color: #dc2626; font-size: 14px; font-weight: 700;"><span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #dc2626; color: #ffffff; border-radius: 50%; font-size: 12px; font-weight: 900; margin-right: 8px;">!</span>Important Reminder</p>
                                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">You must arrive at the customer's location and verify your arrival by entering the OTP within the scheduled time slot. Failure to do so may result in penalties and affect your service rating.</p>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 25px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">Please ensure you arrive on time for future bookings to maintain your professional reputation and provide excellent service to our customers.</p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                      <tr>
                        <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px;">© ${new Date().getFullYear()} Technosys. All rights reserved.</p>
                          <p style="margin: 0; color: #9ca3af; font-size: 12px;">Quality home services at your doorstep</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });
        console.log(`[ARRIVAL] Sent cancellation email to technician: ${booking.TechnicianID.Email}`);
      }
    } catch (mailErr) {
      console.error("[ARRIVAL] Failed to send technician cancellation email", mailErr);
    }

    // Notify via socket
    const io = getIo();
    const customerId = String(booking.CustomerID._id);
    const technicianId = String(booking.TechnicianID._id);
    
    io.to(customerId).emit("booking-auto-cancelled", { 
      bookingId: String(booking._id),
      reason: "arrival-timeout",
      message: "Your booking was cancelled because the technician did not arrive on time. A refund will be processed."
    });
    
    io.to(technicianId).emit("booking-cancelled-no-arrival", { 
      bookingId: String(booking._id),
      message: "Booking cancelled - You did not arrive within the scheduled time slot."
    });

    scheduledArrivalCancellations.delete(String(bookingId));
  } catch (err) {
    console.error(`[ARRIVAL] Failed to auto-cancel booking ${bookingId}:`, err);
    scheduledArrivalCancellations.delete(String(bookingId));
  }
}

export function scheduleArrivalDeadlineCancellation(bookingId, arrivalDeadline) {
  const bookingIdStr = String(bookingId);
  
  // Clear existing timeout if any
  if (scheduledArrivalCancellations.has(bookingIdStr)) {
    clearTimeout(scheduledArrivalCancellations.get(bookingIdStr));
  }

  const delay = new Date(arrivalDeadline).getTime() - Date.now();
  
  if (delay <= 0) {
    console.log(`[ARRIVAL] Booking ${bookingIdStr} arrival deadline already passed, cancelling immediately`);
    executeCancellationForNoArrival(bookingId);
    return;
  }

  console.log(`[ARRIVAL] Scheduled arrival deadline check for booking ${bookingIdStr} in ${Math.round(delay/1000)} seconds (at ${new Date(arrivalDeadline).toISOString()})`);
  
  const timeoutId = setTimeout(() => {
    executeCancellationForNoArrival(bookingId);
  }, delay);

  scheduledArrivalCancellations.set(bookingIdStr, timeoutId);
}

export function cancelScheduledArrivalDeadline(bookingId) {
  const bookingIdStr = String(bookingId);
  
  if (scheduledArrivalCancellations.has(bookingIdStr)) {
    clearTimeout(scheduledArrivalCancellations.get(bookingIdStr));
    scheduledArrivalCancellations.delete(bookingIdStr);
    console.log(`[ARRIVAL] Cancelled scheduled arrival deadline for booking ${bookingIdStr}`);
  }
}

export async function startAutoCancelScheduler() {
  try {
    console.log('🔄 Initializing auto-cancel scheduler...');
    
    // Find all pending bookings with AutoCancelAt set
    const pendingBookings = await Booking.find({
      Status: "Pending",
      AutoCancelAt: { $ne: null }
    }).lean();

    console.log(`📋 Found ${pendingBookings.length} pending booking(s) to schedule`);

    const now = Date.now();
    
    // Schedule cancellation for each booking
    for (const booking of pendingBookings) {
      const autoCancelTime = new Date(booking.AutoCancelAt).getTime();
      
      if (autoCancelTime <= now) {
        // Already expired, cancel immediately
        console.log(`⚡ Booking ${booking._id} already expired, cancelling now`);
        await executeCancellation(booking._id);
      } else {
        // Schedule future cancellation
        scheduleAutoCancellation(booking._id, booking.AutoCancelAt);
      }
    }

    console.log('✅ Auto-cancel scheduler initialized successfully');
    
    // Initialize arrival deadline scheduler for confirmed bookings
    console.log('[ARRIVAL] Initializing arrival deadline scheduler...');
    
    const confirmedBookings = await Booking.find({
      Status: "Confirmed",
      ArrivalDeadline: { $ne: null },
      arrivalVerified: false
    }).lean();

    console.log(`[ARRIVAL] Found ${confirmedBookings.length} confirmed booking(s) awaiting arrival`);

    for (const booking of confirmedBookings) {
      const arrivalDeadlineTime = new Date(booking.ArrivalDeadline).getTime();
      
      if (arrivalDeadlineTime <= now) {
        console.log(`[ARRIVAL] Booking ${booking._id} arrival deadline passed, cancelling now`);
        await executeCancellationForNoArrival(booking._id);
      } else {
        scheduleArrivalDeadlineCancellation(booking._id, booking.ArrivalDeadline);
      }
    }
    
    console.log('[ARRIVAL] Arrival deadline scheduler initialized successfully');
  } catch (err) {
    console.error('❌ Failed to start auto-cancel scheduler:', err);
  }
}

export function stopAutoCancelScheduler() {
  console.log(`🛑 Stopping auto-cancel scheduler (${scheduledCancellations.size} scheduled cancellations)`);
  
  // Clear all scheduled timeouts
  for (const [bookingId, timeoutId] of scheduledCancellations.entries()) {
    clearTimeout(timeoutId);
  }
  
  scheduledCancellations.clear();
  console.log('✅ Auto-cancel scheduler stopped');
  
  // Clear arrival deadline timeouts
  console.log(`[ARRIVAL] Stopping arrival deadline scheduler (${scheduledArrivalCancellations.size} scheduled)`);
  
  for (const [bookingId, timeoutId] of scheduledArrivalCancellations.entries()) {
    clearTimeout(timeoutId);
  }
  
  scheduledArrivalCancellations.clear();
  console.log('[ARRIVAL] Arrival deadline scheduler stopped');
}

// Helper: radius technicians by category and timeslot
async function findEligibleTechnicians({ coords, radiusKm = 5, serviceCategoryId, date, timeSlot }) {
  const [lng, lat] = coords;
  
  // First, find technicians by category using the linking table
  const technicianCategories = await TechnicianServiceCategory.find({
    ServiceCategoryID: serviceCategoryId
  }).lean();
  
  const categoryTechIds = technicianCategories.map(tc => tc.TechnicianID);
  if (!categoryTechIds.length) return [];
  
  // Then filter by location and approval status
  const technicians = await Technician.find({
    _id: { $in: categoryTechIds },
    VerifyStatus: "Approved",
    location: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: radiusKm * 1000 } },
  }).lean();
  
  console.log('  ✓ Approved technicians within', radiusKm, 'km:', technicians.length);
  technicians.forEach((tech, idx) => {
    const techCoords = tech.location?.coordinates || [];
    const distance = calculateDistance(lat, lng, techCoords[1], techCoords[0]);
    console.log(`    ${idx + 1}. ${tech.Name} (ID: ${String(tech._id).slice(-6)}) - ${distance.toFixed(2)} km away at [${techCoords[1]}, ${techCoords[0]}]`);
  });

  if (!technicians.length) return [];

  const techIds = technicians.map(t => t._id);

  // Format date as YYYY-MM-DD string to match model
  const dateStr = new Date(date).toISOString().split('T')[0];
  
  // Build the time slot string (e.g., "18:00-19:00")
  const timeSlotStr = `${timeSlot}-${String(parseInt(timeSlot.split(':')[0]) + 1).padStart(2, '0')}:00`;

  const availabilities = await TechnicianAvailability.find({
    technicianId: { $in: techIds },
    date: dateStr,
    timeSlots: { $elemMatch: { slot: timeSlotStr, status: "available" } }
  }).lean();
  
  console.log('  ✓ Technicians with availability for', timeSlotStr, 'on', dateStr, ':', availabilities.length);
  availabilities.forEach((avail, idx) => {
    const tech = technicians.find(t => String(t._id) === String(avail.technicianId));
    console.log(`    ${idx + 1}. ${tech?.Name || 'Unknown'} (ID: ${String(avail.technicianId).slice(-6)}) has slot available`);
  });
  
  const availableTechIds = new Set(availabilities.map(a => String(a.technicianId)));
  const eligible = technicians.filter(t => availableTechIds.has(String(t._id)));
  return eligible;
}

// Helper: Calculate distance between two lat/lng points in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// REUSABLE REFUND & EMAIL FUNCTIONS
// ============================================================================

async function processBookingRefund({ bookingId, paymentId, customerId, reason = "ManualCancel" }) {
  try {
    const payment = await (await import('../models/CustomerPayment.js')).default.findById(paymentId);
    if (!payment) {
      console.error('⚠️ Payment not found for refund:', paymentId);
      return { success: false, error: 'Payment not found' };
    }

    // Only refund if payment is authorized
    if (payment.Status !== 'Authorized') {
      console.log(`⚠️ Payment status is ${payment.Status}, skipping refund`);
      return { success: false, error: `Cannot refund payment with status: ${payment.Status}` };
    }

    // Step 1: Capture payment first
    if (payment.RazorpayPaymentID) {
      console.log(`💳 Capturing payment for refund: ${payment.RazorpayPaymentID}`);
      const captureResult = await captureRazorpayPayment(payment.RazorpayPaymentID, payment.Amount * 100);
      if (!captureResult.success) {
        console.error('❌ Failed to capture payment:', captureResult.error);
        return { success: false, error: captureResult.error };
      }
    }

    // Step 2: Refund the payment
    console.log(`♻️ Refunding payment: ${payment.RazorpayPaymentID}`);
    const refundResult = await refundRazorpayPayment(payment.RazorpayPaymentID);
    if (!refundResult.success) {
      console.error('❌ Failed to refund payment:', refundResult.error);
      return { success: false, error: refundResult.error };
    }

    // Step 3: Create refund record
    const refund = await Refund.create({
      BookingID: bookingId,
      CustomerID: customerId,
      PaymentID: paymentId,
      Amount: payment.Amount,
      Status: 'Processing',
      RazorpayRefundID: refundResult.data?.id,
      CancellationReason: reason
    });

    // Step 4: Update payment status
    payment.Status = 'Refunded';
    await payment.save();

    console.log(`✅ Refund processed successfully: ${refund._id}`);
    return { success: true, refund };

  } catch (err) {
    console.error('❌ Error in processBookingRefund:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send booking cancellation + refund email
 * Reusable for all cancellation types
 */
async function sendCancellationRefundEmail({ customer, booking, payment, reason = "ManualCancel" }) {
  try {
    if (!customer?.Email) {
      console.warn('⚠️ Customer email not found, skipping email');
      return;
    }

    const SENDER_NAME = process.env.SENDER_NAME || "Technosys";
    const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@technosys.local';
    const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;

    const customerName = `${customer.FirstName || ''} ${customer.LastName || ''}`.trim() || 'Valued Customer';
    const amountDisplay = `₹${(payment?.Amount || 0).toFixed(2)}`;

    const reasonTexts = {
      ManualCancel: "You cancelled your booking",
      AutoCancelNoAcceptance: "Your booking was automatically cancelled due to no technician acceptance within 10 minutes",
      AutoCancelNoArrival: "Your booking was automatically cancelled because the technician did not arrive on time"
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Cancelled - Refund Initiated</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px 16px 0 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
                      <span style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 1px;">BOOKING CANCELLED</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Refund Initiated</h1>
                    <p style="margin: 10px 0 0; color: #fef3c7; font-size: 16px;">Your refund has been processed</p>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Dear ${customerName},</p>
                    <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">${reasonTexts[reason] || reasonTexts.ManualCancel}. Your refund has been initiated.</p>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; margin: 30px 0;">
                      <tr>
                        <td style="padding: 25px;">
                          <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Refund Details</p>
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Refund Amount:</td>
                              <td style="padding: 8px 0; color: #14532d; font-size: 14px; font-weight: 600; text-align: right;">${amountDisplay}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
                              <td style="padding: 8px 0; color: #f59e0b; font-size: 14px; font-weight: 700; text-align: right;">PROCESSING</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; margin: 25px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 700;"><span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #3b82f6; color: #ffffff; border-radius: 50%; font-size: 12px; font-weight: 900; margin-right: 8px;">i</span>Refund Information</p>
                          <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">Your refund will be credited to your original payment method within 5-7 business days. You will receive a separate confirmation email once the refund is completed.</p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 25px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">If you have any questions, please contact our support team.</p>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px;">© ${new Date().getFullYear()} Technosys. All rights reserved.</p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">Quality home services at your doorstep</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      replyTo: REPLY_TO,
      to: customer.Email,
      subject: 'Booking Cancelled - Refund Initiated - Technosys',
      html
    });

    console.log(`📧 Cancellation refund email sent to ${customer.Email}`);
  } catch (err) {
    console.error('❌ Error sending cancellation refund email:', err.message);
  }
}

export async function createBooking(req, res) {
  try {
    const customerId = req.userId || req.user?._id || req.body.CustomerID;
    const { SubCategoryID, Date: bookingDate, TimeSlot } = req.body;

    if (!bookingDate || !TimeSlot) {
      return res.status(400).json({ success: false, message: "Date and TimeSlot are required" });
    }
    // Ensure customer has an address
    const customer = await Customer.findById(customerId).lean();
    if (!customer || !customer.Address || !customer.Address.houseNumber || !customer.Address.pincode) {
      return res.status(400).json({ success: false, message: "Please set your address before booking." });
    }
    if (!customer.Email) {
      return res.status(400).json({ success: false, message: "Please set your email before booking." });
    }
    // Check for duplicate booking: same customer, service, date, time with active status
    // Normalize date to start of day for comparison
    const bookingDateObj = new Date(bookingDate);
    const startOfDay = new Date(bookingDateObj.getFullYear(), bookingDateObj.getMonth(), bookingDateObj.getDate());
    const endOfDay = new Date(bookingDateObj.getFullYear(), bookingDateObj.getMonth(), bookingDateObj.getDate(), 23, 59, 59, 999);
    
    console.log('🔍 Duplicate check - CustomerID:', customerId, 'SubCategoryID:', SubCategoryID, 'Date:', startOfDay.toISOString(), 'TimeSlot:', TimeSlot);
    
    const now = new Date();
    const existingBooking = await Booking.findOne({
      CustomerID: customerId,
      SubCategoryID: SubCategoryID,
      Date: { $gte: startOfDay, $lte: endOfDay },
      TimeSlot: TimeSlot,
      Status: { $in: ["Pending", "Confirmed"] },
      // Exclude bookings that have expired (past AutoCancelAt time)
      $or: [
        { AutoCancelAt: null },
        { AutoCancelAt: { $gt: now } }
      ]
    }).lean();

    console.log('🔍 Existing booking found:', existingBooking ? `Yes - ID: ${existingBooking._id}, Status: ${existingBooking.Status}, AutoCancelAt: ${existingBooking.AutoCancelAt}` : 'No');

    if (existingBooking) {
      return res.status(400).json({ 
        success: false, 
        message: "You already have an active booking for this service at the same date and time. Please choose a different time slot or wait for your current booking to complete."
      });
    }

    const booking = await Booking.create({
      CustomerID: customerId,
      SubCategoryID,
      Date: new Date(bookingDate),
      TimeSlot,
      Status: "Pending",
      AutoCancelAt: null,
      PaymentID: req.body.PaymentID || null, // Link payment if provided
    });

    // If payment is provided, link booking to payment record
    if (req.body.PaymentID) {
      const CustomerPayment = (await import('../models/CustomerPayment.js')).default;
      await CustomerPayment.findByIdAndUpdate(req.body.PaymentID, {
        BookingID: booking._id,
      });
    }

    // Create a paired service request document (empty details for now)
    await ServiceRequest.create({ BookingID: booking._id });

    res.json({ success: true, data: booking });
  } catch (err) {
    console.error("createBooking error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

export async function precheckAvailability(req, res) {
  try {
    const { CustomerID, SubCategoryID, Date: bookingDate, TimeSlot } = req.body;
    
    if (!CustomerID || !SubCategoryID || !bookingDate || !TimeSlot) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    
    const customer = await Customer.findById(CustomerID).lean();
    if (!customer) {
      return res.status(400).json({ success: false, message: "Customer not found" });
    }
    
    if (!customer.location || !Array.isArray(customer.location.coordinates)) {
      return res.status(400).json({ success: false, message: "Please update your profile with your location to find nearby technicians" });
    }
    
    // Infer service category from subcategory
    const sub = await SubServiceCategory.findById(SubCategoryID).lean();
    const serviceCategoryId = sub?.serviceCategoryId || sub?.CategoryID || sub?.ServiceCategoryID || null;
    if (!serviceCategoryId) {
      console.error('SubCategory lookup failed or missing serviceCategoryId:', sub);
      return res.status(400).json({ success: false, message: "Invalid service category. Please contact support." });
    }
    
    const eligible = await findEligibleTechnicians({ coords: customer.location.coordinates, radiusKm: 5, serviceCategoryId, date: bookingDate, timeSlot: TimeSlot });
    if (!eligible.length) {
      return res.json({ success: false, message: "No technician available for the selected time. Please change date or location." });
    }
    res.json({ success: true, technicians: eligible });
  } catch (err) {
    console.error("precheckAvailability error", err);
    res.status(500).json({ success: false, message: "Internal error: " + err.message });
  }
}

export async function customerBookingPayment(req, res) {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId)
      .populate('SubCategoryID', 'name price')
      .populate('CustomerID', 'FirstName LastName Email MobileNumber');
    
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    
    const amount = booking.SubCategoryID?.price || 0;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid service price" });
    }

    // Import payment service
    const { createRazorpayOrder } = await import('../services/payment.service.js');
    const CustomerPayment = (await import('../models/CustomerPayment.js')).default;

    // Create payment record
    const paymentRecord = await CustomerPayment.create({
      BookingID: booking._id,
      CustomerID: booking.CustomerID._id,
      Amount: amount,
      Method: 'Other',
      Status: 'Pending',
    });

    // Create Razorpay order with authorization (payment_capture: 0)
    const razorpayOrder = await createRazorpayOrder({
      amount: amount * 100,
      currency: 'INR',
      receipt: `booking_${booking._id}`,
      payment_capture: 0,
    });

    // Update payment record with Razorpay order ID
    paymentRecord.RazorpayOrderID = razorpayOrder.id;
    await paymentRecord.save();

    // Return payment details to frontend
    res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: amount,
      paymentId: paymentRecord._id,
    });
  } catch (err) {
    console.error("customerBookingPayment error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

export async function broadcastBooking(req, res) {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    
    // Find eligible technicians using customer's location and category inferred from subcategory
    const customer = await Customer.findById(booking.CustomerID).lean();
    if (!customer || !customer.location || !Array.isArray(customer.location.coordinates)) {
      return res.status(400).json({ success: false, message: "Customer location required" });
    }
    
    const sub = await SubServiceCategory.findById(booking.SubCategoryID).lean();
    const serviceCategoryId = sub?.serviceCategoryId || sub?.CategoryID || sub?.ServiceCategoryID || null;
    
    const eligible = await findEligibleTechnicians({ coords: customer.location.coordinates, radiusKm: 5, serviceCategoryId, date: booking.Date, timeSlot: booking.TimeSlot });

    if (!eligible.length) {
      return res.status(400).json({ success: false, message: "No technicians available" });
    }

    // Update service request with broadcast technicians
    const techIds = eligible.map(t => t._id);
    console.log('💾 Saving broadcast technicians:', techIds.length, 'IDs:', techIds.map(id => String(id).slice(-6)));
    
    const serviceRequest = await ServiceRequest.findOne({ BookingID: booking._id });
    if (serviceRequest) {
      serviceRequest.BroadcastTechnicians = techIds;
      await serviceRequest.save();
      console.log('✅ ServiceRequest saved. BroadcastTechnicians:', serviceRequest.BroadcastTechnicians.length);
    } else {
      console.log('❌ ServiceRequest not found for booking:', booking._id);
    }
    
    booking.AutoCancelAt = new Date(Date.now() + 10 * 60 * 1000);
    await booking.save();

    // Schedule the exact auto-cancellation time
    scheduleAutoCancellation(booking._id, booking.AutoCancelAt);

    // Emit socket event to all matched technicians
    const io = getIo();
    console.log('📡 Broadcasting to', eligible.length, 'technicians via socket...');
    eligible.forEach((t, idx) => {
      const techId = String(t._id);
      const payload = { 
        bookingId: String(booking._id), 
        customerId: String(booking.CustomerID), 
        date: booking.Date, 
        timeSlot: booking.TimeSlot 
      };
      console.log(`  ${idx + 1}. Emitting to ${t.Name} (ID: ${techId.slice(-6)})`);
      io.to(techId).emit("new-booking-request", payload);
    });

    res.json({ success: true, technicians: eligible.length });
  } catch (err) {
    console.error("broadcastBooking error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

/**
 * Capture authorized payment and send confirmation email with invoice
 * Reusable helper for payment capture workflow
 */
async function captureAndEmailPayment(booking) {
  try {
    // Import required modules
    const { generateInvoice } = await import('../services/invoice.service.js');
    const CustomerPayment = (await import('../models/CustomerPayment.js')).default;

    // Populate required fields
    const fullBooking = await Booking.findById(booking._id)
      .populate('PaymentID')
      .populate('SubCategoryID', 'name price')
      .populate('CustomerID', 'FirstName LastName Email MobileNumber')
      .populate('TechnicianID', 'Name Email MobileNumber');

    if (!fullBooking || !fullBooking.PaymentID) {
      console.log('⚠️ No payment found for booking, skipping capture');
      return;
    }

    const payment = fullBooking.PaymentID;

    // Check if payment is authorized
    if (payment.Status !== 'Authorized') {
      console.log(`⚠️ Payment status is ${payment.Status}, not Authorized. Skipping capture.`);
      return;
    }

    // Capture payment using Razorpay API
    if (payment.RazorpayPaymentID) {
      const captureResult = await captureRazorpayPayment(
        payment.RazorpayPaymentID,
        payment.Amount * 100 // Convert to paise
      );

      if (!captureResult.success) {
        console.error('❌ Failed to capture payment:', captureResult.error);
        throw new Error(`Payment capture failed: ${captureResult.error}`);
      }

      console.log(`✅ Payment captured successfully for booking ${booking._id}`);
    }

    // Update payment status to Captured
    payment.Status = 'Captured';
    await payment.save();

    // Generate invoice
    const invoiceDoc = await generateInvoice({
      refType: 'CustomerPayment',
      refId: payment._id,
      paymentRecord: payment,
      subscriptionPackage: {
        name: fullBooking.SubCategoryID?.name || 'Service Booking',
        price: payment.Amount,
        coins: 1,
      },
      recipient: {
        Name: `${fullBooking.CustomerID?.FirstName || ''} ${fullBooking.CustomerID?.LastName || ''}`.trim(),
        Email: fullBooking.CustomerID?.Email,
        MobileNumber: fullBooking.CustomerID?.MobileNumber,
      },
    });

    // Send payment charged email with invoice
    const SENDER_NAME = process.env.SENDER_NAME || 'Technosys';
    const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@technosys.local';
    const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;

    if (fullBooking.CustomerID?.Email) {
      const customerName = `${fullBooking.CustomerID.FirstName || ''} ${fullBooking.CustomerID.LastName || ''}`.trim() || 'Valued Customer';
      const serviceName = fullBooking.SubCategoryID?.name || 'Service';
      const technicianName = fullBooking.TechnicianID?.Name || 'Technician';

      // Read invoice PDF as Buffer for email attachment
      let invoiceBuffer = null;
      if (invoiceDoc?.invoice_pdf) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const invoicePath = path.join(process.cwd(), invoiceDoc.invoice_pdf);
          invoiceBuffer = fs.readFileSync(invoicePath);
        } catch (readErr) {
          console.error('⚠️ Failed to read invoice PDF:', readErr.message);
        }
      }

      await transporter.sendMail({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        replyTo: REPLY_TO,
        to: fullBooking.CustomerID.Email,
        subject: 'Payment Charged - Booking Confirmed - Technosys',
        attachments: invoiceBuffer ? [{ filename: 'invoice.pdf', content: invoiceBuffer }] : [],
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Charged</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 30px; text-align: center;">
                        <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
                          <span style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 1px;">✓ PAYMENT CHARGED</span>
                        </div>
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Booking Confirmed!</h1>
                        <p style="margin: 10px 0 0; color: #d1fae5; font-size: 16px;">Your technician is on the way</p>
                      </td>
                    </tr>
                  </table>
                  
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Dear ${customerName},</p>
                        <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Great news! ${technicianName} has accepted your ${serviceName} booking. Your payment has been successfully charged, and your service is confirmed.</p>
                        
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; margin: 30px 0;">
                          <tr>
                            <td style="padding: 25px;">
                              <p style="margin: 0 0 12px; color: #166534; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Payment Confirmed</p>
                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Service:</td>
                                  <td style="padding: 8px 0; color: #14532d; font-size: 14px; font-weight: 600; text-align: right;">${serviceName}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Amount Charged:</td>
                                  <td style="padding: 8px 0; color: #14532d; font-size: 14px; font-weight: 600; text-align: right;">₹${payment.Amount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Technician:</td>
                                  <td style="padding: 8px 0; color: #14532d; font-size: 14px; font-weight: 600; text-align: right;">${technicianName}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Status:</td>
                                  <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 700; text-align: right;">CHARGED</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; margin: 25px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 700;"><span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #3b82f6; color: #ffffff; border-radius: 50%; font-size: 12px; font-weight: 900; margin-right: 8px;">i</span>Next Steps</p>
                              <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">Your technician will arrive during the scheduled time slot. Please keep the arrival OTP ready to verify their identity. You can find the OTP in your app notifications.</p>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 25px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">Your invoice is attached to this email for your records.</p>
                      </td>
                    </tr>
                  </table>
                  
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px;">© ${new Date().getFullYear()} Technosys. All rights reserved.</p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">Quality home services at your doorstep</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      console.log(`📧 Payment capture confirmation email sent to ${fullBooking.CustomerID.Email}`);
    }
  } catch (err) {
    console.error('❌ Error in captureAndEmailPayment:', err);
    throw err;
  }
}

/**
 * Queue payment capture in background (non-blocking)
 * Saves failures to database for hourly retry
 */
function queuePaymentCapture(bookingId, paymentId) {
  setImmediate(async () => {
    try {
      // Fetch booking with all required populated fields
      const booking = await Booking.findById(bookingId)
        .populate('PaymentID')
        .populate('SubCategoryID', 'name price')
        .populate('CustomerID', 'FirstName LastName Email MobileNumber')
        .populate('TechnicianID', 'Name Email MobileNumber');

      if (!booking) {
        console.error('⚠️ Booking not found for payment capture:', bookingId);
        return;
      }

      // Check if payment already captured
      if (booking.PaymentID?.Status === 'Captured') {
        console.log('✅ Payment already captured, removing from failed queue');
        await FailedPaymentOperation.deleteOne({ bookingId });
        return;
      }

      // Execute payment capture
      await captureAndEmailPayment(booking);
      
      console.log(`✅ Background payment capture successful: ${bookingId}`);
      
      // Success - remove from failed operations table
      await FailedPaymentOperation.deleteOne({ bookingId });
      
    } catch (error) {
      console.error(`❌ Background payment capture failed: ${bookingId}`, error.message);
      
      // Determine which step failed
      let failedStep = 'unknown';
      if (error.message?.includes('payment') || error.message?.includes('Razorpay')) {
        failedStep = 'payment';
      } else if (error.message?.includes('invoice')) {
        failedStep = 'invoice';
      } else if (error.message?.includes('email') || error.message?.includes('mail')) {
        failedStep = 'email';
      }
      
      // Save failure to database for retry
      await FailedPaymentOperation.findOneAndUpdate(
        { bookingId },
        {
          bookingId,
          paymentId,
          errorMessage: error.message,
          failedStep,
          status: 'pending',
          lastRetryAt: new Date(),
          $inc: { retryCount: 1 }
        },
        { upsert: true, new: true }
      );
    }
  });
}

export async function acceptBooking(req, res) {
  try {
    const { bookingId } = req.body;
    const technicianId = req.userId || req.user?._id || req.body.TechnicianID;

    const booking = await Booking.findById(bookingId).populate('SubCategoryID');
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.Status !== "Pending") return res.status(400).json({ success: false, message: "Booking already processed" });

    // Get coins required for this service
    const coinsRequired = booking.SubCategoryID?.coinsRequired || 0;

    // Check technician wallet balance
    let wallet = await TechnicianWallet.findOne({ TechnicianID: technicianId });
    if (!wallet) {
      // Create wallet if doesn't exist
      wallet = await TechnicianWallet.create({ TechnicianID: technicianId, BalanceCoins: 0 });
    }

    // Check if technician has enough coins
    if (wallet.BalanceCoins < coinsRequired) {
      return res.status(400).json({ 
        success: false, 
        message: "Insufficient coins. Please purchase a subscription to continue.",
        insufficientCoins: true,
        requiredCoins: coinsRequired,
        currentBalance: wallet.BalanceCoins
      });
    }

    // Deduct coins from wallet
    wallet.BalanceCoins -= coinsRequired;
    wallet.LastUpdate = new Date();
    await wallet.save();

    // Notify technician when balance is low (<= 10)
    if (wallet.BalanceCoins <= 10) {
      try {
        const technician = await Technician.findById(technicianId).lean();
        if (technician?.Email) {
          await sendLowBalanceEmail({
            email: technician.Email,
            name: technician.Name || 'Technician',
            balance: wallet.BalanceCoins,
          });
        }
      } catch (lowBalErr) {
        console.error('Low balance email failed:', lowBalErr.message);
      }
    }

    // Update booking status
    booking.Status = "Confirmed";
    booking.TechnicianID = technicianId;
    booking.AcceptedAt = new Date();
    
    // Queue payment capture in background (non-blocking)
    queuePaymentCapture(booking._id, booking.PaymentID);
    console.log(`🔄 Queued payment capture for booking ${booking._id}`);
    
    // Set arrival deadline: technician must arrive within the time slot
    // Parse the time slot and booking date to create the deadline
    const bookingDate = new Date(booking.Date);
    const [startHour] = booking.TimeSlot.split(':').map(Number);
    const endHour = startHour + 1;
    
    // Set deadline to end of time slot (e.g., if slot is 18:00, deadline is 19:00)
    const arrivalDeadline = new Date(bookingDate);
    arrivalDeadline.setHours(endHour, 0, 0, 0);
    
    booking.ArrivalDeadline = arrivalDeadline;
    await booking.save();

    console.log(`[ARRIVAL] Set arrival deadline for booking ${booking._id}: ${arrivalDeadline.toISOString()}`);

    // Cancel the scheduled auto-cancellation since booking is now confirmed
    cancelScheduledAutoCancellation(booking._id);
    
    // Schedule arrival deadline cancellation
    scheduleArrivalDeadlineCancellation(booking._id, arrivalDeadline);

    // Update technician's availability slot to "booked"
    try {
      const dateStr = new Date(booking.Date).toISOString().split('T')[0];

      // Normalize slot string: booking.TimeSlot may be '08:00' or '08:00-09:00'
      let timeSlotStr = booking.TimeSlot;
      if (!String(timeSlotStr).includes('-')) {
        const startHour = parseInt(String(timeSlotStr).split(':')[0], 10);
        const nextHour = String(startHour + 1).padStart(2, '0');
        timeSlotStr = `${timeSlotStr}-${nextHour}:00`;
      }

      let availability = await TechnicianAvailability.findOne({ technicianId: technicianId, date: dateStr });
      if (availability) {
        const slotIndex = availability.timeSlots.findIndex(slot => slot.slot === timeSlotStr);
        if (slotIndex !== -1) {
          availability.timeSlots[slotIndex].status = "booked";
        } else {
          availability.timeSlots.push({ slot: timeSlotStr, status: "booked" });
        }
        await availability.save();
        console.log(`✅ Marked time slot ${timeSlotStr} as booked for technician ${technicianId}`);
      } else {
        await TechnicianAvailability.create({ technicianId: technicianId, date: dateStr, timeSlots: [{ slot: timeSlotStr, status: "booked" }] });
        console.log(`✅ Created availability and marked ${timeSlotStr} as booked for technician ${technicianId}`);
      }

      // Emit availability update so front-end can refresh and lock UI
      try {
        const io = getIo();
        io.to(String(technicianId)).emit('availability-updated', { date: dateStr, slot: timeSlotStr, status: 'booked' });
      } catch (emitErr) {
        console.error('Failed to emit availability update:', emitErr);
      }
    } catch (err) {
      console.error('Failed to update technician availability:', err);
      // Don't fail the booking acceptance if availability update fails
    }

    const io = getIo();
    
    // Notify the customer that their booking was accepted
    const customerId = String(booking.CustomerID);
    io.to(customerId).emit("booking-accepted", { 
      bookingId: String(booking._id), 
      technicianId: String(technicianId),
      status: "Confirmed"
    });
    
    // Notify all other technicians to remove the request via ServiceRequest broadcast list
    const serviceRequest = await ServiceRequest.findOne({ BookingID: booking._id }).lean();
    console.log('\n📡 Broadcasting booking-request-closed event');
    console.log('   Booking ID:', String(booking._id));
    console.log('   Accepted by technician:', String(technicianId).slice(-6));
    console.log('   Total broadcast technicians:', serviceRequest?.BroadcastTechnicians?.length || 0);
    console.log('   Full technician IDs:', JSON.stringify(serviceRequest?.BroadcastTechnicians?.map(t => String(t)) || []));
    
    const otherTechnicians = (serviceRequest?.BroadcastTechnicians || []).filter(
      tid => String(tid) !== String(technicianId)
    );
    
    console.log(`   Broadcasting to ${otherTechnicians.length} other technician(s)`);
    
    otherTechnicians.forEach((tid, idx) => {
      const techIdStr = String(tid);
      console.log(`   ${idx + 1}. Emitting to technician ${techIdStr.slice(-6)} (Full: ${techIdStr})`);
      io.to(techIdStr).emit("booking-request-closed", { 
        bookingId: String(booking._id),
        serviceRequestId: String(serviceRequest._id)
      });
    });
    
    console.log('✅ Broadcast complete\n');

    // Auto-create chat for this booking  7-day grace period)
    try {
      const existingChat = await Chat.findOne({ BookingID: booking._id });
      if (!existingChat) {
        const newChat = await Chat.create({
          BookingID: booking._id,
          CustomerID: booking.CustomerID,
          TechnicianID: technicianId,
        });
        console.log(`💬 Created chat for booking ${booking._id}: Chat ID ${newChat._id}`);
        
        // Notify both parties that chat is available
        io.to(customerId).emit("chat-available", { 
          bookingId: String(booking._id),
          chatId: String(newChat._id) 
        });
        io.to(String(technicianId)).emit("chat-available", { 
          bookingId: String(booking._id),
          chatId: String(newChat._id) 
        });
      }
    } catch (chatErr) {
      console.error('Failed to create chat for booking:', chatErr);
      // Don't fail the booking acceptance if chat creation fails
    }

    res.json({ 
      success: true, 
      data: booking,
      coinsDeducted: coinsRequired,
      newBalance: wallet.BalanceCoins
    });
  } catch (err) {
    console.error("acceptBooking error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

// Helper to generate 6-digit OTP
function generateSixDigitOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Helper: send low balance notification to technician
async function sendLowBalanceEmail({ email, name, balance }) {
  const SENDER_NAME = process.env.SENDER_NAME || 'Technosys';
  const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@technosys.local';
  const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;
  const subscriptionUrl = process.env.SUBSCRIPTION_URL || 'http://localhost:5175/technician/subscription';

  const safeName = name || 'Technician';
  const balanceDisplay = `₹${(Number(balance) || 0).toFixed(2)}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Low Balance Alert</title>
</head>
<body style="margin:0; padding:0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color:#f3f4f6;">
  <table role="presentation" style="width:100%; border-collapse:collapse; background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" style="width:100%; max-width:600px; border-collapse:collapse; background:linear-gradient(135deg,#0ea5e9 0%, #0284c7 100%); border-radius:14px 14px 0 0; overflow:hidden; box-shadow:0 8px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 28px; text-align:center; color:#fff;">
              <div style="font-size:14px; letter-spacing:0.5px; opacity:0.9;">ACCOUNT NOTICE</div>
              <h1 style="margin:10px 0 0; font-size:26px; font-weight:700;">Low Wallet Balance</h1>
              <p style="margin:10px 0 0; font-size:16px; opacity:0.9;">Your coin balance is running low</p>
            </td>
          </tr>
        </table>
        <table role="presentation" style="width:100%; max-width:600px; border-collapse:collapse; background-color:#ffffff; box-shadow:0 8px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 28px; color:#111827;">
              <p style="margin:0 0 16px; font-size:16px;">Hi ${safeName},</p>
              <p style="margin:0 0 18px; font-size:15px; color:#374151;">Your wallet balance is low. Please purchase a subscription or top up coins to continue accepting bookings without interruption.</p>
              <table role="presentation" style="width:100%; border-collapse:collapse; background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; margin:18px 0;">
                <tr>
                  <td style="padding:18px;">
                    <div style="font-size:13px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Current Balance</div>
                    <div style="margin-top:8px; font-size:20px; font-weight:700; color:#0ea5e9;">${balanceDisplay}</div>
                  </td>
                </tr>
              </table>
              <div style="text-align:center; margin:22px 0 10px;">
                <a href="${subscriptionUrl}" style="display:inline-block; background-color:#0ea5e9; color:#fff; text-decoration:none; padding:12px 22px; border-radius:10px; font-weight:700; box-shadow:0 4px 12px rgba(14,165,233,0.35);">Purchase Subscription</a>
              </div>
              <p style="margin:20px 0 0; font-size:13px; color:#6b7280; text-align:center;">Keep your balance above 10 coins to avoid disruptions.</p>
            </td>
          </tr>
        </table>
        <table role="presentation" style="width:100%; max-width:600px; border-collapse:collapse; background-color:#ffffff; border-radius:0 0 14px 14px; box-shadow:0 8px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:18px 24px; text-align:center; color:#9ca3af; font-size:12px; border-top:1px solid #e5e7eb;">© ${new Date().getFullYear()} Technosys. All rights reserved.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    replyTo: REPLY_TO,
    to: email,
    subject: 'Low Wallet Balance - Please purchase a subscription',
    html,
  });
}

export async function generateArrivalOTP(req, res) {
  try {
    const { bookingId } = req.body;
    const technicianId = req.userId || req.user?._id;
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (String(booking.TechnicianID) !== String(technicianId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (booking.Status !== "Confirmed") {
      return res.status(400).json({ success: false, message: "Only confirmed bookings can start" });
    }

    const otp = generateSixDigitOTP();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    // Check if OTP already exists for this booking and purpose
    const existingOTP = await BookingArrivalOTP.findOne({
      BookingID: booking._id,
      purpose: "arrival",
    }).sort({ createdAt: -1 });

    if (existingOTP) {
      // Update existing OTP record
      existingOTP.otp = otp;
      existingOTP.expiresAt = expiresAt;
      existingOTP.isUsed = false;
      await existingOTP.save();
    } else {
      // Create new OTP record
      await BookingArrivalOTP.create({
        BookingID: booking._id,
        TechnicianID: booking.TechnicianID,
        CustomerID: booking.CustomerID,
        otp,
        expiresAt,
        purpose: "arrival",
      });
    }

    // Send email to customer
    try {
      const customer = await Customer.findById(booking.CustomerID).lean();
      const email = customer?.Email;
      if (email) {
        const SENDER_NAME = process.env.SENDER_NAME || "Technosys";
        const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || "no-reply@technosys.local";
        const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;

        await transporter.sendMail({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          replyTo: REPLY_TO,
          to: email,
          subject: "Your Service Arrival OTP - Technosys",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Service Arrival OTP</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                          <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
                            <span style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 1px;">● SERVICE ARRIVAL</span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Technician Arrived!</h1>
                          <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">Your service is about to start</p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                      <!-- Body -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello,</p>
                          <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Your technician has arrived at your location and is ready to begin the service. Please share the OTP below to confirm their arrival and start your service.</p>
                          
                          <!-- OTP Box -->
                          <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 12px; border: 3px dashed #667eea; margin: 30px 0;">
                            <tr>
                              <td style="padding: 30px; text-align: center;">
                                <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Arrival OTP</p>
                                <p style="margin: 0; color: #667eea; font-size: 48px; font-weight: 800; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                                <p style="margin: 15px 0 0; color: #9ca3af; font-size: 13px;">Valid for 2 minutes</p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Warning Box -->
                          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; margin: 25px 0;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="margin: 0 0 8px; color: #dc2626; font-size: 14px; font-weight: 700;"><span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #dc2626; color: #ffffff; border-radius: 50%; font-size: 12px; font-weight: 900; margin-right: 8px;">!</span>Important Security Notice</p>
                                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">Do NOT share this OTP unless the technician has physically reached your location. Sharing this OTP means your service has officially started and you confirm the technician's arrival. If you share this OTP with anyone else, we are not responsible for any unauthorized charges or services.</p>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">If you did not request this service or have any questions, please contact our support team immediately.</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Footer -->
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                      <tr>
                        <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px;">© ${new Date().getFullYear()} Technosys. All rights reserved.</p>
                          <p style="margin: 0; color: #9ca3af; font-size: 12px;">Quality home services at your doorstep</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });
        if (process.env.NODE_ENV === 'development') {
          console.log(`📧 Sent arrival OTP to ${email}. OTP: ${otp}`);
        }
      }
    } catch (mailErr) {
      console.warn("Failed to send arrival OTP email", mailErr);
    }

    return res.json({ success: true, expiresAt, message: "OTP sent to customer email" });
  } catch (err) {
    console.error("generateArrivalOTP error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

export async function verifyArrivalOTP(req, res) {
  try {
    const { bookingId, otp } = req.body;
    const technicianId = req.userId || req.user?._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (String(booking.TechnicianID) !== String(technicianId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Find latest valid OTP
    const record = await BookingArrivalOTP.findOne({
      BookingID: bookingId,
      purpose: "arrival",
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ success: false, message: "No active OTP found. Please resend." });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired. Please resend." });
    }
    if (String(record.otp) !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // Mark OTP used and update booking
    record.isUsed = true;
    await record.save();

    booking.Status = "In-Progress";
    booking.arrivalVerified = true;
    if (!booking.serviceStartedAt) {
      booking.serviceStartedAt = new Date();
    }
    await booking.save();

    // Cancel the scheduled arrival deadline cancellation since technician arrived
    cancelScheduledArrivalDeadline(booking._id);

    // Notify customer via socket
    const io = getIo();
    const customerId = String(booking.CustomerID);
    io.to(customerId).emit("service-started", {
      bookingId: String(booking._id),
      status: "In-Progress",
      message: "Technician has arrived and service is now in progress!"
    });

    return res.json({ success: true, message: "Arrival verified. Job started.", booking });
  } catch (err) {
    console.error("verifyArrivalOTP error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

export async function completeService(req, res) {
  try {
    const { bookingId } = req.body;
    const technicianId = req.userId || req.user?._id;

    const booking = await Booking.findById(bookingId)
      .populate('SubCategoryID', 'name price')
      .populate('CustomerID', 'FirstName LastName Email')
      .populate('TechnicianID', 'Name Email');
    
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    
    if (String(booking.TechnicianID._id) !== String(technicianId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (booking.Status !== "In-Progress") {
      return res.status(400).json({ success: false, message: "Only in-progress bookings can be completed" });
    }

    // Update booking status to Completed
    booking.Status = "Completed";
    booking.serviceCompletedAt = new Date();
    await booking.save();

    // Create AdminPayout Record
    const technicianAmount = booking.SubCategoryID?.price || 0;

    let payout;
    try {
      payout = await AdminPayout.create({
        BookingID: booking._id,
        TechnicianID: booking.TechnicianID._id,
        Amount: technicianAmount,
        Method: 'BankTransfer',
        Status: 'Pending'
      });
    } catch (payoutErr) {
      console.error('AdminPayout creation failed:', payoutErr.message);
      throw payoutErr;
    }

    // Generate Invoice
    let invoiceDoc;
    try {
      invoiceDoc = await generateInvoice({
        refType: 'AdminPayout',
        refId: payout._id,
        paymentRecord: {
          Amount: technicianAmount,
          _id: payout._id
        },
        subscriptionPackage: {
          name: booking.SubCategoryID?.name || 'Service Completion',
          price: technicianAmount,
          coins: 1,
        },
        recipient: {
          Name: booking.TechnicianID?.Name || 'Technician',
          Email: booking.TechnicianID?.Email,
        },
      });
    } catch (invoiceErr) {
      console.error('Invoice generation failed:', invoiceErr.message);
      throw invoiceErr;
    }

    // Send Email with Invoice
    if (booking.TechnicianID?.Email && invoiceDoc?.invoice_pdf) {
      try {
        const fs = (await import('fs')).default || (await import('fs'));
        const path = (await import('path')).default || (await import('path'));
        
        const SENDER_NAME = process.env.SENDER_NAME || 'Technosys';
        const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@technosys.local';
        const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;

        let invoiceBuffer = null;
        try {
          const invoicePath = path.join(process.cwd(), invoiceDoc.invoice_pdf);
          invoiceBuffer = fs.readFileSync(invoicePath);
        } catch (readErr) {
          console.error(`Could not read PDF: ${readErr.message}`);
        }

        const serviceName = booking.SubCategoryID?.name || 'Service';
        const customerName = `${booking.CustomerID?.FirstName || ''} ${booking.CustomerID?.LastName || ''}`.trim() || 'Customer';

        await transporter.sendMail({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          replyTo: REPLY_TO,
          to: booking.TechnicianID.Email,
          subject: 'Service Completed - Payment Invoice - Technosys',
          attachments: invoiceBuffer ? [{ filename: 'service-invoice.pdf', content: invoiceBuffer }] : [],
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Completed</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Payment Invoice</h1>
              <p style="margin: 10px 0 0; color: #d1fae5; font-size: 16px;">Your service earnings are ready</p>
            </td>
          </tr>
        </table>
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">Dear ${booking.TechnicianID.Name || 'Technician'},</p>
              <p style="margin: 0 0 30px; color: #374151; font-size: 16px;">Great job! You have successfully completed the service for ${customerName}. Your payment invoice is attached to this email.</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; margin: 30px 0;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 12px; color: #166534; font-size: 13px; font-weight: 600;">SERVICE DETAILS</p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Service:</td>
                        <td style="padding: 8px 0; color: #14532d; font-size: 14px; font-weight: 600; text-align: right;">${serviceName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Customer:</td>
                        <td style="padding: 8px 0; color: #14532d; font-size: 14px; font-weight: 600; text-align: right;">${customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Amount Earned:</td>
                        <td style="padding: 8px 0; color: #10b981; font-size: 16px; font-weight: 700; text-align: right;">₹${technicianAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 25px 0 0; color: #374151; font-size: 16px;">Your detailed invoice is attached for your records.</p>
            </td>
          </tr>
        </table>
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Technosys. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        });
      } catch (mailErr) {
        console.error('Email failed:', mailErr.message);
      }
    }

    // Send completion email to customer with feedback CTA
    if (booking.CustomerID?.Email) {
      try {
        const SENDER_NAME = process.env.SENDER_NAME || 'Technosys';
        const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@technosys.local';
        const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;
        const feedbackUrl = process.env.CUSTOMER_FEEDBACK_URL || 'http://localhost:5175/customer/bookings';

        const serviceName = booking.SubCategoryID?.name || 'Service';
        const technicianName = booking.TechnicianID?.Name || 'Technician';
        const customerName = `${booking.CustomerID?.FirstName || ''} ${booking.CustomerID?.LastName || ''}`.trim() || 'Customer';

        await transporter.sendMail({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          replyTo: REPLY_TO,
          to: booking.CustomerID.Email,
          subject: 'Your service is completed - share feedback',
          html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Completed</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color:#f3f4f6;">
  <table role="presentation" style="width:100%; border-collapse:collapse; background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" style="width:100%; max-width:600px; border-collapse:collapse; background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%); border-radius:14px 14px 0 0; overflow:hidden; box-shadow:0 10px 24px rgba(0,0,0,0.12);">
          <tr>
            <td style="padding:36px 28px; text-align:center; color:#fff;">
              <div style="font-size:13px; letter-spacing:0.5px; opacity:0.9; text-transform:uppercase;">Service Completed</div>
              <h1 style="margin:10px 0 0; font-size:26px; font-weight:700;">Thanks for choosing Technosys</h1>
              <p style="margin:8px 0 0; font-size:15px; opacity:0.9;">Tell us how the service went</p>
            </td>
          </tr>
        </table>
        <table role="presentation" style="width:100%; max-width:600px; border-collapse:collapse; background-color:#ffffff; box-shadow:0 10px 24px rgba(0,0,0,0.12);">
          <tr>
            <td style="padding:30px 26px; color:#111827;">
              <p style="margin:0 0 14px; font-size:16px;">Hi ${customerName},</p>
              <p style="margin:0 0 18px; font-size:15px; color:#374151; line-height:1.6;">Your service has been completed successfully. We hope ${technicianName} delivered a great experience for your ${serviceName.toLowerCase()} request. If anything feels off, you can share feedback or raise a complaint from the bookings page.</p>
              <table role="presentation" style="width:100%; border-collapse:collapse; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin:18px 0;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Summary</div>
                    <div style="margin-top:8px; font-size:15px; color:#0f172a;">Service: <strong>${serviceName}</strong></div>
                    <div style="margin-top:6px; font-size:15px; color:#0f172a;">Technician: <strong>${technicianName}</strong></div>
                  </td>
                </tr>
              </table>
              <div style="text-align:center; margin:20px 0 12px;">
                <a href="${feedbackUrl}" style="display:inline-block; background-color:#2563eb; color:#fff; text-decoration:none; padding:12px 22px; border-radius:12px; font-weight:700; box-shadow:0 4px 14px rgba(37,99,235,0.35);">Leave Feedback</a>
              </div>
              <p style="margin:16px 0 0; font-size:13px; color:#6b7280; text-align:center;">Your feedback helps us improve future services.</p>
            </td>
          </tr>
        </table>
        <table role="presentation" style="width:100%; max-width:600px; border-collapse:collapse; background-color:#ffffff; border-radius:0 0 14px 14px; box-shadow:0 10px 24px rgba(0,0,0,0.12);">
          <tr>
            <td style="padding:18px 24px; text-align:center; color:#9ca3af; font-size:12px; border-top:1px solid #e5e7eb;">© ${new Date().getFullYear()} Technosys. All rights reserved.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
        });
      } catch (customerMailErr) {
        console.error('Customer completion email failed:', customerMailErr.message);
      }
    }

    // Notify Customer via Socket
    try {
      const io = getIo();
      const customerId = String(booking.CustomerID._id);
      io.to(customerId).emit("service-completed", {
        bookingId: String(booking._id),
        message: "Your service has been completed successfully!"
      });
    } catch (socketErr) {
      console.error('Socket notification failed:', socketErr.message);
    }

    // Set chat to read-only immediately after service completion
    try {
      await Chat.setExpiryForBooking(booking._id);
      console.log(`💬 Chat set to read-only for completed booking ${booking._id}`);
    } catch (chatErr) {
      console.error('Failed to set chat expiry:', chatErr.message);
      // Non-critical, don't fail the completion
    }

    return res.json({ success: true, message: "Service completed successfully", booking });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ success: false, message: "Internal error: " + err.message });
  }
}

// Completion OTP flow: generate and verify
export async function generateCompletionOTP(req, res) {
  try {
    const { bookingId } = req.body;
    const technicianId = req.userId || req.user?._id;
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (String(booking.TechnicianID) !== String(technicianId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (booking.Status !== "In-Progress") {
      return res.status(400).json({ success: false, message: "Only in-progress bookings can be completed" });
    }

    const otp = generateSixDigitOTP();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    const existingOTP = await BookingArrivalOTP.findOne({
      BookingID: booking._id,
      purpose: "completion",
    }).sort({ createdAt: -1 });

    if (existingOTP) {
      existingOTP.otp = otp;
      existingOTP.expiresAt = expiresAt;
      existingOTP.isUsed = false;
      await existingOTP.save();
    } else {
      await BookingArrivalOTP.create({
        BookingID: booking._id,
        TechnicianID: booking.TechnicianID,
        CustomerID: booking.CustomerID,
        otp,
        expiresAt,
        purpose: "completion",
      });
    }

    // Send email to customer
    try {
      const customer = await Customer.findById(booking.CustomerID).lean();
      const email = customer?.Email;
      if (email) {
        const SENDER_NAME = process.env.SENDER_NAME || "Technosys";
        const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || "no-reply@technosys.local";
        const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;

        await transporter.sendMail({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          replyTo: REPLY_TO,
          to: email,
          subject: "Your Service Completion OTP - Technosys",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Service Completion OTP</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                          <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
                            <span style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 1px;">✓ SERVICE COMPLETION</span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Service Completion</h1>
                          <p style="margin: 10px 0 0; color: #d1fae5; font-size: 16px;">Confirm your work is complete</p>
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                      <!-- Body -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello,</p>
                          <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Your technician has requested confirmation to mark your service as completed. Please verify that all work has been done to your satisfaction before sharing the OTP below.</p>
                          
                          <!-- OTP Box -->
                          <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 12px; border: 3px dashed #10b981; margin: 30px 0;">
                            <tr>
                              <td style="padding: 30px; text-align: center;">
                                <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Completion OTP</p>
                                <p style="margin: 0; color: #10b981; font-size: 48px; font-weight: 800; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                                <p style="margin: 15px 0 0; color: #9ca3af; font-size: 13px;">Valid for 2 minutes</p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Critical Warning Box -->
                          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; margin: 25px 0;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="margin: 0 0 8px; color: #dc2626; font-size: 14px; font-weight: 700;"><span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #dc2626; color: #ffffff; border-radius: 50%; font-size: 12px; font-weight: 900; margin-right: 8px;">!</span>Critical: Read Before Sharing</p>
                                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5; font-weight: 500;">Share this OTP ONLY if your work is complete and you are satisfied with the service. Once shared, the service will be marked as completed and we cannot be held responsible for incomplete or unsatisfactory work.</p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Checklist Box -->
                          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; margin: 25px 0;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="margin: 0 0 12px; color: #166534; font-size: 14px; font-weight: 700;"><span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; background-color: #10b981; color: #ffffff; border-radius: 3px; font-size: 12px; font-weight: 900; margin-right: 8px;">✓</span>Before sharing the OTP, please verify:</p>
                                <ul style="margin: 0; padding-left: 20px; color: #15803d; font-size: 14px; line-height: 1.8; list-style: none;">
                                  <li style="padding-left: 0; position: relative;"><span style="color: #10b981; font-weight: 700; margin-right: 8px;">✓</span>All requested work has been completed</li>
                                  <li style="padding-left: 0; position: relative;"><span style="color: #10b981; font-weight: 700; margin-right: 8px;">✓</span>The quality meets your expectations</li>
                                  <li style="padding-left: 0; position: relative;"><span style="color: #10b981; font-weight: 700; margin-right: 8px;">✓</span>The work area has been cleaned</li>
                                  <li style="padding-left: 0; position: relative;"><span style="color: #10b981; font-weight: 700; margin-right: 8px;">✓</span>You have no remaining concerns</li>
                                </ul>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">If the work is incomplete or you have concerns, please do not share this OTP and contact our support team immediately.</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Footer -->
                    <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                      <tr>
                        <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px;">© ${new Date().getFullYear()} Technosys. All rights reserved.</p>
                          <p style="margin: 0; color: #9ca3af; font-size: 12px;">Quality home services at your doorstep</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });
        if (process.env.NODE_ENV === 'development') {
          console.log(`📧 Sent completion OTP to ${email}. OTP: ${otp}`);
        }
      }
    } catch (mailErr) {
      console.warn("Failed to send completion OTP email", mailErr);
    }

    return res.json({ success: true, expiresAt, message: "Completion OTP sent to customer email" });
  } catch (err) {
    console.error("generateCompletionOTP error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

export async function verifyCompletionOTP(req, res) {
  try {
    const { bookingId, otp } = req.body;
    const technicianId = req.userId || req.user?._id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    
    if (String(booking.TechnicianID) !== String(technicianId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    
    if (booking.Status !== "In-Progress") {
      return res.status(400).json({ success: false, message: "Only in-progress bookings can be completed" });
    }

    // Verify OTP
    const record = await BookingArrivalOTP.findOne({
      BookingID: bookingId,
      purpose: "completion",
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ success: false, message: "No active completion OTP found. Please resend." });
    }
    
    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired. Please resend." });
    }
    
    if (String(record.otp) !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // Mark OTP as used
    record.isUsed = true;
    await record.save();

    // Call completeService function to handle the rest
    req.body = { bookingId };
    await completeService(req, res);
  } catch (err) {
    console.error("verifyCompletionOTP error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

export async function autoCancelIfNoAcceptance(req, res) {
  try {
    const { bookingId } = req.body;
    console.log('🕒 Auto-cancel check called for booking:', bookingId);
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.log('❌ Booking not found:', bookingId);
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    console.log('📋 Booking status:', booking.Status, '| AutoCancelAt:', booking.AutoCancelAt, '| Current time:', new Date(), '| Expired:', booking.AutoCancelAt ? Date.now() >= booking.AutoCancelAt.getTime() : 'No AutoCancelAt');

    if (booking.Status === "Pending" && booking.AutoCancelAt && Date.now() >= booking.AutoCancelAt.getTime()) {
      console.log('🔄 Updating booking status to AutoCancelled...');
      booking.Status = "AutoCancelled";
      await booking.save();
      console.log('✅ Database updated - Status is now:', booking.Status);
      
      const io = getIo();
      const serviceRequest = await ServiceRequest.findOne({ BookingID: booking._id }).lean();
      
      // Notify all technicians to remove the request
      (serviceRequest?.BroadcastTechnicians || []).forEach(tid => {
        io.to(String(tid)).emit("booking-request-closed", { bookingId: String(booking._id) });
      });
      
      // Notify customer about auto-cancellation
      const customerId = String(booking.CustomerID);
      io.to(customerId).emit("booking-auto-cancelled", { 
        bookingId: String(booking._id),
        message: "Your booking was automatically cancelled due to no technician acceptance within 10 minutes."
      });
      
      return res.json({ success: true, message: "Booking auto-cancelled. Refund will be processed." });
    }

    console.log('⏳ Still waiting - not ready for auto-cancel yet');
    res.json({ success: true, message: "Still waiting" });
  } catch (err) {
    console.error("autoCancelIfNoAcceptance error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

export async function getBookingById(req, res) {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).lean();
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, booking });
  } catch (err) {
    console.error("getBookingById error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

export async function cancelBooking(req, res) {
  try {
    const { bookingId } = req.body;
    const customerId = req.userId || req.user?._id || req.body.CustomerID;

    const booking = await Booking.findById(bookingId)
      .populate('CustomerID', 'FirstName LastName Email');
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    
    // Check if booking belongs to customer
    if (String(booking.CustomerID._id) !== String(customerId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Check if already cancelled or confirmed
    if (booking.Status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Booking already cancelled" });
    }
    if (booking.Status === "Confirmed") {
      return res.status(400).json({ success: false, message: "Cannot cancel confirmed booking" });
    }

    // Check 10-minute window
    const createdTime = new Date(booking.createdAt).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    if (now - createdTime > tenMinutes) {
      return res.status(400).json({ success: false, message: "Cancellation window (10 minutes) has expired" });
    }

    // Cancel booking
    booking.Status = "Cancelled";
    await booking.save();

    // Cancel the scheduled auto-cancellation since customer manually cancelled
    cancelScheduledAutoCancellation(booking._id);

    // Notify technicians to close the request
    const io = getIo();
    const serviceRequest = await ServiceRequest.findOne({ BookingID: booking._id }).lean();
    (serviceRequest?.BroadcastTechnicians || []).forEach(tid => {
      io.to(String(tid)).emit("booking-request-closed", { bookingId: booking._id });
    });

    // Process refund if payment was authorized
    if (booking.PaymentID) {
      console.log(`💳 Processing refund for manual cancellation...`);
      const refundResult = await processBookingRefund({
        bookingId: booking._id,
        paymentId: booking.PaymentID,
        customerId: booking.CustomerID._id,
        reason: "ManualCancel"
      });

      if (refundResult.success) {
        // Send cancellation + refund email
        const payment = await (await import('../models/CustomerPayment.js')).default.findById(booking.PaymentID);
        await sendCancellationRefundEmail({
          customer: booking.CustomerID,
          booking,
          payment,
          reason: "ManualCancel"
        });
      }
    }

    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (err) {
    console.error("cancelBooking error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

export async function getCustomerBookings(req, res) {
  try {
    const customerId = req.userId || req.user?._id || req.params.customerId;
    
    const bookings = await Booking.find({ CustomerID: customerId })
      .populate('SubCategoryID', 'name price image')
      .populate('TechnicianID', 'Name MobileNumber Mobile Phone Photo')
      .populate('CustomerID', 'FirstName LastName Name MobileNumber Mobile Phone Address')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, bookings });
  } catch (err) {
    console.error("getCustomerBookings error", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
}

export async function getTechnicianPendingRequests(req, res) {
  try {
    const technicianId = req.userId || req.user?._id || req.params.technicianId;
    if (!technicianId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Find service requests where this technician was broadcasted
    const requests = await ServiceRequest.find({ BroadcastTechnicians: technicianId })
      .select('BookingID BroadcastTechnicians')
      .lean();

    const bookingIds = requests.map(r => r.BookingID).filter(Boolean);
    if (!bookingIds.length) {
      return res.json({ success: true, requests: [] });
    }

    // Find pending bookings that haven't been auto-cancelled (newest first)
    const now = Date.now();
    const bookings = await Booking.find({
      _id: { $in: bookingIds },
      Status: 'Pending',
    }).select('_id CustomerID SubCategoryID Date TimeSlot AutoCancelAt createdAt')
      .populate('SubCategoryID', 'coinsRequired name')
      .sort({ createdAt: -1 })
      .lean();

    const active = bookings.filter(b => !b.AutoCancelAt || now < new Date(b.AutoCancelAt).getTime());

    const result = active.map(b => ({
      bookingId: String(b._id),
      customerId: String(b.CustomerID),
      date: b.Date,
      timeSlot: b.TimeSlot,
      coinsRequired: b.SubCategoryID?.coinsRequired || 0,
    }));

    return res.json({ success: true, requests: result });
  } catch (err) {
    console.error('getTechnicianPendingRequests error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function getTechnicianAcceptedBookings(req, res) {
  try {
    const technicianId = req.userId || req.user?._id || req.params.technicianId;
    if (!technicianId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const bookings = await Booking.find({
      TechnicianID: technicianId,
      Status: { $in: ['Confirmed', 'In-Progress'] },
    })
      .populate('SubCategoryID', 'name image price coinsRequired')
      .populate('CustomerID', 'FirstName LastName Name Phone Mobile MobileNumber Address Email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error('getTechnicianAcceptedBookings error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

export async function getTechnicianCompletedBookings(req, res) {
  try {
    const technicianId = req.userId || req.user?._id || req.params.technicianId;
    if (!technicianId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const bookings = await Booking.find({
      TechnicianID: technicianId,
      Status: 'Completed',
    })
      .populate('SubCategoryID', 'name image price coinsRequired')
      .populate('CustomerID', 'FirstName LastName Name Phone Mobile MobileNumber Address Email')
        .sort({ serviceCompletedAt: -1, createdAt: -1 })
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error('getTechnicianCompletedBookings error', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

// Cleanup expired and used OTPs
export const cleanupBookingOtps = async () => {
  try {
    const currentTime = new Date();
    
    // Delete expired OTPs
    const expiredResult = await BookingArrivalOTP.deleteMany({
      expiresAt: { $lt: currentTime },
    });
    
    // Delete used OTPs older than 24 hours
    const oneDayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
    const usedResult = await BookingArrivalOTP.deleteMany({
      isUsed: true,
      updatedAt: { $lt: oneDayAgo },
    });
    
    const totalDeleted = (expiredResult.deletedCount || 0) + (usedResult.deletedCount || 0);
    
    if (totalDeleted > 0) {
      console.log(`🧹 Cleaned up ${totalDeleted} booking OTP records (${expiredResult.deletedCount || 0} expired, ${usedResult.deletedCount || 0} used) at ${currentTime.toISOString()}`);
    }
  } catch (error) {
    console.error("❌ Error cleaning up booking OTPs:", error);
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupBookingOtps, 5 * 60 * 1000);

// Run cleanup immediately when server starts
cleanupBookingOtps();

export default {
  createBooking,
  precheckAvailability,
  customerBookingPayment,
  broadcastBooking,
  acceptBooking,
  autoCancelIfNoAcceptance,
  getBookingById,
  cancelBooking,
  getCustomerBookings,
  getTechnicianPendingRequests,
  getTechnicianAcceptedBookings,
  getTechnicianCompletedBookings,
  generateArrivalOTP,
  verifyArrivalOTP,
  completeService,
  startAutoCancelScheduler,
  stopAutoCancelScheduler,
  scheduleAutoCancellation,
  cancelScheduledAutoCancellation,
};

// ============================================================================
// HOURLY PAYMENT RETRY JOB
// ============================================================================

/**
 * Cron job: Retry failed payment captures every hour
 * Runs at minute 0 of every hour (e.g., 1:00, 2:00, 3:00...)
 */
cron.schedule('0 * * * *', async () => {
  console.log('\n🔄 [CRON] Starting hourly payment retry job...');
  
  try {
    // Find all pending failures that haven't exceeded max retries
    const failures = await FailedPaymentOperation.find({
      status: 'pending',
      retryCount: { $lt: 5 } // Max 5 retries
    }).lean();
    
    console.log(`📋 [CRON] Found ${failures.length} failed payment operation(s) to retry`);
    
    if (failures.length === 0) {
      console.log('✅ [CRON] No pending failures. Job complete.');
      return;
    }
    
    for (const failure of failures) {
      try {
        // Update status to retrying
        await FailedPaymentOperation.findByIdAndUpdate(failure._id, {
          status: 'retrying',
          lastRetryAt: new Date()
        });
        
        // Check if payment is already captured
        const CustomerPayment = (await import('../models/CustomerPayment.js')).default;
        const payment = await CustomerPayment.findById(failure.paymentId).lean();
        
        if (payment?.Status === 'Captured') {
          console.log(`✅ [CRON] Payment already captured for booking ${failure.bookingId}, removing from queue`);
          await FailedPaymentOperation.deleteOne({ _id: failure._id });
          continue;
        }
        
        // Queue retry (non-blocking)
        console.log(`🔄 [CRON] Retrying payment capture for booking ${failure.bookingId} (Attempt ${failure.retryCount + 1}/5)`);
        queuePaymentCapture(failure.bookingId, failure.paymentId);
        
      } catch (retryErr) {
        console.error(`❌ [CRON] Failed to retry booking ${failure.bookingId}:`, retryErr.message);
      }
    }
    
    // Mark permanently failed operations (exceeded max retries)
    const result = await FailedPaymentOperation.updateMany(
      { retryCount: { $gte: 5 }, status: { $ne: 'failed' } },
      { status: 'failed' }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`⚠️ [CRON] Marked ${result.modifiedCount} operation(s) as permanently failed after 5 retries`);
    }
    
    console.log('✅ [CRON] Hourly payment retry job completed\n');
    
  } catch (error) {
    console.error('❌ [CRON] Hourly retry job failed:', error);
  }
});

console.log('⏰ Payment retry cron job initialized: Runs every hour at minute 0');
