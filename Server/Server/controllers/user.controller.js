// import userModel from "../models/userModels.js";
// import UserGoogle from "../models/userGoogleModel.js";
// import Technician from "../models/Technician.js";
// import Admin from "../models/Admin.js";

// export const getUserData = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const provider = req.provider || 'local';

//     if (!userId) {
//       return res.json({ success: false, message: 'User ID is required' });
//     }

//     let user;
//     if (provider === 'google') {
//       user = await UserGoogle.findById(userId);
//       if (!user) return res.json({ success: false, message: 'User not Found' });
//       return res.json({
//         success: true,
//         userData: {
//           name: user.name,
//           email: user.email,
//           isAccountVerified: true,
//           avatar: user.picture
//         }
//       });
//     } else {
//       user = await Technician.findById(userId);
//       if (!user) return res.json({ success: false, message: 'User not Found' });
//       return res.json({
//         success: true,
//         userData: {
//           name: user.Name, 
//           email: user.Email, 
//           mobileNumber: user.MobileNumber, 
//           address: user.Address, 
//           serviceCategory: user.ServiceCategoryID, 
//           isAccountVerified: user.isEmailVerified, 
//           verifyStatus: user.VerifyStatus, 
//           activeStatus: user.ActiveStatus,
//         }
//       });
//     }
//   } catch (error) {
//     return res.json({ success: false, message: error.message });
//   }
// };


import Technician from "../models/Technician.js";
import Admin from "../models/Admin.js";
import TechnicianBankDetails from "../models/TechnicianBankDetails.js";
import TechnicianServiceCategory from "../models/TechnicianServiceCategory.js";
import ServiceCategory from "../models/ServiceCategory.js";
/*
export const getUserData = async (req, res) => {
  try {
    const userId = req.userId;
    const userType = req.userType;

    if (!userId) {
      return res.json({ success: false, message: 'User ID is required' });
    }

    let userData = {};

    if (userType === 'admin') {
      const user = await Admin.findById(userId);
      if (!user) return res.json({ success: false, message: 'Admin not found' });
      
      userData = {
        name: 'Administrator',
        email: user.username,
        role: 'admin',
        isAccountVerified: true
      };
    } else {
      const user = await Technician.findById(userId);
      if (!user) return res.json({ success: false, message: 'Technician not found' });
      
      userData = {
        name: user.Name,
        email: user.Email,
        mobileNumber: user.MobileNumber,
        address: user.Address,
        serviceCategory: user.ServiceCategoryID,
        isAccountVerified: user.isEmailVerified,
        verifyStatus: user.VerifyStatus,
        activeStatus: user.ActiveStatus,
        role: 'technician'
      };
    }

    return res.json({
      success: true,
      userData: userData
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};*/
export const getUserData = async (req, res) => {
  try {
    const userId = req.userId;
    const userType = req.userType;

    if (!userId) {
      return res.json({ success: false, message: 'User ID is required' });
    }

    let userData = {};

    if (userType === 'admin') {
      const user = await Admin.findById(userId);
      if (!user) return res.json({ success: false, message: 'Admin not found' });
      userData = {
        id: user._id,
        name: 'Administrator',
        email: user.username,
        role: 'admin',
        isAccountVerified: true
      };
    } else if (userType === 'technician') {
      const user = await Technician.findById(userId).lean();
      if (!user) return res.json({ success: false, message: 'Technician not found' });

      // Fetch bank details and service category mappings
      const bank = await TechnicianBankDetails.findOne({ TechnicianID: userId }).lean();
      const svcMaps = await TechnicianServiceCategory.find({ TechnicianID: userId }).lean();
      const serviceCategoryIds = svcMaps.map((s) => s.ServiceCategoryID);
      const services = await ServiceCategory.find({ _id: { $in: serviceCategoryIds } }).lean();

      userData = {
        id: user._id,
        name: user.Name,
        email: user.Email,
        mobileNumber: user.MobileNumber,
        address: user.Address,
        serviceCategories: services,
        bankDetails: bank || null,
        isAccountVerified: user.isEmailVerified,
        verifyStatus: user.VerifyStatus,
        activeStatus: user.ActiveStatus,
        role: 'technician'
      };
    } else if (userType === 'customer') {
      // Add customer support
      const Customer = (await import('../models/Customer.js')).default;
      const user = await Customer.findById(userId);
      if (!user) return res.json({ success: false, message: 'Customer not found' });
      userData = {
        id: user._id,
        name: user.Name || 'Customer',
        mobile: user.Mobile,
        email: user.Email || null,
        address: user.Address || null,
        role: 'customer',
        isAccountVerified: true
      };
    } else {
      return res.json({ success: false, message: 'Unknown user type' });
    }

    return res.json({
      success: true,
      userData: userData
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// @desc    Get technician wallet balance
// @route   GET /api/user/wallet
// @access  Technician only
export const getTechnicianWallet = async (req, res) => {
  try {
    if (!req.userType || req.userType !== 'technician') {
      return res.status(403).json({ success: false, message: 'Access denied. Technician only.' });
    }

    const TechnicianWallet = (await import('../models/TechnicianWallet.js')).default;

    const wallet = await TechnicianWallet.findOne({ TechnicianID: req.userId }).select('BalanceCoins LastUpdate');

    return res.json({ success: true, data: wallet || { BalanceCoins: 0 } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};