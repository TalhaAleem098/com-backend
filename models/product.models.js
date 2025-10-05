const mongoose = require("mongoose");
const productVariantSchema = require("./productModel/productVariant.models");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
      default: null,
    },
    description: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    careInstructions: {
      type: String,
      default: null,
    },
    disclaimer: {
      type: String,
      default: null,
    },
    minStockToMaintain: {
      type: Number,
      default: 0,
    },
    defaultCurrency: {
      type: Object,
      default: {
        symbol: "Rs",
      },
    },
    category: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Category",
    },
    brand: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Brand",
    },
    productVariant: {
      type: productVariantSchema,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    displayImage: {
      type: String,
      default: null,
    },
    commentSection: {
      totalRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      comment: { type: String, default: null },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      userName: { type: String, default: null },
      totalComments: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
