const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    displayName: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    email: {
      hashed: { type: String, required: true },
      encrypted: { type: String, required: true },
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "coAdmin"], default: "admin" },
    loginHistory: [
      {
        ip: String,
        time: { type: Date, default: Date.now },
      },
    ],
    pwdChangedAt: { type: Date, default: Date.now },
    pwdChangeLimitDays: { type: Number, default: 2 },
    lastLogin: { type: Date, default: null },
    isActive: { type: Boolean, default: null },
    lockingDays: { type: Number, default: 2 },
    notes: { type: String, default: null },
    isLocked: { type: Boolean, default: false },
    lockedUntil: {
      type: Date,
      default: null,
    },
  remainingAttempts: { type: Number, default: 3 },
  },
  { timestamps: true }
);

adminSchema.index({ "email.hashed": 1 }, { unique: true });

adminSchema.pre("save", function (next) {
  if (this.loginHistory.length > 30) {
    this.loginHistory = this.loginHistory.slice(-30);
  }
  next();
});

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.matchPassword = async function (enteredPassword) {
  if (this.isLocked && this.lockedUntil > Date.now()) {
    return { success: false, message: "Account is locked", locked: true };
  }

  const isMatch = await bcrypt.compare(enteredPassword, this.password);

  if (isMatch) {
    this.remainingAttempts = 3;
    this.isLocked = false;
    this.lockedUntil = null;
    await this.save();
    return { success: true, message: "Matching Successful", locked: false };
  } else {
    this.remainingAttempts = (this.remainingAttempts || 0) - 1;
    if (this.remainingAttempts <= 0) {
      this.isLocked = true;
      this.lockedUntil = Date.now() + this.lockingDays * 24 * 60 * 60 * 1000;
      this.remainingAttempts = 3;
    }
    await this.save();
    return {
      success: false,
      message: "Incorrect password",
      locked: this.isLocked,
      remainingAttempts: this.remainingAttempts
    };
  }
};

module.exports = mongoose.model("Admin", adminSchema);
