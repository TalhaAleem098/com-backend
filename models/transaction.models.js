const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: "PKR",
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  paymentIntentId: {
    type: String,
    trim: true,
  },
  paymentGateway: {
    type: String,
    trim: true,
  },
  transactionId: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  metadata: {
    type: Object,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

transactionSchema.index({ order: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ isDeleted: 1 });

const connection = mongoose.connection;
module.exports = connection.model("Transaction", transactionSchema);