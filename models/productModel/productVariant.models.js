const mongoose = require("mongoose");
const sizeSubSchema = require("./sizeVariant.models");
const colorSubSchema = require("./colorVariant.models");
const nonVariantSchema = require("./nonVariant.models");

const productVariantSchema = new mongoose.Schema(
  {
    variantType: {
      type: String,
      default: "none",
      enum: ["color", "size", "none"],
    },
    sizeVariants: { type: [sizeSubSchema], default: [] },
    colorVariants: { type: [colorSubSchema], default: [] },
    nonVariant: { type: nonVariantSchema, default: {} },
    defaultCurrency: { type: Object, default: { symbol: "Rs" } },
    Measures: [
      {
        rowName: { type: String, default: null },
        columns: [
          { name: { type: String, default: null }, value: { type: Number, default: 0 } },
        ],
      },
    ],
    measureUnit: { type: String, default: null },
  },
  { _id: false }
);

productVariantSchema.methods.recalculateTotals = function () {
  if (this.variantType === "size") {
    this.sizeVariants.forEach((sz) => sz.recalculateTotal && sz.recalculateTotal());
  } else if (this.variantType === "color") {
    this.colorVariants.forEach((c) => c.recalculateTotal && c.recalculateTotal());
  } else if (this.variantType === "none") {
    this.nonVariant.recalculateTotal && this.nonVariant.recalculateTotal();
  }
};

module.exports = productVariantSchema;
