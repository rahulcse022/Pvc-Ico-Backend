const mongoose = require("mongoose");

function validateInput(fields) {
  for (const [key, config] of Object.entries(fields)) {
    const { value, required = false, type, isMongoId = false } = config;

    // ✅ Required field check
    if (required && (value === undefined || value === null || value === "")) {
      return {
        success: false,
        message: `${key} is required`,
      };
    }

    // ✅ Type check
    if (type && value !== undefined && typeof value !== type) {
      return {
        success: false,
        message: `${key} must be of type ${type}`,
      };
    }

    // ✅ MongoDB ObjectId check
    if (isMongoId && value && !mongoose.Types.ObjectId.isValid(value)) {
      return {
        success: false,
        message: `${key} must be a valid MongoDB ObjectId`,
      };
    }
  }

  return null; // all good ✅
}

module.exports = validateInput;
