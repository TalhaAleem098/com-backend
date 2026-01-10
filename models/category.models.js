const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    items: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
    },
    itemCount: {
      type: Number,
      default: 0,
    },
    showOnHomePage: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
    },
    subCategories: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  { timestamps: true }
);

categorySchema.pre("save", function (next) {
  this.itemCount = this.items.length;

  if (this.subCategories && this.subCategories.length > 0) {
    const normalized = this.subCategories.map((s) =>
      s.trim().toLowerCase()
    );
    const unique = [...new Set(normalized)];
    if (unique.length !== normalized.length) {
      return next(new Error("Duplicate sub-categories are not allowed"));
    }
    this.subCategories = unique;
  }

  next();
});

categorySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.items) {
    update.itemCount = update.items.length;
  }
  if (update.subCategories) {
    const normalized = update.subCategories.map((s) =>
      s.trim().toLowerCase()
    );
    const unique = [...new Set(normalized)];
    if (unique.length !== normalized.length) {
      return next(new Error("Duplicate sub-categories are not allowed"));
    }
    update.subCategories = unique;
  }

  next();
});

const connection = mongoose.connection; // Default main database connection
const Category = connection.model("Category", categorySchema);

module.exports = Category;
