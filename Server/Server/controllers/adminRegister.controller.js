import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";

export const createAdmin = async (req, res) => {
  try {
    const { username, password, secret } = req.body;

    // Validate the secret key first
    if (secret !== process.env.ADMIN_CREATION_SECRET) {
      return res.status(403).json({
        success: false,
        message: "Invalid secret key. Access denied.",
      });
    }

    // Check if an admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin with this username already exists.",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = new Admin({
      username,
      password: hashedPassword,
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: "Admin created successfully! You can now remove this route.",
      data: {
        id: admin._id,
        username: admin.username,
      },
    });
  } catch (error) {
    console.error("Admin creation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
