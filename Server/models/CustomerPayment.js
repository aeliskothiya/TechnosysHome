import mongoose from "mongoose";

const customerPaymentSchema = new mongoose.Schema({
  BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: false },
  CustomerID: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  Amount: { type: Number, required: true },
  Method: { type: String, enum: ["UPI", "Card", "Wallet"], required: true },
  Status: {
    type: String,
    enum: ["Pending", "Success", "Failed", "Refunded"],
    default: "Pending",
  },
}, { timestamps: true });

const CustomerPayment = mongoose.model("CustomerPayment", customerPaymentSchema);

export default CustomerPayment;
