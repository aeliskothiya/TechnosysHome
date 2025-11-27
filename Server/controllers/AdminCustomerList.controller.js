import Customer from "../models/Customer.js";

// Returns all customers with a computed `isProfileComplete` flag.
// A profile is considered complete when all main fields are present and non-empty.
export const getAllCustomers = async (req, res) => {
  try {
    // Pagination params
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.max(1, parseInt(req.query.pageSize || "10", 10));
    const q = (req.query.q || "").trim();

    const filter = {};
    if (q) {
      // simple text search on Name, Email, Mobile
      filter.$or = [
        { Name: { $regex: q, $options: "i" } },
        { Email: { $regex: q, $options: "i" } },
        { Mobile: { $regex: q, $options: "i" } },
      ];
    }

    const totalCount = await Customer.countDocuments(filter);

    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const processed = customers.map((c) => {
      const hasName = c.Name && String(c.Name).trim().length > 0;
      const hasMobile = c.Mobile && String(c.Mobile).trim().length > 0;
      const hasEmail = c.Email && String(c.Email).trim().length > 0;
      const hasAddress = c.Address && String(c.Address).trim().length > 0;

      const isProfileComplete = hasName && hasMobile && hasEmail && hasAddress;

      return {
        ...c,
        isProfileComplete,
      };
    });

    return res.json({ success: true, customers: processed, page, pageSize, totalCount });
  } catch (err) {
    console.error("getAllCustomers error", err);
    return res.status(500).json({ success: false, message: "Failed to fetch customers" });
  }
};


export const getAllCustomersRaw = async (req, res) => {
  try {
    const customers = await Customer.find({}).sort({ createdAt: -1 }).lean();

    const processed = customers.map((c) => {
      const hasName = c.Name && c.Name.trim().length > 0;
      const hasMobile = c.Mobile && c.Mobile.trim().length > 0;
      const hasEmail = c.Email && c.Email.trim().length > 0;
      const hasAddress = c.Address && c.Address.trim().length > 0;

      return {
        ...c,
        isProfileComplete: hasName && hasMobile && hasEmail && hasAddress,
      };
    });

    res.json({ success: true, customers: processed });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load" });
  }
};


export default {
  getAllCustomers,
  getAllCustomersRaw,
};


