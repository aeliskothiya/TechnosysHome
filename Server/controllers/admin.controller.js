import Technician from "../models/Technician.js";
import TechnicianBankDetails from "../models/TechnicianBankDetails.js";
import TechnicianServiceCategory from "../models/TechnicianServiceCategory.js";
import ServiceCategory from "../models/ServiceCategory.js";
import nodemailer from "nodemailer";
import { getIo } from "../config/realtime.js";

// Create transporter for emails
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.SENDER_EMAIL,
//     pass: process.env.SMTP_PASS,
//   },
// });
// For Brevo SMTP
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.SMTP_USER, // "95f675001@smtp-brevo.com"
    pass: process.env.SMTP_PASS, // "mU5SRsKt6OkGq73H"
  },
});

// Sender display name helpers
const SENDER_NAME = process.env.SENDER_NAME || "Technosys";
const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || "no-reply@technosys.com";
const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;

// Get all technicians with filter
export const getTechnicians = async (req, res) => {
  try {
    const { status } = req.query;

    let filter = {};
    if (status && ["Pending", "Approved", "Rejected"].includes(status)) {
      filter.VerifyStatus = status;
    }

    const technicians = await Technician.find(filter)
      .select("-Password -mobileOtp -mobileOtpExpiry -emailOtp -emailOtpExpiry")
      .sort({ createdAt: -1 })
      .lean();

    // Attach bank details and service categories for each technician
    for (const tech of technicians) {
      const bank = await TechnicianBankDetails.findOne({ TechnicianID: tech._id }).lean();
      const svcMaps = await TechnicianServiceCategory.find({ TechnicianID: tech._id }).lean();
      const serviceCategoryIds = svcMaps.map((s) => s.ServiceCategoryID);
      const services = serviceCategoryIds.length
        ? await ServiceCategory.find({ _id: { $in: serviceCategoryIds } }).select('name').lean()
        : [];

      // Normalize Address: convert object to string for display compatibility
      if (tech.Address && typeof tech.Address === 'object' && !Array.isArray(tech.Address)) {
        const { houseNumber, street, city, pincode } = tech.Address;
        tech.Address = [houseNumber, street, city, pincode].filter(Boolean).join(', ') || '';
      }

      // Provide backward-compatible fields expected by frontend
      tech.bankDetails = bank || null;
      tech.serviceCategories = services;
      tech.ServiceCategoryID = services[0] || null; // keep previous property name for compatibility
      tech.BankAccountNo = bank?.BankAccountNo || null;
      tech.IFSCCode = bank?.IFSCCode || null;
    }

    res.json({ success: true, technicians, total: technicians.length });
  } catch (error) {
    console.error("Get technicians error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get technician by ID
export const getTechnicianById = async (req, res) => {
  try {
    const { id } = req.params;

    const technician = await Technician.findById(id)
      .select('-Password -mobileOtp -mobileOtpExpiry -emailOtp -emailOtpExpiry')
      .lean();

    if (!technician) return res.status(404).json({ success: false, message: 'Technician not found' });

    const bank = await TechnicianBankDetails.findOne({ TechnicianID: id }).lean();
    const svcMaps = await TechnicianServiceCategory.find({ TechnicianID: id }).lean();
    const serviceCategoryIds = svcMaps.map((s) => s.ServiceCategoryID);
    const services = serviceCategoryIds.length
      ? await ServiceCategory.find({ _id: { $in: serviceCategoryIds } }).select('name').lean()
      : [];

    // Normalize Address: convert object to string for display compatibility
    if (technician.Address && typeof technician.Address === 'object' && !Array.isArray(technician.Address)) {
      const { houseNumber, street, city, pincode } = technician.Address;
      technician.Address = [houseNumber, street, city, pincode].filter(Boolean).join(', ') || '';
    }

    technician.bankDetails = bank || null;
    technician.serviceCategories = services;
    technician.ServiceCategoryID = services[0] || null;
    technician.BankAccountNo = bank?.BankAccountNo || null;
    technician.IFSCCode = bank?.IFSCCode || null;

    res.json({ success: true, technician });
  } catch (error) {
    console.error("Get technician error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get technician details by ID
export const getTechnicianDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const technician = await Technician.findById(id).lean();
    if (!technician) return res.status(404).json({ success: false, message: 'Technician not found' });

    const bank = await TechnicianBankDetails.findOne({ TechnicianID: id }).lean();
    const svcMaps = await TechnicianServiceCategory.find({ TechnicianID: id }).lean();
    const serviceCategoryIds = svcMaps.map((s) => s.ServiceCategoryID);
    const services = serviceCategoryIds.length
      ? await ServiceCategory.find({ _id: { $in: serviceCategoryIds } }).select('name').lean()
      : [];

    // Normalize Address: convert object to string for display compatibility
    if (technician.Address && typeof technician.Address === 'object' && !Array.isArray(technician.Address)) {
      const { houseNumber, street, city, pincode } = technician.Address;
      technician.Address = [houseNumber, street, city, pincode].filter(Boolean).join(', ') || '';
    }

    technician.bankDetails = bank || null;
    technician.serviceCategories = services;
    technician.ServiceCategoryID = services[0] || null;
    technician.BankAccountNo = bank?.BankAccountNo || null;
    technician.IFSCCode = bank?.IFSCCode || null;

    res.status(200).json({ success: true, technician });
  } catch (error) {
    console.error("❌ Error fetching technician:", error);
    res.status(500).json({ success: false, message: "Error fetching technician details" });
  }
};

export const approveTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Approving technician with ID:", id);

    // First update the technician
    await Technician.findByIdAndUpdate(
      id,
      {
        VerifyStatus: "Approved",
        ActiveStatus: "Active",
      }
    );

    // Then fetch the updated technician and related records
    const technician = await Technician.findById(id).select('-Password -mobileOtp -mobileOtpExpiry -emailOtp -emailOtpExpiry').lean();
    const bank = await TechnicianBankDetails.findOne({ TechnicianID: id }).lean();
    const svcMaps = await TechnicianServiceCategory.find({ TechnicianID: id }).lean();
    const serviceCategoryIds = svcMaps.map((s) => s.ServiceCategoryID);
    const services = serviceCategoryIds.length
      ? await ServiceCategory.find({ _id: { $in: serviceCategoryIds } }).select('name').lean()
      : [];

    if (technician) {
      // Normalize Address: convert object to string for display compatibility
      if (technician.Address && typeof technician.Address === 'object' && !Array.isArray(technician.Address)) {
        const { houseNumber, street, city, pincode } = technician.Address;
        technician.Address = [houseNumber, street, city, pincode].filter(Boolean).join(', ') || '';
      }

      technician.bankDetails = bank || null;
      technician.serviceCategories = services;
      technician.ServiceCategoryID = services[0] || null;
      technician.BankAccountNo = bank?.BankAccountNo || null;
      technician.IFSCCode = bank?.IFSCCode || null;
    }

    

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }
    // Send approval email
    try {
      

      // Create a safe variable for service category name
      const serviceCategoryName = technician.ServiceCategoryID?.name || 'Not specified';
      

      await transporter.sendMail({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        replyTo: REPLY_TO,
        to: technician.Email,
        subject: "Your Technician Account Has Been Approved - Technosys",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5; text-align: center;">🎉 Account Approved!</h2>
            <p>Dear <strong>${technician.Name}</strong>,</p>
            <p>We are pleased to inform you that your technician account has been approved by our administration team.</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Account Details:</strong></p>
              <ul style="margin: 10px 0;">
                <li><strong>Name:</strong> ${technician.Name}</li>
                <li><strong>Email:</strong> ${technician.Email}</li>
                <li><strong>Mobile:</strong> ${technician.MobileNumber}</li>
                <li><strong>Service Category:</strong> ${serviceCategoryName}</li>
              </ul>
            </div>

            <p>You can now login to your account and start accepting service requests from customers.</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${
                process.env.FRONTEND_URL || "http://localhost:5175"
              }/login" 
                 style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Login to Your Account
              </a>
            </div>

            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <br/>
            <p>Best regards,<br/>
            <strong>Technosys Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `,
      });
      console.log(`✅ Approval email sent successfully to: ${technician.Email}`);
    } catch (emailError) {
      console.error("❌ Approval email error:", emailError);
    }

    res.json({
      success: true,
      message: "Technician approved successfully",
      technician,
    });
    // Emit realtime event for clients
    try {
      const io = getIo();
      if (io) io.emit('db_change', { model: 'Technician', operation: 'approve', doc: technician });
    } catch (e) {
      console.warn('Realtime emit failed (approveTechnician)', e);
    }
  } catch (error) {
    console.error("Approve technician error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const rejectTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    // First update the technician
    await Technician.findByIdAndUpdate(
      id,
      {
        VerifyStatus: "Rejected",
        ActiveStatus: "Deactive",
      }
    );

    // Then fetch the updated technician and related records
    const technician = await Technician.findById(id).select('-Password -mobileOtp -mobileOtpExpiry -emailOtp -emailOtpExpiry').lean();
    const bank = await TechnicianBankDetails.findOne({ TechnicianID: id }).lean();
    const svcMaps = await TechnicianServiceCategory.find({ TechnicianID: id }).lean();
    const serviceCategoryIds = svcMaps.map((s) => s.ServiceCategoryID);
    const services = serviceCategoryIds.length
      ? await ServiceCategory.find({ _id: { $in: serviceCategoryIds } }).select('name').lean()
      : [];

    if (technician) {
      // Normalize Address: convert object to string for display compatibility
      if (technician.Address && typeof technician.Address === 'object' && !Array.isArray(technician.Address)) {
        const { houseNumber, street, city, pincode } = technician.Address;
        technician.Address = [houseNumber, street, city, pincode].filter(Boolean).join(', ') || '';
      }

      technician.bankDetails = bank || null;
      technician.serviceCategories = services;
      technician.ServiceCategoryID = services[0] || null;
      technician.BankAccountNo = bank?.BankAccountNo || null;
      technician.IFSCCode = bank?.IFSCCode || null;
    }

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

    // Create a safe variable for service category name
    const serviceCategoryName = technician.ServiceCategoryID?.name || 'Not specified';

    // Send rejection email
    try {
      await transporter.sendMail({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        replyTo: REPLY_TO,
        to: technician.Email,
        subject: "Update on Your Technician Account Application - Technosys",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626; text-align: center;">Application Status Update</h2>
            <p>Dear <strong>${technician.Name}</strong>,</p>
            <p>Thank you for your interest in joining Technosys as a technician in the <strong>${serviceCategoryName}</strong> category.</p>
            
            <p>After careful review, we regret to inform you that your technician account application has not been approved at this time.</p>
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #dc2626;"><strong>Reason for Rejection:</strong></p>
              <p style="margin: 10px 0; color: #7f1d1d;">${reason}</p>
            </div>

            <p>If you believe this decision was made in error, or if you would like to address the concerns mentioned above, 
            please feel free to contact our support team for further clarification.</p>

            <p>We encourage you to review our technician requirements and apply again in the future if your circumstances change.</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${
                process.env.FRONTEND_URL || "http://localhost:5173"
              }/contact" 
                 style="background-color: #6b7280; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Contact Support
              </a>
            </div>

            <br/>
            <p>Best regards,<br/>
            <strong>Technosys Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `,
      });
      console.log(`Rejection email sent to: ${technician.Email}`);
    } catch (emailError) {
      console.error("Rejection email error:", emailError);
    }

    res.json({
      success: true,
      message: "Technician rejected successfully",
      technician,
    });
    // Emit realtime event for clients
    try {
      const io = getIo();
      if (io) io.emit('db_change', { model: 'Technician', operation: 'reject', doc: technician });
    } catch (e) {
      console.warn('Realtime emit failed (rejectTechnician)', e);
    }
  } catch (error) {
    console.error("Reject technician error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get statistics
export const getTechnicianStats = async (req, res) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      Technician.countDocuments({ VerifyStatus: "Pending" }),
      Technician.countDocuments({ VerifyStatus: "Approved" }),
      Technician.countDocuments({ VerifyStatus: "Rejected" }),
      Technician.countDocuments(),
    ]);

    res.json({
      success: true,
      stats: {
        pending,
        approved,
        rejected,
        total,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// Toggle technician active status
export const toggleTechnicianStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'activate' or 'deactivate'

    if (!["activate", "deactivate"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'activate' or 'deactivate'",
      });
    }

    const technician = await Technician.findById(id);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

    if (technician.VerifyStatus !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved technicians can be activated/deactivated",
      });
    }

    const newStatus = action === "activate" ? "Active" : "Deactive";

    const updatedTechnician = await Technician.findByIdAndUpdate(
      id,
      { ActiveStatus: newStatus },
      { new: true }
    ).select("-Password -mobileOtp -mobileOtpExpiry -emailOtp -emailOtpExpiry");

    res.json({
      success: true,
      message: `Technician ${action}d successfully`,
      technician: updatedTechnician,
    });

    // Emit realtime event for clients about status toggle
    try {
      const io = getIo();
      if (io) io.emit('db_change', { model: 'Technician', operation: 'status_toggle', doc: updatedTechnician });
    } catch (e) {
      console.warn('Realtime emit failed (toggleTechnicianStatus)', e);
    }
  } catch (error) {
    console.error("Toggle technician status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
