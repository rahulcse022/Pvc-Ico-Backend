const mongoose = require("mongoose");
const MONGO_DB_URL =
  "mongodb+srv://rahul:rahul@cluster0.r1xuwdr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/pearlvine";

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
