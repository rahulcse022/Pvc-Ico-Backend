const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const User = require("./models/User"); // Import User model
const appRoutes = require("./routes");
const connectDB = require("./config/database");
const { ACCOUNT_NUMBER } = require("./utils/constant");

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "*",
      "https://pearl-vine.com",
      "https://admin.pearl-vine.com",
      "http://localhost:5173",
    ];

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
    "Cache-Control",
    "Origin",
    "X-HTTP-Method-Override",
  ],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes

app.use("/api/v1", appRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Pearlvine Backend API",
  });
});

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
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
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
    await connectDB();

    // Ensure default admin exists
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const admin = new User({
        name: "Admin",
        email: "admin@pearl-vine.com",
        phone: "9999999999",
        password: "Tillu@0008", // Will be hashed by pre-save middleware
        role: "admin",
        isActiveReferral: true,
        accountNumber: ACCOUNT_NUMBER,
      });
      await admin.save();
      console.log("Default admin user created.");
    } else {
      console.log("Admin user already exists.");
    }

    // Start Express server
    const PORT = process.env.PORT || 5000;
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
