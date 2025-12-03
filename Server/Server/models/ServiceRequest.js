import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    // Additional service-specific details for the job
    notes: { type: String, default: "" },
    estimatedDurationMinutes: { type: Number, default: 60 },
    materialsRequired: [{ type: String }],
    priority: { type: String, enum: ["Normal","Urgent"], default: "Normal" },
    BroadcastTechnicians: [{ type: mongoose.Schema.Types.ObjectId, ref: "Technician" }],
    // Snapshot references if needed (avoid duplication of address/location)
    // Keep any job-specific metadata here, not profile data
  },
  { timestamps: true }
);

export default mongoose.model("ServiceRequest", serviceRequestSchema);
