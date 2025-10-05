const mongoose = require("mongoose");

const locationDistributionSchema = new mongoose.Schema(
  {
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    stock: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

module.exports = locationDistributionSchema;
