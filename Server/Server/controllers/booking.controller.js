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
import mongoose from "mongoose";
import { getIo } from "../config/realtime.js";
import transporter from "../config/nodemailer.js";

// Background job: Auto-cancel expired bookings
const scheduledCancellations = new Map(); // bookingId -> timeoutId

async function executeCancellation(bookingId) {
  try {
    const booking = await Booking.findById(bookingId);
    
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
    });

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

export async function simulatePayment(req, res) {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, message: "Payment simulated successfully." });
  } catch (err) {
    console.error("simulatePayment error", err);
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

    // Update booking status
    booking.Status = "Confirmed";
    booking.TechnicianID = technicianId;
    booking.AcceptedAt = new Date();
    await booking.save();

    // Cancel the scheduled auto-cancellation since booking is now confirmed
    cancelScheduledAutoCancellation(booking._id);

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
    (serviceRequest?.BroadcastTechnicians || []).forEach(tid => {
      if (String(tid) !== String(technicianId)) {
        io.to(String(tid)).emit("booking-request-closed", { bookingId: booking._id });
      }
    });

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
          subject: "Your Service Arrival OTP",
          html: `<p>Your technician has arrived for your booking.</p>
                 <p><strong>OTP: ${otp}</strong></p>
                 <p style=\"color:#b91c1c\">Do NOT share this OTP unless the technician has reached your location. Sharing the OTP means your service has officially started.</p>
                 <p>This OTP is valid for 2 minutes.</p>`,
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
    await booking.save();

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

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    
    if (String(booking.TechnicianID) !== String(technicianId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (booking.Status !== "In-Progress") {
      return res.status(400).json({ success: false, message: "Only in-progress bookings can be completed" });
    }

    // Update booking status to Completed
    booking.Status = "Completed";
    booking.CompletedAt = new Date();
    await booking.save();

    // Notify customer via socket
    const io = getIo();
    const customerId = String(booking.CustomerID);
    io.to(customerId).emit("service-completed", {
      bookingId: String(booking._id),
      message: "Your service has been completed successfully!"
    });

    return res.json({ success: true, message: "Service completed successfully", booking });
  } catch (err) {
    console.error("completeService error", err);
    res.status(500).json({ success: false, message: "Internal error" });
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
          subject: "Your Service Completion OTP",
          html: `<p>Your technician requests confirmation to mark your service as completed.</p>
                 <p><strong>OTP: ${otp}</strong></p>
                 <p style=\"color:#b91c1c\">Share this OTP only if your work is complete. If not, do not share it. We are not responsible for incomplete work.</p>
                 <p>This OTP is valid for 2 minutes.</p>`,
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
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (String(booking.TechnicianID) !== String(technicianId)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (booking.Status !== "In-Progress") {
      return res.status(400).json({ success: false, message: "Only in-progress bookings can be completed" });
    }

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

    record.isUsed = true;
    await record.save();

    booking.Status = "Completed";
    booking.CompletedAt = new Date();
    await booking.save();

    const io = getIo();
    const customerId = String(booking.CustomerID);
    io.to(customerId).emit("service-completed", {
      bookingId: String(booking._id),
      message: "Your service has been completed successfully!",
    });

    return res.json({ success: true, message: "Service completed via OTP", booking });
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

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    
    // Check if booking belongs to customer
    if (String(booking.CustomerID) !== String(customerId)) {
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
      .populate('TechnicianID', 'Name MobileNumber')
      .populate('CustomerID', 'Address')
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
      .populate('CustomerID', 'FirstName LastName Phone Address')
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
      .populate('CustomerID', 'FirstName LastName Phone Address Email')
      .sort({ CompletedAt: -1, createdAt: -1 })
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
  simulatePayment,
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
