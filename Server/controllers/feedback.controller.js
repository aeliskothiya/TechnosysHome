import Feedback from "../models/Feedback.js";
import Booking from "../models/Booking.js";

// Submit or Update Feedback
export const submitFeedback = async (req, res) => {
  try {
    const { bookingId, rating, feedbackText } = req.body;
    const customerId = req.userId;

    if (!bookingId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Booking ID and rating are required",
      });
    }

    // Verify booking exists and belongs to customer
    const booking = await Booking.findOne({
      _id: bookingId,
      CustomerID: customerId,
      Status: "Completed",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Completed booking not found",
      });
    }

    // Check if feedback already exists
    let feedback = await Feedback.findOne({ BookingID: bookingId });

    if (feedback) {
      // Update existing feedback
      feedback.Rating = rating;
      feedback.FeedbackText = feedbackText || "";
      await feedback.save();

      return res.status(200).json({
        success: true,
        message: "Feedback updated successfully",
        feedback,
      });
    } else {
      // Create new feedback
      feedback = await Feedback.create({
        BookingID: bookingId,
        Rating: rating,
        FeedbackText: feedbackText || "",
      });

      return res.status(201).json({
        success: true,
        message: "Feedback submitted successfully",
        feedback,
      });
    }
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
      error: error.message,
    });
  }
};

// Get Feedback for a Booking
export const getFeedback = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const customerId = req.userId;

    // Verify booking belongs to customer
    const booking = await Booking.findOne({
      _id: bookingId,
      CustomerID: customerId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const feedback = await Feedback.findOne({ BookingID: bookingId });

    return res.status(200).json({
      success: true,
      feedback: feedback || null,
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedback",
      error: error.message,
    });
  }
};

// Get All Feedbacks for Customer's Bookings
export const getCustomerFeedbacks = async (req, res) => {
  try {
    const customerId = req.userId;

    // Get all customer's completed bookings
    const bookings = await Booking.find({
      CustomerID: customerId,
      Status: "Completed",
    }).select("_id");

    const bookingIds = bookings.map((b) => b._id);

    // Get feedbacks for those bookings
    const feedbacks = await Feedback.find({
      BookingID: { $in: bookingIds },
    }).populate("BookingID");

    return res.status(200).json({
      success: true,
      feedbacks,
    });
  } catch (error) {
    console.error("Error fetching customer feedbacks:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedbacks",
      error: error.message,
    });
  }
};

// Get All Feedbacks (Admin)
export const getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate({
        path: "BookingID",
        populate: [
          { path: "CustomerID", select: "FirstName LastName Name MobileNumber Email" },
          { path: "TechnicianID", select: "Name MobileNumber Email" },
          { path: "SubCategoryID", select: "name price" },
        ],
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      feedbacks,
    });
  } catch (error) {
    console.error("Error fetching all feedbacks:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedbacks",
      error: error.message,
    });
  }
};

// Get All Feedbacks for Technician's Bookings
export const getTechnicianFeedbacks = async (req, res) => {
  try {
    const technicianId = req.userId;

    // Get all technician's completed bookings
    const bookings = await Booking.find({
      TechnicianID: technicianId,
      Status: "Completed",
    }).select("_id");

    const bookingIds = bookings.map((b) => b._id);

    // Get feedbacks for those bookings
    const feedbacks = await Feedback.find({
      BookingID: { $in: bookingIds },
    }).populate({
      path: "BookingID",
      populate: [
        { path: "CustomerID", select: "FirstName LastName Name MobileNumber" },
        { path: "SubCategoryID", select: "name price" },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      feedbacks,
    });
  } catch (error) {
    console.error("Error fetching technician feedbacks:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedbacks",
      error: error.message,
    });
  }
};
