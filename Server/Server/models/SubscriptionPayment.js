import mongoose from "mongoose";

const subscriptionPaymentSchema = new mongoose.Schema({
  HistoryID: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionHistory" },
  TechnicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Technician", required: true },
  PackageID: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPackage" },
  Amount: { type: Number, required: true },
  Method: { type: String, required: true },
  ProviderOrderId: { type: String },
  ProviderPaymentId: { type: String },
  ProviderSignature: { type: String },
  Status: {
    type: String,
    enum: ["Pending", "Success", "Failed"],
    default: "Pending",
  },
}, { timestamps: true });

const SubscriptionPayment = mongoose.model("SubscriptionPayment", subscriptionPaymentSchema);

export default SubscriptionPayment;
