import mongoose from "mongoose";

const customerPaymentSchema = new mongoose.Schema(
  {
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    CustomerID: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    Amount: { type: Number, required: true },
    Method: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Wallet", "Other"],
      default: "Other",
    },
    Status: {
      type: String,
      enum: ["Pending", "Success", "Failed", "Refunded", "Authorized", "Captured"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("CustomerPayment", customerPaymentSchema);
