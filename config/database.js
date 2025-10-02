const mongoose = require("mongoose");
const config = require("./database.json");
const { env } = require("../env");

// Get environment-specific configuration
const envConfig = config[env] || config.development;

// MongoDB Connection Class
class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      if (this.connection) {
        return this.connection;
      }

      const { uri, database, options } = envConfig.mongodb;
      const connectionString = `${uri}/${database}`;

      console.log(`Connecting to MongoDB in ${env} environment...`);
      this.connection = await mongoose.connect(connectionString, options);

      console.log(`MongoDB connected successfully to ${database}`);

      // Handle connection events
      mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
      });

      mongoose.connection.on("disconnected", () => {
        console.log("MongoDB disconnected");
      });

      // Handle application termination
      process.on("SIGINT", async () => {
        await mongoose.connection.close();
        console.log("MongoDB connection closed through app termination");
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.connection = null;
        console.log("MongoDB disconnected successfully");
      }
    } catch (error) {
      console.error("Error disconnecting from MongoDB:", error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const database = new Database();
module.exports = database;
