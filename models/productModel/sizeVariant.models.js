const mongoose = require("mongoose");
const locationDistributionSchema = require("./locationDistribution.models");

const colorInSizeSchema = new mongoose.Schema(
  {
    colorName: {
      type: String,
      required: true,
    },
    locationDistribution: {
      type: [locationDistributionSchema],
      default: [],
    },
    totalStock: {
      type: Number,
      default: 0,
    },
    sold: {
      type: Number,
      default: 0,
    },
    purchasePricePerUnit: { type: Number, default: 0 },
    basePricePerUnit: { type: Number, default: 0 },
    salePricePerUnit: { type: Number, default: null },
  },
  { _id: true }
);

colorInSizeSchema.methods.recalculateTotal = function () {
  this.totalStock = (this.locationDistribution || []).reduce(
    (sum, loc) => sum + (loc.stock || 0),
    0
  );
  return this.totalStock;
};

const sizeSubSchema = new mongoose.Schema(
  {
    sizeName: {
      type: String,
      required: true,
    },
    abbreviation: {
      type: String,
      required: true,
    },
    images: [
      {
        url: { type: String, default: null },
        publicId: { type: String, default: null },
      },
    ],
    colors: {
      type: [colorInSizeSchema],
      default: [],
    },
  },
  { _id: true }
);

// helper to recalc totalStock from all colors in this size
sizeSubSchema.methods.recalculateTotal = function () {
  if (this.colors && this.colors.length > 0) {
    this.colors.forEach(color => {
      if (color.recalculateTotal) {
        color.recalculateTotal();
      }
    });
  }
};

module.exports = sizeSubSchema;
