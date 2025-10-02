const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // Token expires in 1 hour
      return new Date(Date.now() + 60 * 60 * 1000);
    }
  },
  used: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
passwordResetTokenSchema.index({ token: 1 });
passwordResetTokenSchema.index({ userId: 1 });
passwordResetTokenSchema.index({ email: 1 });
passwordResetTokenSchema.index({ expiresAt: 1 });

// Method to check if token is expired
passwordResetTokenSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to mark token as used
passwordResetTokenSchema.methods.markAsUsed = function() {
  this.used = true;
  return this.save();
};

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

module.exports = PasswordResetToken; 