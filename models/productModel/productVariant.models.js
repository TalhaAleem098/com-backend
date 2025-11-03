const mongoose = require("mongoose");
const sizeSubSchema = require("./sizeVariant.models");
const colorSubSchema = require("./colorVariant.models");
const nonVariantSchema = require("./nonVariant.models");

const productVariantSchema = new mongoose.Schema(
  {
    variantType: {
      type: String,
      default: "none",
      enum: ["color", "size", "none", "color-size"],
    },
    sizeVariants: { 
      type: [sizeSubSchema], 
      default: [] 
    },
    colorVariants: { 
      type: [colorSubSchema], 
      default: [] 
    },
    nonVariant: { 
      type: nonVariantSchema, 
      default: function() { return {}; }
    },
    defaultCurrency: { 
      type: Object, 
      default: { symbol: "Rs" } 
    },
    measures: [
      {
        rowName: { type: String, default: null },
        columns: [
          { 
            name: { type: String, default: null }, 
            value: { type: mongoose.Schema.Types.Mixed, default: null } 
          },
        ],
      },
    ],
    measureUnit: { 
      type: String, 
      default: null 
    },
  },
  { _id: false }
);

productVariantSchema.methods.recalculateTotals = function () {
  if (this.variantType === "size") {
    this.sizeVariants.forEach((sz) => {
      if (sz.recalculateTotal) sz.recalculateTotal();
    });
  } else if (this.variantType === "color") {
    this.colorVariants.forEach((c) => {
      if (c.recalculateTotal) c.recalculateTotal();
    });
  } else if (this.variantType === "none") {
    if (this.nonVariant && this.nonVariant.recalculateTotal) {
      this.nonVariant.recalculateTotal();
    }
  }
};

productVariantSchema.methods.getTotalStock = function () {
  let totalStock = 0;
  
  if (this.variantType === "size") {
    this.sizeVariants.forEach(size => {
      if (size.colors && size.colors.length > 0) {
        size.colors.forEach(color => {
          totalStock += color.totalStock || 0;
        });
      }
    });
  } else if (this.variantType === "color") {
    this.colorVariants.forEach(color => {
      if (color.sizes && color.sizes.length > 0) {
        color.sizes.forEach(size => {
          totalStock += size.totalStock || 0;
        });
      }
    });
  } else if (this.variantType === "none") {
    totalStock = this.nonVariant?.totalStock || 0;
  }
  
  return totalStock;
};

module.exports = productVariantSchema;
