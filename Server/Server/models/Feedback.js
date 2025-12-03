import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    Rating: { type: Number, min: 1, max: 5 },
    FeedbackText: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
