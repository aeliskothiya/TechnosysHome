// import jwt from "jsonwebtoken";

// const userAuth = (req, res, next) => {
//   try {
//     const token = req.cookies.token;
//     if (!token) {
//       return res.status(401).json({ success: false, message: "No token provided" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.userId = decoded.id;
//     req.provider = decoded.provider || 'local'; // <— NEW

//     next();
//   } catch (error) {
//     return res.status(401).json({ success: false, message: "Invalid or expired token" });
//   }
// };

// export default userAuth;


// import jwt from "jsonwebtoken";
// import Technician from "../models/Technician.js";
// import Admin from "../models/Admin.js";

// const userAuth = async (req, res, next) => {
//   try {
//     const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Access denied. No token provided.",
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     let user = null;
    
//     // Find user based on type from token
//     if (decoded.type === 'admin') {
//       user = await Admin.findById(decoded.id);
//     } else {
//       user = await Technician.findById(decoded.id);
      
//       // Additional checks for technicians
//       if (user && user.VerifyStatus !== "Approved") {
//         return res.status(403).json({
//           success: false,
//           message: "Account not approved yet.",
//         });
//       }

//       if (user && user.ActiveStatus !== "Active") {
//         return res.status(403).json({
//           success: false,
//           message: "Account deactivated.",
//         });
//       }
//     }

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid token. User not found.",
//       });
//     }

//     req.userId = user._id;
//     req.userType = decoded.type;
//     req.userEmail = decoded.type === 'admin' ? user.username : user.Email;
    
//     next();
//   } catch (error) {
//     console.error("Auth middleware error:", error);
//     res.status(401).json({
//       success: false,
//       message: "Invalid token.",
//     });
//   }
// };
// export default userAuth;




import jwt from "jsonwebtoken";
import Technician from "../models/Technician.js";
import Admin from "../models/Admin.js";
import Customer from "../models/Customer.js";

const userAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user = null;
    
    // Find user based on type from token
    if (decoded.type === 'admin') {
      user = await Admin.findById(decoded.id);
    } else if (decoded.type === 'technician') {
      user = await Technician.findById(decoded.id);
      
      // Additional checks for technicians
      if (user && user.VerifyStatus !== "Approved") {
        return res.status(403).json({
          success: false,
          message: "Account not approved yet.",
        });
      }

      if (user && user.ActiveStatus !== "Active") {
        return res.status(403).json({
          success: false,
          message: "Account deactivated.",
        });
      }
    } else if (decoded.type === 'customer') {
      user = await Customer.findById(decoded.id);
      
      // Check if customer exists
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid token. Customer not found.",
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid user type.",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found.",
      });
    }

    req.userId = user._id;
    req.userType = decoded.type;
    
    // Set appropriate email/mobile based on user type
    if (decoded.type === 'admin') {
      req.userEmail = user.username;
    } else if (decoded.type === 'technician') {
      req.userEmail = user.Email;
    } else if (decoded.type === 'customer') {
      req.userMobile = user.Mobile;
      req.userEmail = user.Email || null;
    }
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

export default userAuth;