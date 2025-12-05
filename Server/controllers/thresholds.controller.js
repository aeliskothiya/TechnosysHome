import ComplaintThresholds from "../models/ComplaintThresholds.js";

// Get current threshold settings
export const getThresholds = async (req, res) => {
  try {
    let thresholds = await ComplaintThresholds.findOne();
    
    // Create default if doesn't exist
    if (!thresholds) {
      thresholds = await ComplaintThresholds.create({
        warningThreshold: 10,
        tempDeactivationThreshold: 20,
        permanentDeactivationThreshold: 30,
      });
    }

    return res.status(200).json({
      success: true,
      thresholds,
    });
  } catch (error) {
    console.error("Error fetching thresholds:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch thresholds",
      error: error.message,
    });
  }
};

// Update threshold settings (Admin only)
export const updateThresholds = async (req, res) => {
  try {
    const { warningThreshold, tempDeactivationThreshold, permanentDeactivationThreshold } = req.body;

    // Validation
    if (!warningThreshold || !tempDeactivationThreshold || !permanentDeactivationThreshold) {
      return res.status(400).json({
        success: false,
        message: "All threshold values are required",
      });
    }

    // Ensure logical ordering: warning < temp < permanent
    if (warningThreshold >= tempDeactivationThreshold || tempDeactivationThreshold >= permanentDeactivationThreshold) {
      return res.status(400).json({
        success: false,
        message: "Thresholds must be in ascending order: Warning < Temporary < Permanent",
      });
    }

    // Ensure all values are positive
    if (warningThreshold <= 0 || tempDeactivationThreshold <= 0 || permanentDeactivationThreshold <= 0) {
      return res.status(400).json({
        success: false,
        message: "All threshold values must be positive numbers",
      });
    }

    let thresholds = await ComplaintThresholds.findOne();
    
    if (!thresholds) {
      // Create new if doesn't exist
      thresholds = await ComplaintThresholds.create({
        warningThreshold,
        tempDeactivationThreshold,
        permanentDeactivationThreshold,
      });
    } else {
      // Update existing
      thresholds.warningThreshold = warningThreshold;
      thresholds.tempDeactivationThreshold = tempDeactivationThreshold;
      thresholds.permanentDeactivationThreshold = permanentDeactivationThreshold;
      await thresholds.save();
    }

    return res.status(200).json({
      success: true,
      message: "Thresholds updated successfully",
      thresholds,
    });
  } catch (error) {
    console.error("Error updating thresholds:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update thresholds",
      error: error.message,
    });
  }
};
