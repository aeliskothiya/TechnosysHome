import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    ChatID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    SenderID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    SenderType: {
      type: String,
      enum: ["customer", "technician"],
      required: true,
    },
    MessageText: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
    Attachments: [
      {
        filename: String,
        originalName: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    MessageType: {
      type: String,
      enum: ["text", "image", "system"],
      default: "text",
    },
    DeliveredAt: {
      type: Date,
      default: null,
    },
    ReadAt: {
      type: Date,
      default: null,
    },
    IsDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient message retrieval
messageSchema.index({ ChatID: 1, createdAt: -1 });
messageSchema.index({ ChatID: 1, ReadAt: 1 }); // For unread messages

// Virtual for delivery status
messageSchema.virtual("status").get(function () {
  if (this.ReadAt) return "read";
  if (this.DeliveredAt) return "delivered";
  return "sent";
});

// Method to mark as delivered
messageSchema.methods.markDelivered = function () {
  if (!this.DeliveredAt) {
    this.DeliveredAt = new Date();
  }
  return this.save();
};

// Method to mark as read
messageSchema.methods.markRead = function () {
  if (!this.ReadAt) {
    this.ReadAt = new Date();
    if (!this.DeliveredAt) {
      this.DeliveredAt = new Date();
    }
  }
  return this.save();
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = async function (chatId, userId, userType) {
  return this.countDocuments({
    ChatID: chatId,
    SenderID: { $ne: userId },
    ReadAt: null,
    IsDeleted: false,
  });
};

// Static method to mark all messages as read
messageSchema.statics.markAllRead = async function (chatId, userId, userType) {
  const now = new Date();
  return this.updateMany(
    {
      ChatID: chatId,
      SenderID: { $ne: userId },
      ReadAt: null,
      IsDeleted: false,
    },
    {
      $set: {
        ReadAt: now,
        DeliveredAt: now,
      },
    }
  );
};

const Message = mongoose.model("Message", messageSchema);
export default Message;
