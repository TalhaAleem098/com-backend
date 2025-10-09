const mongoose = require("mongoose");
const locationDistributionSchema = require("./locationDistribution.models");

const sizeInColorSchema = new mongoose.Schema(
  {
    sizeName: {
      type: String,
      required: true,
    },
    abbreviation: {
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

sizeInColorSchema.methods.recalculateTotal = function () {
  this.totalStock = (this.locationDistribution || []).reduce(
    (sum, loc) => sum + (loc.stock || 0),
    0
  );
  return this.totalStock;
};

const colorSubSchema = new mongoose.Schema(
  {
    colorName: { 
      type: String, 
      required: true 
    },
    images: [
      { 
        url: { type: String, default: null }, 
        publicId: { type: String, default: null } 
      },
    ],
    sizes: {
      type: [sizeInColorSchema],
      default: [],
    },
  },
  { _id: true }
);

colorSubSchema.methods.recalculateTotal = function () {
  if (this.sizes && this.sizes.length > 0) {
    this.sizes.forEach(size => {
      if (size.recalculateTotal) {
        size.recalculateTotal();
      }
    });
  }
};

module.exports = colorSubSchema;
