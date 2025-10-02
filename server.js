const express = require("express");
const cors = require("cors");
const database = require("./config/database");
const User = require("./models/User"); // Import User model
const appRoutes = require("./routes");
const rateLimit = require("express-rate-limit");

const app = express();

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes

app.use("/api/v1", appRoutes);

// Test route to verify server is working
app.get("/check", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is working!",
    timestamp: new Date().toISOString(),
    cors: "enabled",
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server function
const startServer = async () => {
  try {
    // Connect to MongoDB
    await database.connect();
    console.log("Connected to MongoDB");

    // Ensure default admin exists
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const admin = new User({
        fullName: "Admin",
        email: "admin@pvctrading.io",
        phone: "9999999999",
        password: "Admin@123", // Will be hashed by pre-save middleware
        role: "admin",
      });
      await admin.save();
      console.log("Default admin user created.");
    } else {
      console.log("Admin user already exists.");
    }

    // Start Express server
    const PORT = process.env.PORT || 3012;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  // Close server & exit process
  process.exit(1);
});

// Start the server
startServer();
