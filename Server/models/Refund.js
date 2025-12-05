import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    CustomerID: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    PaymentID: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerPayment" },
    Amount: { type: Number, required: true },
    Method: {
      type: String,
      enum: ["BankTransfer", "UPI", "Wallet", "Cash", "Other"],
      default: "BankTransfer",
    },
    Status: {
      type: String,
      enum: ["Requested", "Processing", "Completed", "Rejected"],
      default: "Requested",
    },
    RazorpayRefundID: { type: String },
    CancellationReason: { type: String, enum: ["ManualCancel", "AutoCancelNoAcceptance", "AutoCancelNoArrival"], default: "ManualCancel" },
  },
  { timestamps: true }
);

export default mongoose.model("Refund", refundSchema);