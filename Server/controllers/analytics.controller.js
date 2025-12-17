import Booking from "../models/Booking.js";
import Customer from "../models/Customer.js";
import Technician from "../models/Technician.js";
import CustomerPayment from "../models/CustomerPayment.js";
import SubscriptionPayment from "../models/SubscriptionPayment.js";
import Feedback from "../models/Feedback.js";
import Complaint from "../models/Complaint.js";
import ServiceCategory from "../models/ServiceCategory.js";
import SubServiceCategory from "../models/SubServiceCategory.js";
import mongoose from "mongoose";

// Get dashboard analytics
export const getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const date = now.getUTCDate();
    
    const startOfToday = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const startOfLastMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfLastMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // KPIs - Total Revenue (from technician subscription payments - this is platform revenue)
    const totalRevenueResult = await SubscriptionPayment.aggregate([
      { $match: { Status: "Success" } },
      { $group: { _id: null, total: { $sum: "$Amount" } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Last month revenue for growth calculation
    const lastMonthRevenueResult = await SubscriptionPayment.aggregate([
      {
        $match: {
          Status: "Success",
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        }
      },
      { $group: { _id: null, total: { $sum: "$Amount" } } }
    ]);
    const lastMonthRevenue = lastMonthRevenueResult[0]?.total || 1;
    const currentMonthRevenueResult = await SubscriptionPayment.aggregate([
      {
        $match: {
          Status: "Success",
          createdAt: { $gte: startOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: "$Amount" } } }
    ]);
    const currentMonthRevenue = currentMonthRevenueResult[0]?.total || 0;
    const revenueGrowth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1);

    // Total Bookings
    const totalBookings = await Booking.countDocuments();
    const lastMonthBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });
    const currentMonthBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const bookingsGrowth = lastMonthBookings > 0 
      ? ((currentMonthBookings - lastMonthBookings) / lastMonthBookings * 100).toFixed(1)
      : 0;

    // Active Customers
    const activeCustomers = await Customer.countDocuments();
    const lastMonthCustomers = await Customer.countDocuments({
      createdAt: { $lte: endOfLastMonth }
    });
    const customersGrowth = lastMonthCustomers > 0
      ? ((activeCustomers - lastMonthCustomers) / lastMonthCustomers * 100).toFixed(1)
      : 0;

    // Active Technicians
    const activeTechnicians = await Technician.countDocuments({
      VerifyStatus: "Approved",
      ActiveStatus: "Active"
    });
    const lastMonthTechnicians = await Technician.countDocuments({
      VerifyStatus: "Approved",
      ActiveStatus: "Active",
      createdAt: { $lte: endOfLastMonth }
    });
    const techniciansGrowth = lastMonthTechnicians > 0
      ? ((activeTechnicians - lastMonthTechnicians) / lastMonthTechnicians * 100).toFixed(1)
      : 0;

    // Today's Stats (from both subscription and customer payments)
    const todaySubRevenue = await SubscriptionPayment.aggregate([
      {
        $match: {
          Status: "Success",
          createdAt: { $gte: startOfToday }
        }
      },
      { $group: { _id: null, total: { $sum: "$Amount" } } }
    ]);

    const todayCustomerRevenue = await CustomerPayment.aggregate([
      {
        $match: {
          Status: "Success",
          createdAt: { $gte: startOfToday }
        }
      },
      { $group: { _id: null, total: { $sum: "$Amount" } } }
    ]);

    const todayRevenue = (todaySubRevenue[0]?.total || 0) + (todayCustomerRevenue[0]?.total || 0);
    
    const todayBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfToday }
    });

    const newCustomers = await Customer.countDocuments({
      createdAt: { $gte: startOfToday }
    });

    // Pending Actions
    const pendingApprovals = await Technician.countDocuments({
      VerifyStatus: "Pending"
    });

    const pendingComplaints = await Complaint.countDocuments({
      Status: "Pending"
    });

    const autoCancelledToday = await Booking.countDocuments({
      Status: "AutoCancelled",
      updatedAt: { $gte: startOfToday }
    });

    // Low-rated technicians (rating < 3.0)
    const lowRatedTechs = await Feedback.aggregate([
      {
        $lookup: {
          from: "bookings",
          localField: "BookingID",
          foreignField: "_id",
          as: "booking"
        }
      },
      { $unwind: "$booking" },
      {
        $group: {
          _id: "$booking.TechnicianID",
          avgRating: { $avg: "$Rating" }
        }
      },
      {
        $match: {
          avgRating: { $lt: 3.0 }
        }
      },
      { $count: "total" }
    ]);

    res.json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          revenueGrowth: parseFloat(revenueGrowth),
          totalBookings,
          bookingsGrowth: parseFloat(bookingsGrowth),
          activeCustomers,
          customersGrowth: parseFloat(customersGrowth),
          activeTechnicians,
          techniciansGrowth: parseFloat(techniciansGrowth)
        },
        todayStats: {
          todayRevenue: todayRevenue,
          todayBookings,
          newCustomers,
          activeUsersNow: 0 // This would need WebSocket/real-time tracking
        },
        pendingActions: {
          pendingApprovals,
          pendingComplaints,
          autoCancelledToday,
          lowRatedTechs: lowRatedTechs[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard analytics",
      error: error.message
    });
  }
};

// Get weekly revenue data (from subscription payments)
export const getWeeklyRevenue = async (req, res) => {
  try {
    // Get dates using UTC to match MongoDB storage
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const date = today.getUTCDate();
    
    const startOfToday = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
    const startOfWeek = new Date(Date.UTC(year, month, date - 6, 0, 0, 0, 0));
    const endOfTomorrow = new Date(Date.UTC(year, month, date + 1, 0, 0, 0, 0));

    const weeklySubData = await SubscriptionPayment.aggregate([
      {
        $match: {
          Status: "Success",
          createdAt: { $gte: startOfWeek, $lt: endOfTomorrow }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$Amount" }
        }
      }
    ]);

    // Get revenue from service bookings
    const weeklyCustomerData = await CustomerPayment.aggregate([
      {
        $match: {
          Status: "Success",
          createdAt: { $gte: startOfWeek, $lt: endOfTomorrow }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$Amount" }
        }
      }
    ]);

    // Merge subscription and customer payment data
    const mergedRevenue = {};
    weeklySubData.forEach(item => {
      mergedRevenue[item._id] = (mergedRevenue[item._id] || 0) + item.revenue;
    });
    weeklyCustomerData.forEach(item => {
      mergedRevenue[item._id] = (mergedRevenue[item._id] || 0) + item.revenue;
    });

    // Get booking counts for each day
    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek, $lt: endOfTomorrow }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          bookings: { $count: {} }
        }
      }
    ]);

    // Format data with day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const formattedData = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = dayNames[date.getDay()];

      const revenue = mergedRevenue[dateStr] || 0;
      const bookingData = bookingCounts.find(d => d._id === dateStr);

      formattedData.push({
        day: dayName,
        revenue: revenue,
        bookings: bookingData?.bookings || 0
      });
    }

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching weekly revenue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch weekly revenue",
      error: error.message
    });
  }
};

// Get monthly revenue for current year
export const getMonthlyRevenue = async (req, res) => {
  try {
    const currentYear = new Date().getUTCFullYear();
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));

    // Get revenue from subscriptions
    const monthlySubData = await SubscriptionPayment.aggregate([
      {
        $match: {
          Status: "Success",
          createdAt: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: {
            $month: "$createdAt"
          },
          revenue: { $sum: "$Amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get revenue from service bookings
    const monthlyCustomerData = await CustomerPayment.aggregate([
      {
        $match: {
          Status: "Success",
          createdAt: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: {
            $month: "$createdAt"
          },
          revenue: { $sum: "$Amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Merge subscription and customer payment data
    const mergedRevenue = {};
    monthlySubData.forEach(item => {
      mergedRevenue[item._id] = (mergedRevenue[item._id] || 0) + item.revenue;
    });
    monthlyCustomerData.forEach(item => {
      mergedRevenue[item._id] = (mergedRevenue[item._id] || 0) + item.revenue;
    });

    // Get booking counts for each month
    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: {
            $month: "$createdAt"
          },
          bookings: { $count: {} }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format data with month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedData = [];

    for (let month = 1; month <= 12; month++) {
      const revenue = mergedRevenue[month] || 0;
      const bookingData = bookingCounts.find(d => d._id === month);

      formattedData.push({
        month: monthNames[month - 1],
        revenue: revenue,
        bookings: bookingData?.bookings || 0
      });
    }

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching monthly revenue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly revenue",
      error: error.message
    });
  }
};

// Get booking status distribution
export const getBookingStatusDistribution = async (req, res) => {
  try {
    const statusData = await Booking.aggregate([
      {
        $group: {
          _id: "$Status",
          count: { $count: {} }
        }
      }
    ]);

    const colors = {
      Completed: '#10B981',
      Confirmed: '#3B82F6',
      Pending: '#F59E0B',
      'In-Progress': '#8B5CF6',
      Cancelled: '#EF4444',
      AutoCancelled: '#F97316',
      Rejected: '#DC2626'
    };

    const formattedData = statusData.map(item => ({
      name: item._id,
      value: item.count,
      color: colors[item._id] || '#6B7280'
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching booking status distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking status distribution",
      error: error.message
    });
  }
};

// Get revenue by service category (booking count, not payment revenue since customers pay technicians)
export const getRevenueByService = async (req, res) => {
  try {
    const revenueData = await Booking.aggregate([
      {
        $lookup: {
          from: "subservicecategories",
          localField: "SubCategoryID",
          foreignField: "_id",
          as: "subCategory"
        }
      },
      { $unwind: { path: "$subCategory", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "servicecategories",
          localField: "subCategory.serviceCategoryId",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$category._id",
          category: { $first: "$category.name" },
          revenue: { $sum: { $ifNull: ["$subCategory.price", 0] } },
          bookings: { $count: {} }
        }
      },
      { $sort: { bookings: -1 } }
    ]);

    const formattedData = revenueData.map(item => ({
      category: item.category || "Uncategorized",
      revenue: item.revenue,
      bookings: item.bookings
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching revenue by service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue by service",
      error: error.message
    });
  }
};

// Get peak hours data
export const getPeakHours = async (req, res) => {
  try {
    const peakData = await Booking.aggregate([
      {
        $group: {
          _id: "$TimeSlot",
          bookings: { $count: {} }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formattedData = peakData.map(item => ({
      hour: item._id,
      bookings: item.bookings
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching peak hours:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch peak hours",
      error: error.message
    });
  }
};

// Get top technicians
export const getTopTechnicians = async (req, res) => {
  try {
    const topTechs = await Booking.aggregate([
      {
        $match: {
          Status: "Completed",
          TechnicianID: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$TechnicianID",
          completed: { $count: {} }
        }
      },
      {
        $lookup: {
          from: "technicians",
          localField: "_id",
          foreignField: "_id",
          as: "technician"
        }
      },
      { $unwind: "$technician" },
      {
        $lookup: {
          from: "customerpayments",
          let: { techId: "$_id" },
          pipeline: [
            {
              $lookup: {
                from: "bookings",
                localField: "BookingID",
                foreignField: "_id",
                as: "booking"
              }
            },
            { $unwind: "$booking" },
            {
              $match: {
                $expr: { $eq: ["$booking.TechnicianID", "$$techId"] },
                Status: { $in: ["Success", "Captured"] }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$Amount" }
              }
            }
          ],
          as: "earnings"
        }
      },
      {
        $lookup: {
          from: "feedbacks",
          let: { techId: "$_id" },
          pipeline: [
            {
              $lookup: {
                from: "bookings",
                localField: "BookingID",
                foreignField: "_id",
                as: "booking"
              }
            },
            { $unwind: "$booking" },
            {
              $match: {
                $expr: { $eq: ["$booking.TechnicianID", "$$techId"] }
              }
            },
            {
              $group: {
                _id: null,
                avgRating: { $avg: "$Rating" }
              }
            }
          ],
          as: "rating"
        }
      },
      {
        $project: {
          name: "$technician.Name",
          completed: 1,
          earnings: { $ifNull: [{ $arrayElemAt: ["$earnings.total", 0] }, 0] },
          rating: { $ifNull: [{ $arrayElemAt: ["$rating.avgRating", 0] }, 0] }
        }
      },
      { $sort: { completed: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      data: topTechs
    });
  } catch (error) {
    console.error("Error fetching top technicians:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top technicians",
      error: error.message
    });
  }
};

// Get top services
export const getTopServices = async (req, res) => {
  try {
    const topServices = await Booking.aggregate([
      {
        $lookup: {
          from: "subservicecategories",
          localField: "SubCategoryID",
          foreignField: "_id",
          as: "subCategory"
        }
      },
      { $unwind: { path: "$subCategory", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "servicecategories",
          localField: "subCategory.serviceCategoryId",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$category._id",
          name: { $first: "$category.name" },
          bookings: { $count: {} },
          revenue: { $sum: { $ifNull: ["$subCategory.price", 0] } }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 5 }
    ]);

    // Calculate trend (simplified - comparing with 30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const formattedData = await Promise.all(
      topServices.map(async (service) => {
        const oldCount = await Booking.countDocuments({
          SubCategoryID: { $exists: true },
          createdAt: { $lt: thirtyDaysAgo }
        });
        const trend = oldCount > 0 ? ((service.bookings - oldCount) / oldCount * 100).toFixed(0) : 0;

        return {
          name: service.name || "Uncategorized",
          bookings: service.bookings,
          revenue: service.revenue,
          trend: parseFloat(trend)
        };
      })
    );

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching top services:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top services",
      error: error.message
    });
  }
};

// Get top locations
export const getTopLocations = async (req, res) => {
  try {
    const topLocations = await Customer.aggregate([
      {
        $match: {
          "Address.city": { $exists: true, $ne: "" }
        }
      },
      {
        $lookup: {
          from: "bookings",
          localField: "_id",
          foreignField: "CustomerID",
          as: "bookings"
        }
      },
      {
        $group: {
          _id: "$Address.city",
          bookings: { $sum: { $size: "$bookings" } }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 5 }
    ]);

    const formattedData = topLocations.map(item => ({
      city: item._id,
      bookings: item.bookings
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching top locations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top locations",
      error: error.message
    });
  }
};

// Get performance metrics
export const getPerformanceMetrics = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ Status: "Completed" });
    const cancelledBookings = await Booking.countDocuments({
      Status: { $in: ["Cancelled", "AutoCancelled"] }
    });

    // Average response time (time between booking creation and technician acceptance)
    const responseTimeData = await Booking.aggregate([
      {
        $match: {
          AcceptedAt: { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ["$AcceptedAt", "$createdAt"] },
              1000 * 60 // Convert to minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: "$responseTime" }
        }
      }
    ]);

    // Average customer satisfaction
    const satisfactionData = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$Rating" }
        }
      }
    ]);

    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(1) : 0;
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings * 100).toFixed(1) : 0;
    const avgResponseTime = responseTimeData[0]?.avgResponseTime?.toFixed(0) || 0;
    const customerSatisfaction = satisfactionData[0]?.avgRating?.toFixed(1) || 0;

    res.json({
      success: true,
      data: {
        completionRate: parseFloat(completionRate),
        avgResponseTime: parseFloat(avgResponseTime),
        customerSatisfaction: parseFloat(customerSatisfaction),
        cancellationRate: parseFloat(cancellationRate)
      }
    });
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch performance metrics",
      error: error.message
    });
  }
};

// Get financial summary (platform earnings from subscriptions)
export const getFinancialSummary = async (req, res) => {
  try {
    // Platform earnings (total successful subscription payments)
    const earningsData = await SubscriptionPayment.aggregate([
      {
        $match: {
          Status: "Success"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$Amount" }
        }
      }
    ]);

    // Pending payouts (would need TechnicianWallet model)
    const pendingPayouts = 0; // Implement based on your payout logic

    // Refunds processed
    const refundsData = await SubscriptionPayment.aggregate([
      {
        $match: {
          Status: "Failed"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$Amount" }
        }
      }
    ]);

    // Payment methods distribution (from subscription payments)
    const paymentMethods = await SubscriptionPayment.aggregate([
      {
        $match: {
          Status: "Success"
        }
      },
      {
        $group: {
          _id: "$Method",
          count: { $count: {} }
        }
      }
    ]);

    const totalPayments = paymentMethods.reduce((sum, m) => sum + m.count, 0);
    const formattedMethods = paymentMethods.map(m => ({
      method: m._id,
      count: m.count,
      percentage: totalPayments > 0 ? Math.round(m.count / totalPayments * 100) : 0
    }));

    res.json({
      success: true,
      data: {
        platformEarnings: earningsData[0]?.total || 0,
        pendingPayouts,
        refundsProcessed: refundsData[0]?.total || 0,
        paymentMethods: formattedMethods
      }
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch financial summary",
      error: error.message
    });
  }
};

// Get most booked sub-services
export const getMostBookedServices = async (req, res) => {
  try {
    const mostBooked = await Booking.aggregate([
      {
        $lookup: {
          from: "subservicecategories",
          localField: "SubCategoryID",
          foreignField: "_id",
          as: "subCategory"
        }
      },
      { $unwind: { path: "$subCategory", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "servicecategories",
          localField: "subCategory.serviceCategoryId",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$SubCategoryID",
          name: { $first: "$subCategory.name" },
          categoryId: { $first: "$category._id" },
          categoryName: { $first: "$category.name" },
          bookings: { $count: {} },
          price: { $first: "$subCategory.price" }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 }
    ]);

    const formattedData = mostBooked.map(item => ({
      name: item.name || "Uncategorized",
      bookings: item.bookings,
      value: item.bookings,
      categoryId: item.categoryId ? item.categoryId.toString() : null,
      categoryName: item.categoryName || "Uncategorized"
    }));

    console.log('Most Booked Services Data:', JSON.stringify(formattedData, null, 2));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching most booked services:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch most booked services",
      error: error.message
    });
  }
};
