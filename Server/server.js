import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import session from "express-session";

import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import morgan from "morgan";

import connectdb from "./config/mongodb.js";
import { initRealtime } from "./config/realtime.js";
import { initChangeStream } from "./config/changeStream.js";

import authRouter from "./routes/auth.route.js";
import userRoutesr from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import adminCreationRoute from "./routes/adminCreation.route.js";
import serviceCategoryRoutes from "./routes/serviceCategory.route.js";
import subServiceCategoryRoutes from "./routes/subServiceCategory.route.js";
import technicianAvailabilityRoutes from "./routes/technicianAvailability.route.js";
import technicianProfileRoutes from "./routes/technicianProfile.route.js";
import subscriptionPackageRoutes from "./routes/subscriptionPackage.route.js";
import customerProfileRoutes from "./routes/customerProfile.route.js";
import adminCustomerListRoute from "./routes/AdminCustomerList.route.js";

import path from "path";
import { fileURLToPath } from "url";
import "./config/passport.js";

const app = express();
const port = process.env.PORT || 4000;

// Get __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect database
connectdb();

// All allowed client origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5175",
  "https://technosyshome-client.onrender.com"
];

/* ------------------------------
    🔒 SECURITY MIDDLEWARE
--------------------------------*/

// Sanitize incoming data
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  next();
});

// Dev logs
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Helmet CSP fix for production
const cspConnectSrc = [
  "'self'",
  "https://technosyshome-server.onrender.com",
  ...allowedOrigins
];

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https://technosyshome-client.onrender.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://technosyshome-client.onrender.com",
          "https://technosyshome-server.onrender.com"
        ],
        connectSrc: cspConnectSrc,
      },
    },
  })
);

// Rate limiting
app.use(
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 1000,
  })
);

// Prevent HTTP parameter pollution
app.use(hpp());

// JSON + Cookies
app.use(express.json());
app.use(cookieParser());

// CORS FIX (for both dev + production)
app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS Blocked: " + origin));
      }
    },
    exposedHeaders: ["Content-Type", "Content-Length"],
  })
);

// Serve uploads with CORS
app.use("/uploads", (req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  next();
});

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders(res, filePath, stat, req) {
      const origin = req.headers.origin;
      if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }

      // Cache images
      if (
        filePath.endsWith(".jpg") ||
        filePath.endsWith(".jpeg") ||
        filePath.endsWith(".png") ||
        filePath.endsWith(".webp")
      ) {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
      if (filePath.endsWith(".webp")) {
        res.setHeader("Content-Type", "image/webp");
      }
    },
  })
);

// Session (needed for Google OAuth)
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

/* ------------------------------
      📌 API ROUTES
--------------------------------*/
app.get("/", (req, res) => res.send("API Working"));

app.use("/api/auth", authRouter);
app.use("/api/user", userRoutesr);
app.use("/api/admin", adminRoutes);
app.use("/api/service-categories", serviceCategoryRoutes);
app.use("/api/sub-service-categories", subServiceCategoryRoutes);
app.use("/api/technician-availability", technicianAvailabilityRoutes);
app.use("/api/technician/profile", technicianProfileRoutes);
app.use("/api/subscription-packages", subscriptionPackageRoutes);
app.use("/api/admin-setup", adminCreationRoute);
app.use("/api/customer-profile", customerProfileRoutes);
app.use("/api/admin/customers", adminCustomerListRoute);

/* ------------------------------
      🚀 START SERVER
--------------------------------*/
const server = app.listen(port, () =>
  console.log(`Server running on PORT: ${port}`)
);

// Socket.io realtime
try {
  initRealtime(server);
} catch (err) {
  console.error("Realtime Init Failed", err);
}

// MongoDB Change Streams
try {
  initChangeStream();
} catch (err) {
  console.warn("ChangeStream initialize failed");
}
