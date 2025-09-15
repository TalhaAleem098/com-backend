const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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
  },
  { timestamps: true }
);

categorySchema.pre("save", function (next) {
  this.itemCount = this.items.length;
  next();
});

categorySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.items) {
    update.itemCount = update.items.length;
  }
  next();
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
