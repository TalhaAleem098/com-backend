const mongoose = require("mongoose");

const displayItemSchema = new mongoose.Schema({
  displayMode: {
    type: String,
    enum: ["none-featured", "featured"],
    default: "featured",
  },

  nonFeatured: {
    firstTwoRows: {
      row1Products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      row2Products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    },

    videoSection: {
      videoUrl: String,
      publicId: String,
    },

    leftImageRightProducts: {
      image: {
        url: String,
        publicId: String,
      },
      products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }], // 4 products
    },

    rightImageLeftProducts: {
      image: {
        url: String,
        publicId: String,
      },
      products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }], // 4 products
    },

    extraFeaturedList: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        showFeatured: { type: Boolean, default: false },
      },
    ],
  },

  featuredLaunches: {
    launchImage: {
      url: String,
      publicId: String,
    },
    link: String, // onclick link
  },
});

const connection = mongoose.connection; // Default main database connection
module.exports = connection.model("DisplayItem", displayItemSchema);
