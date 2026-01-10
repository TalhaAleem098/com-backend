const mongoose = require("mongoose");

const dailyHoursSchema = new mongoose.Schema(
  {
    isHoliday: { type: Boolean, default: false },
    open: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^\d{2}:\d{2}$/.test(v),
        message: "Invalid time format",
      },
    },
    close: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^\d{2}:\d{2}$/.test(v),
        message: "Invalid time format",
      },
    },
    break: {
      start: {
        type: String,
        default: null,
        validate: {
          validator: (v) => v === null || /^\d{2}:\d{2}$/.test(v),
          message: "Invalid time format",
        },
      },
      end: {
        type: String,
        default: null,
        validate: {
          validator: (v) => v === null || /^\d{2}:\d{2}$/.test(v),
          message: "Invalid time format",
        },
      },
    },
  },
  { _id: false }
);

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    address: {
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
      postalCode: { type: String, default: null, trim: true },
      streetAddress: { type: String, required: true, trim: true },
    },
    phone: {
      primary: { type: String, required: true, trim: true },
      secondary: { type: String, default: null, trim: true },
    },
    email: { type: String, default: null },
    type: {
      type: String,
      enum: ["warehouse", "store", "office", "main", "sub-branch"],
      default: "main",
      required: true,
    },
    totalStockValue: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeliveryAvailable: { type: Boolean, default: false },
    openingHours: {
      monday: { type: dailyHoursSchema, default: () => ({}) },
      tuesday: { type: dailyHoursSchema, default: () => ({}) },
      wednesday: { type: dailyHoursSchema, default: () => ({}) },
      thursday: { type: dailyHoursSchema, default: () => ({}) },
      friday: { type: dailyHoursSchema, default: () => ({}) },
      saturday: { type: dailyHoursSchema, default: () => ({}) },
      sunday: { type: dailyHoursSchema, default: () => ({}) },
    },
    stock: {
      totalStocks: {
        type: Number,
        default: 0,
      },
      productsCount: {
        type: Number,
        default: this?.stock?.products?.length,
      },
      products: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          quantity: { type: Number, required: true, min: 0 },
        },
      ],
    },
  },
  { timestamps: true }
);

branchSchema.index({ location: "2dsphere" });

branchSchema.path("email").validate(function (v) {
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}, "Invalid email");

branchSchema.pre("save", async function (next) {
  const branch = this;
  if (!branch.isNew) return next(); // Skip if not a new document
  try {
    const existingBranch = await this.constructor
      .findOne({ name: branch.name })
      .lean();
    if (existingBranch) {
      return next(new Error("Duplicate branch name"));
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Method to recalculate stock from actual product data
branchSchema.methods.recalculateStock = async function() {
  try {
    const Product = require('./product.models');
    
    // Find all products that have stock in this branch
    const products = await Product.find({
      isDeleted: false,
      $or: [
        { "productVariant.nonVariant.locationDistribution.branch": this._id },
        { "productVariant.sizeVariants.colors.locationDistribution.branch": this._id },
        { "productVariant.colorVariants.sizes.locationDistribution.branch": this._id }
      ]
    });

    let totalStocks = 0;
    const productSummary = [];

    products.forEach(product => {
      let productStockInBranch = 0;

      if (product.productVariant.variantType === "none") {
        const location = product.productVariant.nonVariant.locationDistribution
          .find(loc => loc.branch.toString() === this._id.toString());
        if (location) productStockInBranch += location.stock;
      } else if (product.productVariant.variantType === "size") {
        product.productVariant.sizeVariants.forEach(size => {
          size.colors.forEach(color => {
            const location = color.locationDistribution
              .find(loc => loc.branch.toString() === this._id.toString());
            if (location) productStockInBranch += location.stock;
          });
        });
      } else if (product.productVariant.variantType === "color") {
        product.productVariant.colorVariants.forEach(color => {
          color.sizes.forEach(size => {
            const location = size.locationDistribution
              .find(loc => loc.branch.toString() === this._id.toString());
            if (location) productStockInBranch += location.stock;
          });
        });
      }

      if (productStockInBranch > 0) {
        totalStocks += productStockInBranch;
        productSummary.push({
          productId: product._id,
          quantity: productStockInBranch
        });
      }
    });

    this.stock = {
      totalStocks,
      productsCount: productSummary.length,
      products: productSummary
    };

    return this.stock;
  } catch (error) {
    console.error('Error recalculating branch stock:', error);
    return this.stock;
  }
};

branchSchema.pre("save", function (next) {
  if (this.stock && Array.isArray(this.stock.products)) {
    this.stock.productsCount = this.stock.products.length;
    this.stock.totalStocks = this.stock.products.reduce(
      (sum, p) => sum + (p.quantity || 0),
      0
    );
  } else {
    this.stock = {
      totalStocks: 0,
      productsCount: 0,
      products: []
    };
  }
  next();
});

branchSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  if (update?.stock?.products) {
    const products = update.stock.products;

    const productsCount = products.length;
    const totalStocks = products.reduce((sum, p) => sum + (p.quantity || 0), 0);

    update.stock.productsCount = productsCount;
    update.stock.totalStocks = totalStocks;

    this.setUpdate(update);
  }

  next();
});

const connection = mongoose.connection; // Default main database connection
module.exports = connection.model("Branch", branchSchema);