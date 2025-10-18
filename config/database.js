const mongoose = require("mongoose");
const MONGO_DB_URL = "mongodb://localhost:27017/pearlvine";


const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
