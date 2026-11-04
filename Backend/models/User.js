const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const RESET_EXPIRY_MINUTES = 10;

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // Google-only accounts have no password until they use "Forgot Password"
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    googleId: { type: String, unique: true, sparse: true },
    profileImageUrl: { type: String, default: null },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordAttempts: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      // never send the password hash or reset token to the client
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        delete ret.resetPasswordAttempts;
        return ret;
      },
    },
  },
);

// hashing password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// comparing passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  // Google-only accounts have no password to compare against
  if (!this.password || !candidatePassword) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
  // Cryptographically secure 6-digit OTP
  const resetToken = crypto.randomInt(100000, 1000000).toString();

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire to 10 minutes
  this.resetPasswordExpire = Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000;
  this.resetPasswordAttempts = 0;

  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
module.exports.RESET_EXPIRY_MINUTES = RESET_EXPIRY_MINUTES;
