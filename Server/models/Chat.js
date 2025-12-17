import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    BookingID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },
    CustomerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    TechnicianID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      required: true,
      index: true,
    },
    LastMessageAt: {
      type: Date,
      default: Date.now,
    },
    ExpiresAt: {
      type: Date,
      default: null, // Set when booking completes, 7 days from completion
    },
    IsActive: {
      type: Boolean,
      default: true,
    },
    IsArchived: {
      type: Boolean,
      default: false,
    },
    UnreadCountCustomer: {
      type: Number,
      default: 0,
    },
    UnreadCountTechnician: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying user's active chats
chatSchema.index({ CustomerID: 1, IsActive: 1 });
chatSchema.index({ TechnicianID: 1, IsActive: 1 });

// Virtual for checking if chat is read-only (expired)
chatSchema.virtual("isReadOnly").get(function () {
  if (!this.ExpiresAt) return false;
  return new Date() > this.ExpiresAt;
});

// Method to check if chat is available for user
chatSchema.methods.isChatAvailable = function () {
  if (!this.IsActive || this.IsArchived) {
    return { available: false, readOnly: false };
  }
  
  if (!this.ExpiresAt) {
    // No expiry set (booking not completed yet)
    return { available: true, readOnly: false };
  }
  
  const now = new Date();
  if (now <= this.ExpiresAt) {
    // Within grace period
    return { available: true, readOnly: false };
  }
  
  // Expired - read-only mode
  return { available: true, readOnly: true };
};

// Static method to set expiry when booking completes
chatSchema.statics.setExpiryForBooking = async function (bookingId) {
  const expiresAt = new Date(); // Set to current time - chat becomes read-only immediately
  
  return this.findOneAndUpdate(
    { BookingID: bookingId },
    { ExpiresAt: expiresAt },
    { new: true }
  );
};

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
