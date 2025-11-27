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
app.set("trust proxy", 1);
const port = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB
connectdb();

// Allowed origins (FIXED)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5175",
  process.env.FRONTEND_URL || "https://technosyshome-client.onrender.com"
];

/* ------------------------------
    🔒 SECURITY MIDDLEWARE
--------------------------------*/
app.use(mongoSanitize());

// Logs only in dev
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// Helmet CSP – FIXED image loading + websocket
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://technosyshome-server.onrender.com",
          "https://technosyshome-server.onrender.com/uploads",
          "https://technosyshome-server.onrender.com/uploads/*"
        ],
        connectSrc: [
          "'self'",
          ...allowedOrigins,
          "https://technosyshome-server.onrender.com",
          "wss://technosyshome-server.onrender.com"
        ],
      },
    },
  })
);

// Rate limit
app.use(
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 1000,
  })
);

// Clean URL param pollution
app.use(hpp());

// JSON + Cookies
app.use(express.json());
app.use(cookieParser());

// CORS (FIXED: allows null origins safely)
app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS Blocked: " + origin));
    },
  })
);

// STATIC FILES (working - unchanged)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: function (res, filePath) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      if (/\.(jpg|jpeg|png|webp)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    },
  })
);

// Session (OAuth)
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

/* ------------------------------
      📌 ROUTES
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

// SOCKET.IO realtime
initRealtime(server);

// MongoDB Change Stream
initChangeStream();
