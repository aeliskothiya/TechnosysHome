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

    // Normalize requested slots
    const requestedSlots = timeSlots.map((s) => String(s).trim());

    // Protection checks: cannot modify slots starting within 2 hours or already booked
    const twoHoursFromNow = Date.now() + 2 * 60 * 60 * 1000;

    // Load existing availability doc if any
    let doc = await TechnicianAvailability.findOne({ technicianId, date });

    // Validate requested slots
    for (const slot of requestedSlots) {
      const startPart = String(slot).split('-')[0];
      const slotStart = new Date(`${date}T${startPart}:00`);
      if (isNaN(slotStart.getTime())) {
        return res.status(400).json({ success: false, message: `Invalid slot format: ${slot}` });
      }
      if (slotStart.getTime() < twoHoursFromNow) {
        return res.status(400).json({ success: false, message: `Cannot modify slot ${slot} because it starts within 2 hours` });
      }
      const existing = doc?.timeSlots?.find((ts) => ts.slot === slot);
      if (existing && existing.status === 'booked') {
        return res.status(400).json({ success: false, message: `Cannot modify slot ${slot} because it is already booked` });
      }
    }

    // All validations passed. Merge requested slots into existing doc, preserving booked slots.
    if (doc) {
      // Preserve booked slots
      const newTimeSlots = [];
      for (const ts of doc.timeSlots || []) {
        if (ts.status === 'booked') newTimeSlots.push({ slot: ts.slot, status: 'booked' });
      }

      // Add requested slots as available (avoid duplicates)
      for (const slot of requestedSlots) {
        if (!newTimeSlots.find((t) => t.slot === slot)) {
          newTimeSlots.push({ slot, status: 'available' });
        }
      }

      doc.timeSlots = newTimeSlots;
      await doc.save();
      return res.json({ success: true, data: doc });
    }

    // Create new document - ensure none start within 2 hours (already checked)
    const payload = {
      technicianId,
      date,
      timeSlots: requestedSlots.map((s) => ({ slot: s, status: 'available' })),
    };
    const created = await TechnicianAvailability.create(payload);
    return res.json({ success: true, data: created });
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
