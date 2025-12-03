import mongoose from "mongoose";

const bookingArrivalOtpSchema = new mongoose.Schema(
  {
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    TechnicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Technician", required: true },
    CustomerID: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    otp: { type: String, required: true }, // store as string to preserve leading zeros
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    purpose: { type: String, enum: ["arrival", "completion"], default: "arrival" },
  },
  { timestamps: true }
);

bookingArrivalOtpSchema.index({ BookingID: 1, purpose: 1, isUsed: 1 });

const BookingArrivalOTP = mongoose.model("BookingArrivalOTP", bookingArrivalOtpSchema);

export default BookingArrivalOTP;
