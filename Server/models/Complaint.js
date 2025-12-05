import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    ComplaintText: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Complaint", complaintSchema);
