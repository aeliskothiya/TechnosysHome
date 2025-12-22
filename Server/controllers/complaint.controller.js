import Complaint from "../models/Complaint.js";
import Booking from "../models/Booking.js";
import Technician from "../models/Technician.js";
import TechnicianComplaintStatus from "../models/TechnicianComplaintStatus.js";
import ComplaintThresholds from "../models/ComplaintThresholds.js";
import transporter from "../config/nodemailer.js";

// Sender display name helpers
const SENDER_NAME = process.env.SENDER_NAME || "Technosys";
const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || "no-reply@technosys.com";
const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;

// Map to track temporary reactivation timeouts
const scheduledReactivations = new Map(); // technicianId -> timeoutId

// Initialize reactivation scheduler on server start
export async function initializeReactivationScheduler() {
  try {
    console.log("🔄 Initializing reactivation scheduler...");
    
    // Find all technicians with temporary deactivation
    const complaintStatuses = await TechnicianComplaintStatus.find({
      DeactivationReason: { $regex: /^Temporary/ },
      TempDeactivationExpiry: { $ne: null }
    });

    console.log(`📊 Found ${complaintStatuses.length} technicians with temporary deactivation`);

    for (const status of complaintStatuses) {
      const now = new Date();
      const expiryTime = new Date(status.TempDeactivationExpiry);

      if (expiryTime <= now) {
        // Already expired, reactivate immediately
        console.log(`⚡ Reactivating expired technician ${status.TechnicianID}`);
        await executeReactivation(status.TechnicianID);
      } else {
        // Schedule future reactivation
        console.log(`⏰ Scheduling reactivation for technician ${status.TechnicianID}`);
        scheduleReactivation(status.TechnicianID, expiryTime);
      }
    }

    console.log("✅ Reactivation scheduler initialized");
  } catch (error) {
    console.error("❌ Failed to initialize reactivation scheduler:", error);
  }
}

// Submit or Update Complaint
export const submitComplaint = async (req, res) => {
  try {
    const { bookingId, complaintText } = req.body;
    const customerId = req.userId;

    if (!bookingId || !complaintText || !complaintText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Booking ID and complaint text are required",
      });
    }

    // Verify booking exists and belongs to customer
    const booking = await Booking.findOne({
      _id: bookingId,
      CustomerID: customerId,
      Status: "Completed",
    }).populate("TechnicianID");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Completed booking not found",
      });
    }

    // Check if complaint already exists
    let complaint = await Complaint.findOne({ BookingID: bookingId });

    if (complaint) {
      // Update existing complaint
      complaint.ComplaintText = complaintText;
      await complaint.save();

      return res.status(200).json({
        success: true,
        message: "Complaint updated successfully",
        complaint,
      });
    } else {
      // Create new complaint
      complaint = await Complaint.create({
        BookingID: bookingId,
        ComplaintText: complaintText,
      });

      // Get or create technician complaint status
      const technicianId = booking.TechnicianID._id;
      let complaintStatus = await TechnicianComplaintStatus.findOne({ TechnicianID: technicianId });
      
      if (!complaintStatus) {
        complaintStatus = await TechnicianComplaintStatus.create({
          TechnicianID: technicianId,
          ComplaintCount: 0,
        });
      }

      // Increment complaint count
      complaintStatus.ComplaintCount += 1;
      await complaintStatus.save();

      // Check thresholds and trigger actions
      await checkAndTriggerThresholdActions(booking.TechnicianID, complaintStatus);

      return res.status(201).json({
        success: true,
        message: "Complaint submitted successfully",
        complaint,
      });
    }
  } catch (error) {
    console.error("Error submitting complaint:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit complaint",
      error: error.message,
    });
  }
};

// Check thresholds and trigger actions
async function checkAndTriggerThresholdActions(technician, complaintStatus) {
  try {
    // Get current thresholds
    let thresholds = await ComplaintThresholds.findOne();
    
    // Create default if doesn't exist
    if (!thresholds) {
      thresholds = await ComplaintThresholds.create({
        warningThreshold: 10,
        tempDeactivationThreshold: 20,
        permanentDeactivationThreshold: 30,
      });
    }

    const count = complaintStatus.ComplaintCount;
    const { warningThreshold, tempDeactivationThreshold, permanentDeactivationThreshold } = thresholds;

    console.log(`🔍 Checking thresholds for technician ${technician.Name} (${technician.Email}) - Complaint Count: ${count}`);

    // Permanent Deactivation (30 complaints)
    if (count >= permanentDeactivationThreshold) {
      console.log(`🚫 Permanent deactivation triggered for ${technician.Name}`);
      
      technician.ActiveStatus = "Deactive";
      await technician.save();

      complaintStatus.DeactivationReason = `Permanent - ${permanentDeactivationThreshold} complaints`;
      await complaintStatus.save();

      // Send permanent deactivation email
      await sendPermanentDeactivationEmail(technician, count);
      
      return;
    }

    // Temporary Deactivation (20 complaints)
    if (count === tempDeactivationThreshold) {
      console.log(`⏰ Temporary deactivation triggered for ${technician.Name}`);
      
      const oneMonthMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const reactivationTime = new Date(Date.now() + oneMonthMs);
      
      technician.ActiveStatus = "Deactive";
      await technician.save();

      complaintStatus.DeactivationReason = `Temporary - ${tempDeactivationThreshold} complaints`;
      complaintStatus.TempDeactivationExpiry = reactivationTime;
      await complaintStatus.save();

      // Send temporary deactivation email
      await sendTempDeactivationEmail(technician, count);

      // Schedule reactivation after 1 month
      scheduleReactivation(technician._id, reactivationTime);
      
      return;
    }

    // Warning (10 complaints)
    if (count === warningThreshold) {
      console.log(`⚠️ Warning triggered for ${technician.Name}`);
      
      // Send warning email
      await sendWarningEmail(technician, count);
      
      return;
    }

  } catch (error) {
    console.error("Error checking thresholds:", error);
  }
}

// Schedule reactivation after temporary deactivation
function scheduleReactivation(technicianId, reactivationTime) {
  const technicianIdStr = String(technicianId);
  
  // Clear existing timeout if any
  if (scheduledReactivations.has(technicianIdStr)) {
    clearTimeout(scheduledReactivations.get(technicianIdStr));
  }

  const delay = reactivationTime.getTime() - Date.now();
  
  if (delay <= 0) {
    console.log(`⚡ Reactivation time already passed for ${technicianIdStr}, activating immediately`);
    executeReactivation(technicianId);
    return;
  }

  console.log(`⏰ Scheduled reactivation for technician ${technicianIdStr} in ${Math.round(delay/1000)} seconds`);
  
  const timeoutId = setTimeout(() => {
    executeReactivation(technicianId);
  }, delay);

  scheduledReactivations.set(technicianIdStr, timeoutId);
}

// Execute reactivation
async function executeReactivation(technicianId) {
  try {
    const technician = await Technician.findById(technicianId);
    const complaintStatus = await TechnicianComplaintStatus.findOne({ TechnicianID: technicianId });
    
    if (!technician) {
      console.log(`⚠️ Technician ${technicianId} not found for reactivation`);
      scheduledReactivations.delete(String(technicianId));
      return;
    }

    if (!complaintStatus) {
      console.log(`⚠️ Complaint status for technician ${technicianId} not found`);
      scheduledReactivations.delete(String(technicianId));
      return;
    }

    // Only reactivate if still temporarily deactivated
    if (complaintStatus.DeactivationReason.startsWith("Temporary")) {
      console.log(`✅ Reactivating technician ${technician.Name}`);
      
      technician.ActiveStatus = "Active";
      await technician.save();

      complaintStatus.DeactivationReason = "";
      complaintStatus.TempDeactivationExpiry = null;
      await complaintStatus.save();

      // Send reactivation email
      await sendReactivationEmail(technician);
    }

    scheduledReactivations.delete(String(technicianId));
  } catch (error) {
    console.error(`❌ Failed to reactivate technician ${technicianId}:`, error);
    scheduledReactivations.delete(String(technicianId));
  }
}

// Email functions
async function sendWarningEmail(technician, complaintCount) {
  const mailOptions = {
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: technician.Email,
    subject: "⚠️ Official Warning - Complaint Threshold Reached",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 2px solid #f59e0b; border-radius: 0 0 10px 10px; }
          .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">⚠️ Official Warning</h1>
          </div>
          <div class="content">
            <p>Dear ${technician.Name},</p>
            
            <div class="warning-box">
              <strong>You have crossed the warning complaint limit. This is an official warning.</strong>
            </div>
            
            <p>Your account has received <strong>${complaintCount} complaints</strong>. Please take immediate action to improve your service quality.</p>
            
            <p><strong>What happens next:</strong></p>
            <ul>
              <li>Continue providing quality service to avoid further complaints</li>
              <li>More complaints may result in temporary or permanent account deactivation</li>
            </ul>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Best regards,<br><strong>Technosys Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Warning email sent to ${technician.Email}`, info.messageId);
  } catch (error) {
    console.error(`❌ Failed to send warning email to ${technician.Email}:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Response: ${error.response}`);
  }
}

async function sendTempDeactivationEmail(technician, complaintCount) {
  const mailOptions = {
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: technician.Email,
    subject: "🚫 Account Temporarily Deactivated",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 2px solid #ef4444; border-radius: 0 0 10px 10px; }
          .deactivation-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🚫 Account Deactivated</h1>
          </div>
          <div class="content">
            <p>Dear ${technician.Name},</p>
            
            <div class="deactivation-box">
              <strong>Your account has been temporarily deactivated.</strong>
            </div>
            
            <p>Due to reaching <strong>${complaintCount} complaints</strong>, your account has been temporarily suspended for <strong>1 month</strong>.</p>
            
            <p><strong>Important Information:</strong></p>
            <ul>
              <li>Your account will be automatically reactivated after 1 month</li>
              <li>You will receive a confirmation email when reactivated</li>
              <li>Please improve your service quality to avoid permanent deactivation</li>
            </ul>
            
            <p>If you believe this is an error, please contact our support team immediately.</p>
            
            <p>Best regards,<br><strong>Technosys Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Temporary deactivation email sent to ${technician.Email}`, info.messageId);
  } catch (error) {
    console.error(`❌ Failed to send temp deactivation email to ${technician.Email}:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Response: ${error.response}`);
  }
}

async function sendReactivationEmail(technician) {
  const mailOptions = {
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: technician.Email,
    subject: "✅ Account Reactivated",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 2px solid #10b981; border-radius: 0 0 10px 10px; }
          .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ Account Reactivated</h1>
          </div>
          <div class="content">
            <p>Dear ${technician.Name},</p>
            
            <div class="success-box">
              <strong>Your account has been reactivated.</strong>
            </div>
            
            <p>Good news! Your temporary suspension has ended and your account is now active again.</p>
            
            <p><strong>Moving Forward:</strong></p>
            <ul>
              <li>You can now accept new booking requests</li>
              <li>Please focus on providing excellent service quality</li>
              <li>Additional complaints may result in permanent deactivation</li>
            </ul>
            
            <p>Thank you for your cooperation.</p>
            
            <p>Best regards,<br><strong>Technosys Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Reactivation email sent to ${technician.Email}`, info.messageId);
  } catch (error) {
    console.error(`❌ Failed to send reactivation email to ${technician.Email}:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Response: ${error.response}`);
  }
}

async function sendPermanentDeactivationEmail(technician, complaintCount) {
  const mailOptions = {
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: technician.Email,
    subject: "🚫 Account Permanently Deactivated",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 2px solid #7c3aed; border-radius: 0 0 10px 10px; }
          .permanent-box { background: #ede9fe; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🚫 Account Permanently Deactivated</h1>
          </div>
          <div class="content">
            <p>Dear ${technician.Name},</p>
            
            <div class="permanent-box">
              <strong>Your account has been permanently deactivated due to repeated complaints.</strong>
            </div>
            
            <p>After reaching <strong>${complaintCount} complaints</strong>, your account has been permanently suspended.</p>
            
            <p><strong>What this means:</strong></p>
            <ul>
              <li>Your account is no longer active</li>
              <li>You cannot accept new booking requests</li>
              <li>Manual intervention by admin is required for reactivation</li>
            </ul>
            
            <p>If you wish to appeal this decision, please contact our support team with your case details.</p>
            
            <p>Best regards,<br><strong>Technosys Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Permanent deactivation email sent to ${technician.Email}`, info.messageId);
  } catch (error) {
    console.error(`❌ Failed to send permanent deactivation email to ${technician.Email}:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Response: ${error.response}`);
  }
}

// Get Complaint for a Booking
export const getComplaint = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const customerId = req.userId;

    // Verify booking belongs to customer
    const booking = await Booking.findOne({
      _id: bookingId,
      CustomerID: customerId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const complaint = await Complaint.findOne({ BookingID: bookingId });

    return res.status(200).json({
      success: true,
      complaint: complaint || null,
    });
  } catch (error) {
    console.error("Error fetching complaint:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaint",
      error: error.message,
    });
  }
};

// Get All Complaints for Customer's Bookings
export const getCustomerComplaints = async (req, res) => {
  try {
    const customerId = req.userId;

    // Get all customer's completed bookings
    const bookings = await Booking.find({
      CustomerID: customerId,
      Status: "Completed",
    }).select("_id");

    const bookingIds = bookings.map((b) => b._id);

    // Get complaints for those bookings
    const complaints = await Complaint.find({
      BookingID: { $in: bookingIds },
    }).populate("BookingID");

    return res.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    console.error("Error fetching customer complaints:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
      error: error.message,
    });
  }
};

// Get All Complaints (Admin)
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate({
        path: "BookingID",
        populate: [
          { path: "CustomerID", select: "FirstName LastName Name MobileNumber Email" },
          { path: "TechnicianID", select: "Name MobileNumber Email" },
          { path: "SubCategoryID", select: "name price" },
        ],
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    console.error("Error fetching all complaints:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
      error: error.message,
    });
  }
};

// Update Complaint Status (Admin) - REMOVED - No longer needed
// Complaints are now automatically processed

// Get All Complaints for Technician's Bookings
export const getTechnicianComplaints = async (req, res) => {
  try {
    const technicianId = req.userId;

    // Get all technician's completed bookings
    const bookings = await Booking.find({
      TechnicianID: technicianId,
      Status: "Completed",
    }).select("_id");

    const bookingIds = bookings.map((b) => b._id);

    // Get complaints for those bookings
    const complaints = await Complaint.find({
      BookingID: { $in: bookingIds },
    }).populate({
      path: "BookingID",
      populate: [
        { path: "CustomerID", select: "FirstName LastName Name MobileNumber" },
        { path: "SubCategoryID", select: "name price" },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      complaints,
    });
  } catch (error) {
    console.error("Error fetching technician complaints:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
      error: error.message,
    });
  }
};
