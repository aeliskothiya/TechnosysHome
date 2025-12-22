import Booking from "../models/Booking.js";
import SubServiceCategory from "../models/SubServiceCategory.js";

// Get top booked services (featured services)
export const getFeaturedServices = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    // Aggregate bookings by SubCategoryID and count
    const topServices = await Booking.aggregate([
      {
        $match: {
          Status: { $in: ["Completed", "In-Progress", "Confirmed"] }
        }
      },
      {
        $group: {
          _id: "$SubCategoryID",
          bookingCount: { $sum: 1 }
        }
      },
      {
        $sort: { bookingCount: -1 }
      },
      {
        $limit: limit
      }
    ]);

    // Get service details for top services
    const serviceIds = topServices.map(s => s._id);
    const services = await SubServiceCategory.find({
      _id: { $in: serviceIds },
      isActive: true
    })
      .populate('serviceCategoryId', 'name')
      .lean();

    // Combine booking count with service details
    const featuredServices = services.map(service => {
      const bookingData = topServices.find(
        t => t._id.toString() === service._id.toString()
      );
      return {
        ...service,
        bookingCount: bookingData?.bookingCount || 0
      };
    });

    // Sort by booking count
    featuredServices.sort((a, b) => b.bookingCount - a.bookingCount);

    res.json({
      success: true,
      services: featuredServices
    });
  } catch (error) {
    console.error("Get featured services error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured services"
    });
  }
};
