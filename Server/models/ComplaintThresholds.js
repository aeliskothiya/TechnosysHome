import mongoose from "mongoose";

const complaintThresholdsSchema = new mongoose.Schema(
  {
    warningThreshold: { type: Number, default: 10 },
    tempDeactivationThreshold: { type: Number, default: 20 },
    permanentDeactivationThreshold: { type: Number, default: 30 },
  },
  { timestamps: true }
);

export default mongoose.model("ComplaintThresholds", complaintThresholdsSchema);
