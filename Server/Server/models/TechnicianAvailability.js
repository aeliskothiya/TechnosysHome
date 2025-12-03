import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema({
  slot: { type: String, required: true }, // e.g. "09:00-10:00"
  status: { type: String, enum: ["available", "booked"], default: "available" },
});

const technicianAvailabilitySchema = new mongoose.Schema(
  {
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: "Technician", required: true },
    date: { type: String, required: true }, // store as YYYY-MM-DD for easy querying
    timeSlots: [timeSlotSchema],
  },
  { timestamps: true }
);

technicianAvailabilitySchema.index({ technicianId: 1, date: 1 }, { unique: true });

const TechnicianAvailability = mongoose.model(
  "TechnicianAvailability",
  technicianAvailabilitySchema
);

export default TechnicianAvailability;
