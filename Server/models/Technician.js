import mongoose from "mongoose";

const technicianSchema = new mongoose.Schema({
  Name: { type: String, maxlength: 100 },
  MobileNumber: { type: String, unique: true },
  Email: { type: String, maxlength: 100, unique: true },
  Password: { type: String },

  // Structured address similar to Customer
  Address: {
    houseNumber: { type: String, default: "" },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },
  },

  // Geo location for proximity search
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },

  // Add these fields for file paths
  IDProof: { type: String }, // Path to ID proof file
  Photo: { type: String }, // Path to photo file

  // OTP fields
  mobileOtp: String,
  mobileOtpExpiry: Date,
  isMobileVerified: { type: Boolean, default: false },
  emailOtp: String,
  emailOtpExpiry: Date,
  isEmailVerified: { type: Boolean, default: false },

  VerifyStatus: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  ActiveStatus: {
    type: String,
    enum: ["Active", "Deactive"],
    default: "Active",
  },
}, { timestamps: true });

technicianSchema.index({ location: "2dsphere" });

const Technician = mongoose.model("Technician", technicianSchema);

export default Technician;

