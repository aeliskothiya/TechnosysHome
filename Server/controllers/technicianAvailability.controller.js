import TechnicianAvailability from "../models/TechnicianAvailability.js";
import Technician from "../models/Technician.js";

// Create or update availability for a technician on a date
export const upsertAvailability = async (req, res) => {
  try {
    const userType = req.userType; // set by middleware
    const userId = req.userId;

    // Prefer technician from token for security
    const technicianId = userType === "technician" ? userId : req.body.technicianId;
    if (!technicianId) return res.status(400).json({ success: false, message: "technicianId required" });

    const { date, timeSlots } = req.body;
    if (!date || !Array.isArray(timeSlots)) {
      return res.status(400).json({ success: false, message: "date and timeSlots (array) are required" });
    }

    // Optionally validate technician exists for non-admin callers
    const tech = await Technician.findById(technicianId);
    if (!tech) return res.status(404).json({ success: false, message: "Technician not found" });

    const payload = {
      technicianId,
      date,
      timeSlots: timeSlots.map((s) => ({ slot: s, status: "available" })),
    };

    const doc = await TechnicianAvailability.findOneAndUpdate(
      { technicianId, date },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get availability for a technician and date
export const getAvailability = async (req, res) => {
  try {
    const technicianId = req.params.technicianId || req.query.technicianId;
    const date = req.query.date; // YYYY-MM-DD

    if (!technicianId) return res.status(400).json({ success: false, message: "technicianId required" });
    if (!date) return res.status(400).json({ success: false, message: "date query param required" });

    const doc = await TechnicianAvailability.findOne({ technicianId, date });
    if (!doc) return res.json({ success: true, data: { technicianId, date, timeSlots: [] } });

    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Optional: list availability for a technician (all dates)
export const listAvailability = async (req, res) => {
  try {
    const technicianId = req.params.technicianId || req.query.technicianId || req.userId;
    if (!technicianId) return res.status(400).json({ success: false, message: "technicianId required" });

    const date = req.query.date;
    if (date) {
      const doc = await TechnicianAvailability.findOne({ technicianId, date });
      if (!doc) return res.json({ success: true, data: { technicianId, date, timeSlots: [] } });
      return res.json({ success: true, data: doc });
    }

    const docs = await TechnicianAvailability.find({ technicianId }).sort({ date: 1 });
    return res.json({ success: true, data: docs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
