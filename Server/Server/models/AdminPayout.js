import mongoose from "mongoose";

const adminPayoutSchema = new mongoose.Schema(
  {
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    TechnicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Technician", required: true },
    Amount: { type: Number, required: true },
    Method: {
      type: String,
      enum: ["BankTransfer", "UPI", "Wallet", "Cash", "Other"],
      default: "BankTransfer",
    },
    Status: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("AdminPayout", adminPayoutSchema);