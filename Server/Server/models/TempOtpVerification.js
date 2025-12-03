import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema({
  contactType: {
    type: String,
    enum: ["mobile", "email"], // we know whether it's for mobile or email
    required: true,
  },
  contactValue: {
    type: String, // actual mobile number or email
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  otpExpiry: {
    type: Date,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

const TempOtpVerification = mongoose.model("TempOtpVerification", otpVerificationSchema);
export default TempOtpVerification;
