import mongoose from "mongoose";

const technicianComplaintStatusSchema = new mongoose.Schema(
  {
    TechnicianID: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Technician", 
      required: true,
      unique: true 
    },
    ComplaintCount: { type: Number, default: 0 },
    DeactivationReason: { type: String, default: "" },
    TempDeactivationExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("TechnicianComplaintStatus", technicianComplaintStatusSchema);
