import mongoose from "mongoose";

const subscriptionHistorySchema = new mongoose.Schema({
  TechnicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Technician", required: true },
  PackageID: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPackage", required: true },
  PurchasedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const SubscriptionHistory = mongoose.model("SubscriptionHistory", subscriptionHistorySchema);

export default SubscriptionHistory;
