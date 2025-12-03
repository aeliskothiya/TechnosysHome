import express from "express";
import cors from "cors";
import 'dotenv/config';
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
import path from 'path';
import { fileURLToPath } from 'url';
import "./config/passport.js";
import subscriptionPackageRoutes from "./routes/subscriptionPackage.route.js";
import customerProfileRoutes from "./routes/customerProfile.route.js";
import adminCustomerListRoute from "./routes/AdminCustomerList.route.js";
import bookingRoutes from "./routes/booking.route.js";
import { startAutoCancelScheduler } from "./controllers/booking.controller.js";

const app = express();
const port = process.env.PORT || 4000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectdb();

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5175'];

// Sanitize data for mongoose injection
// app.use(mongoSanitize());
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  // don't touch req.query, as it's read-only
  next();
});
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// Set Security Headers with configured CSP
// Build connectSrc for CSP from allowedOrigins + backend (HTTP + WS)
const wsAllowed = allowedOrigins.map(o => o.replace('http://', 'ws://'));
const cspConnectSrc = [
  "'self'",
  `http://localhost:${port}`,
  `ws://localhost:${port}`,
  ...allowedOrigins,
  ...wsAllowed,
];
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", `http://localhost:${port}`, "data:", "blob:"],
        connectSrc: cspConnectSrc,
      },
    },
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 1000,
});

app.use(limiter);

// Prevent http param pollution
app.use(hpp());

app.use(express.json());
app.use(cookieParser());
// Allow origins: in development reflect request origin (origin: true) for convenience.
const corsOptions = {
  credentials: true,
  exposedHeaders: ['Content-Type', 'Content-Length'],
};
if (process.env.NODE_ENV === 'development') {
  corsOptions.origin = true; // allow any origin (use only in dev)
} else {
  corsOptions.origin = allowedOrigins;
}
app.use(cors(corsOptions));

// Serve static files (uploads folder)
app.use('/uploads', (req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));


app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    // Set CORS headers for static files
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Cache control for better performance
    if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.jpeg') || path.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache for images
      // Add correct MIME type for WebP
      if (path.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp');
      }
    }
  }
}));


// Needed for Passport during the OAuth handshake
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// routes
app.get('/', (req, res) => res.send("API Working"));
app.use('/api/auth', authRouter);
app.use('/api/user', userRoutesr);
app.use("/api/admin", adminRoutes);
app.use('/api/service-categories', serviceCategoryRoutes);
app.use('/api/sub-service-categories', subServiceCategoryRoutes);
app.use('/api/technician-availability', technicianAvailabilityRoutes);
app.use('/api/technician/profile', technicianProfileRoutes);
app.use('/api/subscription-packages', subscriptionPackageRoutes);
// one-time admin creation route
app.use("/api/admin-setup", adminCreationRoute);
app.use("/api/customer-profile", customerProfileRoutes);
// Admin customers list
app.use('/api/admin/customers', adminCustomerListRoute);
app.use('/api/bookings', bookingRoutes);

const server = app.listen(port, () => console.log(`Server started on PORT:${port}`));

// Initialize realtime (Socket.IO)
try {
  initRealtime(server);
} catch (err) {
  console.error('Failed to initialize realtime module', err);
}

// Initialize change stream (if available). This will emit events for DB changes
// even when they come from outside this Node process (requires replica set).
try {
  initChangeStream();
} catch (err) {
  console.warn('ChangeStream initialization failed', err);
}

// Start the auto-cancel scheduler for bookings
try {
  startAutoCancelScheduler();
} catch (err) {
  console.error('Failed to start auto-cancel scheduler', err);
}
