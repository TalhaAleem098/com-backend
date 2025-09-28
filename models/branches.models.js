const mongoose = require("mongoose");

const dailyHoursSchema = new mongoose.Schema(
  {
    isHoliday: { type: Boolean, default: false },
    open: { type: String, default: null },
    close: { type: String, default: null },
    break: {
      start: { type: String, default: null },
      end: { type: String, default: null },
    },
  },
  { _id: false }
);

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      city: { type: String, default: null },
      state: { type: String, default: null },
      country: { type: String, default: null },
      postalCode: { type: String, default: null },
      streetAddress: { type: String, default: null },
    },
    phone: {
      primary: { type: String, default: null },
      secondary: { type: String, default: null },
    },
    email: { type: String, default: null },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    type: {
      type: String,
      enum: ["warehouse", "store", "office", "main", "sub-branch"],
      default: "main",
    },
    totalStockValue: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeliveryAvailable: { type: Boolean, default: false },
    openingHours: {
      monday: { type: dailyHoursSchema, default: () => ({}) },
      tuesday: { type: dailyHoursSchema, default: () => ({}) },
      wednesday: { type: dailyHoursSchema, default: () => ({}) },
      thursday: { type: dailyHoursSchema, default: () => ({}) },
      friday: { type: dailyHoursSchema, default: () => ({}) },
      saturday: { type: dailyHoursSchema, default: () => ({}) },
      sunday: { type: dailyHoursSchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);

branchSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Branch", branchSchema);
