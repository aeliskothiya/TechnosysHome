import mongoose from "mongoose";
import Technician from "../models/Technician.js";
import Complaint from "../models/Complaint.js";
import Booking from "../models/Booking.js";
import 'dotenv/config';

const migrateComplaintCount = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to database");

    // Get all technicians
    const technicians = await Technician.find({});
    console.log(`📊 Found ${technicians.length} technicians`);

    for (const technician of technicians) {
      // Find all bookings for this technician
      const bookings = await Booking.find({ 
        TechnicianID: technician._id,
        Status: "Completed"
      }).select("_id");

      const bookingIds = bookings.map(b => b._id);

      // Count complaints for these bookings
      const complaintCount = await Complaint.countDocuments({
        BookingID: { $in: bookingIds }
      });

      // Update technician with complaint count
      technician.ComplaintCount = complaintCount;
      
      // Initialize deactivation fields if not present
      if (!technician.DeactivationReason) technician.DeactivationReason = "";
      if (!technician.TempDeactivationExpiry) technician.TempDeactivationExpiry = null;

      await technician.save();

      console.log(`✅ ${technician.Name} (${technician.Email}): ${complaintCount} complaints`);
    }

    console.log("\n🎉 Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrateComplaintCount();
