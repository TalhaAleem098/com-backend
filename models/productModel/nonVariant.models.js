const mongoose = require("mongoose");
const locationDistributionSchema = require("./locationDistribution.models");

const nonVariantSchema = new mongoose.Schema(
  {
    locationDistribution: [{ type: locationDistributionSchema, default: null }],
    totalStock: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    images: [
      {
        url: { type: String, default: null },
        publicId: { type: String, default: null },
      },
    ],
    purchasePricePerUnit: { type: Number, default: 0 },
    basePricePerUnit: { type: Number, default: 0 },
    salePricePerUnit: { type: Number, default: null },
  },
  { _id: false }
);

nonVariantSchema.methods.recalculateTotal = function () {
  this.totalStock = (this.locationDistribution || []).reduce(
    (sum, loc) => sum + (loc.stock || 0),
    0
  );
  return this.totalStock;
};

module.exports = nonVariantSchema;
