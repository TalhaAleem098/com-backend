const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
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
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

brandSchema.pre("save", function (next) {
  this.itemCount = this.items.length;
  next();
});

brandSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.items) {
    update.itemCount = update.items.length;
  }
  next();
});

const Brand = mongoose.model("Brand", brandSchema);

module.exports = Brand;
