const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    zipCode: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
  },
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
  },
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  selectedOptions: {
    color: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  image: {
    url: {
      type: String,
      default: "",
    },
    publicId: {
      type: String,
      default: "",
    },
  },
  variantDetails: {
    type: Object,
  },
}, { _id: true });

const orderSchema = new mongoose.Schema({
  customer: {
    type: deliverySchema,
    required: true,
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: "Order must contain at least one item.",
    },
  },
  subTotal: {
    type: Number,
    required: true,
    min: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  shippingFee: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  grandTotal: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
    default: "pending",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
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
  paidAt: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  cancelReason: {
    type: String,
    trim: true,
  },
  refundAmount: {
    type: Number,
    min: 0,
  },
  refundedAt: {
    type: Date,
  },
  statusHistory: [
    {
      status: {
        type: String,
        required: true,
      },
      changedAt: {
        type: Date,
        default: Date.now,
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  paymentMethod: {
    type: String,
    trim: true,
  },
  orderNotes: {
    type: String,
    trim: true,
  },
  trackingNumber: {
    type: String,
    trim: true,
  },
  estimatedDelivery: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

orderSchema.index({ "customer.email": 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ isDeleted: 1 });

orderSchema.pre('save', function(next) {
  this.grandTotal = this.subTotal + this.taxAmount + this.shippingFee - this.discountAmount;
  next();
});

orderSchema.virtual('orderNumber').get(function() {
  return `ORD-${this._id.toString().slice(-8).toUpperCase()}`;
});

const connection = mongoose.connection;
module.exports = connection.model("Order", orderSchema);