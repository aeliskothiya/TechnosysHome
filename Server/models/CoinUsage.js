import mongoose from "mongoose";

const coinUsageSchema = new mongoose.Schema(
  {
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    TechnicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Technician" },
    CoinUsed: { type: Number, default: 0 },
    UsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("CoinUsage", coinUsageSchema);
