import mongoose from "mongoose";

const adminPayoutSchema = new mongoose.Schema({
  BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: false },
  TechnicianID: { type: mongoose.Schema.Types.ObjectId, ref: "Technician", required: true },
  Amount: { type: Number, required: true },
  Method: { type: String, enum: ["Bank", "UPI"], required: true },
  Status: {
    type: String,
    enum: ["Pending", "Success", "Failed"],
    default: "Pending",
  },
}, { timestamps: true });

const AdminPayout = mongoose.model("AdminPayout", adminPayoutSchema);

export default AdminPayout;
