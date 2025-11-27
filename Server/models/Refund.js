import mongoose from "mongoose";

const refundSchema = new mongoose.Schema({
  BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: false },
  CustomerID: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  Amount: { type: Number, required: true },
  Method: { type: String, enum: ["UPI", "Card", "Wallet"], required: true },
  Status: {
    type: String,
    enum: ["Pending", "Success", "Failed"],
    default: "Pending",
  },
}, { timestamps: true });

const Refund = mongoose.model("Refund", refundSchema);

export default Refund;
