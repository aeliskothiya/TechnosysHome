import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    CustomerID: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    TechnicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Technician" },
    SubCategoryID: { type: mongoose.Schema.Types.ObjectId, ref: "SubServiceCategory" },
    Date: { type: Date, required: true },
    TimeSlot: { type: String, enum: ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"], required: true },
    // ServiceCategory is inferred via SubCategory populate; do not duplicate here
    Status: {
      type: String,
      enum: ["Pending","Rejected", "Confirmed", "In-Progress", "Completed", "Cancelled", "AutoCancelled"],
      default: "Pending",
    },
    AcceptedAt: { type: Date },
    AutoCancelAt: { type: Date },
    arrivalVerified: { type: Boolean, default: false },
    serviceStartedAt: { type: Date },
    serviceCompletedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
