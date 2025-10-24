const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    general: {
      brandName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50,
        default: "My Brand",
      },
      logoUrl: { type: String, match: /^https?:\/\/.+/ },
      maintenanceMode: { type: Boolean, default: false },
    },

    contact: {
      contactEmail: {
        type: String,
        required: true,
        lowercase: true,
        match: /^\S+@\S+\.\S+$/,
        default: "support@mybrand.com",
      },
      supportEmail: {
        type: String,
        lowercase: true,
        match: /^\S+@\S+\.\S+$/,
        default: "help@mybrand.com",
      },
      contactPhone: {
        type: String,
        match: /^\+?[0-9\s-]{7,20}$/,
        default: "+92 300 0000000",
      },
      whatsappNumber: {
        type: String,
        match: /^\+?[0-9\s-]{7,20}$/,
        default: "+92 300 0000000",
      },
      address: {
        street: { type: String, trim: true, default: "123 Main Street" },
        city: { type: String, trim: true, default: "Lahore" },
        state: { type: String, trim: true, default: "Punjab" },
        country: { type: String, trim: true, default: "Pakistan" },
        postalCode: { type: String, match: /^[0-9]{4,10}$/, default: "54000" },
      },
      socialLinks: {
        facebook: { type: String, match: /^https?:\/\/.+/ },
        instagram: { type: String, match: /^https?:\/\/.+/ },
        twitter: { type: String, match: /^https?:\/\/.+/ },
        linkedin: { type: String, match: /^https?:\/\/.+/ },
        youtube: { type: String, match: /^https?:\/\/.+/ },
      },
    },

    currencyAndPayment: {
      shopCurrency: {
        type: String,
        required: true,
        uppercase: true,
        default: "PKR",
      },
      supportedCurrencies: {
        type: [String],
        validate: {
          validator: function (arr) {
            return arr.every((c) => /^[A-Z]{3}$/.test(c));
          },
          message: "Currencies must be 3-letter ISO codes",
        },
        default: ["PKR"],
      },
      defaultPaymentGateway: {
        type: String,
        enum: ["cod", "stripe", "paypal"],
        default: "cod",
      },
    },

    taxAndInvoice: {
      taxRate: { type: Number, min: 0, max: 100, default: 0 },
      taxType: {
        type: String,
        enum: ["inclusive", "exclusive", "out_of_scope"],
        default: "exclusive",
      },
      invoicePrefix: {
        type: String,
        uppercase: true,
        trim: true,
        default: "INV-",
      },
      invoiceNotes: {
        type: String,
        maxlength: 200,
        default: "Thanks for shopping with us!",
      },
    },

    shipping: {
      shippingAvailable: { type: Boolean, default: false },
      defaultShippingCharge: { type: Number, min: 0, default: 0 },
      freeShippingThreshold: { type: Number, min: 0, default: 0 },
    },

    sortingOrder: {
      ascending: {
        type: Boolean,
        default: true,
      },
    },

    notifications: {
      emailNotifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
