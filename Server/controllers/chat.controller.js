import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import Booking from "../models/Booking.js";
import { getIo } from "../config/realtime.js";

// Create or get existing chat for a booking
export async function createOrGetChat(req, res) {
  try {
    const { bookingId } = req.params;
    const userId = req.userId || req.user?._id;

    // Verify booking exists and user is participant
    const booking = await Booking.findById(bookingId)
      .populate("CustomerID", "FirstName LastName Email")
      .populate("TechnicianID", "Name Email")
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const userIdStr = String(userId);
    const isCustomer = String(booking.CustomerID._id) === userIdStr;
    const isTechnician = String(booking.TechnicianID._id) === userIdStr;

    if (!isCustomer && !isTechnician) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({ BookingID: bookingId });

    if (!chat) {
      // Create new chat
      chat = await Chat.create({
        BookingID: bookingId,
        CustomerID: booking.CustomerID._id,
        TechnicianID: booking.TechnicianID._id,
      });
    }

    // Check availability status
    const availability = chat.isChatAvailable();

    return res.json({
      success: true,
      chat: {
        _id: chat._id,
        BookingID: chat.BookingID,
        CustomerID: chat.CustomerID,
        TechnicianID: chat.TechnicianID,
        LastMessageAt: chat.LastMessageAt,
        ExpiresAt: chat.ExpiresAt,
        IsActive: chat.IsActive,
        ...availability,
      },
      booking: {
        _id: booking._id,
        Status: booking.Status,
        Date: booking.Date,
        TimeSlot: booking.TimeSlot,
        Customer: booking.CustomerID,
        Technician: booking.TechnicianID,
      },
      userRole: isCustomer ? "customer" : "technician",
    });
  } catch (err) {
    console.error("createOrGetChat error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// Get message history with pagination
export async function getMessages(req, res) {
  try {
    const { bookingId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.userId || req.user?._id;

    // Verify chat access
    const chat = await Chat.findOne({ BookingID: bookingId });
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    const userIdStr = String(userId);
    const isAuthorized =
      String(chat.CustomerID) === userIdStr || String(chat.TechnicianID) === userIdStr;

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // Get messages with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await Message.find({
      ChatID: chat._id,
      IsDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalMessages = await Message.countDocuments({
      ChatID: chat._id,
      IsDeleted: false,
    });

    const userType = String(chat.CustomerID) === userIdStr ? "customer" : "technician";
    const unreadCount = await Message.getUnreadCount(chat._id, userId, userType);

    return res.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalMessages,
        totalPages: Math.ceil(totalMessages / parseInt(limit)),
        hasMore: skip + messages.length < totalMessages,
      },
      unreadCount,
    });
  } catch (err) {
    console.error("getMessages error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// Send a message (REST endpoint for fallback)
export async function sendMessage(req, res) {
  try {
    const { bookingId } = req.params;
    const { messageText } = req.body;
    const userId = req.userId || req.user?._id;
    const files = req.files || [];

    // Verify chat access
    const chat = await Chat.findOne({ BookingID: bookingId });
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    const userIdStr = String(userId);
    const isCustomer = String(chat.CustomerID) === userIdStr;
    const isTechnician = String(chat.TechnicianID) === userIdStr;

    if (!isCustomer && !isTechnician) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // Check if chat is available
    const availability = chat.isChatAvailable();
    if (!availability.available || availability.readOnly) {
      return res.status(403).json({
        success: false,
        message: availability.readOnly
          ? "This chat has expired and is read-only"
          : "Chat is not available",
      });
    }

    const senderType = isCustomer ? "customer" : "technician";

    // Validate message content
    if (!messageText?.trim() && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message text or attachments required",
      });
    }

    // Process attachments
    const attachments = files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    }));

    // Create message
    const message = await Message.create({
      ChatID: chat._id,
      SenderID: userId,
      SenderType: senderType,
      MessageText: messageText?.trim() || "",
      Attachments: attachments,
      MessageType: attachments.length > 0 ? "image" : "text",
      DeliveredAt: new Date(),
    });

    // Update chat last message time
    chat.LastMessageAt = new Date();

    // Increment unread count for receiver
    if (isCustomer) {
      chat.UnreadCountTechnician += 1;
    } else {
      chat.UnreadCountCustomer += 1;
    }

    await chat.save();

    // Socket event will be emitted by the frontend after receiving response
    // This prevents duplicate messages in the chat

    return res.json({
      success: true,
      message: {
        _id: message._id,
        ChatID: message.ChatID,
        SenderID: message.SenderID,
        SenderType: message.SenderType,
        MessageText: message.MessageText,
        Attachments: message.Attachments,
        MessageType: message.MessageType,
        createdAt: message.createdAt,
        DeliveredAt: message.DeliveredAt,
        ReadAt: message.ReadAt,
      },
    });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// Mark messages as read
export async function markMessagesRead(req, res) {
  try {
    const { bookingId } = req.params;
    const { messageIds } = req.body; // Accept specific message IDs
    const userId = req.userId || req.user?._id;

    const chat = await Chat.findOne({ BookingID: bookingId });
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    const userIdStr = String(userId);
    const isCustomer = String(chat.CustomerID) === userIdStr;
    const isTechnician = String(chat.TechnicianID) === userIdStr;

    if (!isCustomer && !isTechnician) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const userType = isCustomer ? "customer" : "technician";

    // Mark specific messages or all unread messages as read
    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      // Mark specific messages
      const now = new Date();
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          ChatID: chat._id,
          SenderID: { $ne: userId },
          ReadAt: null,
        },
        {
          $set: {
            ReadAt: now,
            DeliveredAt: now,
          },
        }
      );
    } else {
      // Mark all unread messages as read
      await Message.markAllRead(chat._id, userId, userType);
    }

    // Recalculate unread count
    const remainingUnread = await Message.getUnreadCount(chat._id, userId, userType);
    
    // Update chat unread count
    if (isCustomer) {
      chat.UnreadCountCustomer = remainingUnread;
    } else {
      chat.UnreadCountTechnician = remainingUnread;
    }
    await chat.save();

    // Emit socket event to sender (for read receipts)
    try {
      const io = getIo();
      const senderId = isCustomer ? String(chat.TechnicianID) : String(chat.CustomerID);

      io.to(senderId).emit("messages-read", {
        chatId: String(chat._id),
        bookingId: String(chat.BookingID),
        messageIds: messageIds || [],
        readBy: userType,
        readAt: new Date(),
      });
    } catch (socketErr) {
      console.error("Socket emit failed:", socketErr);
    }

    return res.json({ success: true, message: "Messages marked as read", unreadCount: remainingUnread });
  } catch (err) {
    console.error("markMessagesRead error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// Get all active chats for a user
export async function getUserChats(req, res) {
  try {
    const userId = req.userId || req.user?._id;
    const userType = req.userType || req.user?.type; // Assuming userType is set in auth middleware

    const query = userType === "customer" 
      ? { CustomerID: userId, IsActive: true }
      : { TechnicianID: userId, IsActive: true };

    const chats = await Chat.find(query)
      .populate("BookingID", "Status Date TimeSlot Address SubCategoryID")
      .populate({
        path: "BookingID",
        populate: { path: "SubCategoryID", select: "name" },
      })
      .populate("CustomerID", "FirstName LastName Email")
      .populate("TechnicianID", "Name Email")
      .sort({ LastMessageAt: -1 })
      .lean();

    // Add availability status and last message
    const chatsWithDetails = await Promise.all(
      chats.map(async (chat) => {
        const chatDoc = await Chat.findById(chat._id);
        const availability = chatDoc.isChatAvailable();

        const lastMessage = await Message.findOne({
          ChatID: chat._id,
          IsDeleted: false,
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...chat,
          ...availability,
          lastMessage,
          unreadCount:
            userType === "customer" ? chat.UnreadCountCustomer : chat.UnreadCountTechnician,
        };
      })
    );

    return res.json({ success: true, chats: chatsWithDetails });
  } catch (err) {
    console.error("getUserChats error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
