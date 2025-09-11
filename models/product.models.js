const mongoose = require("mongoose");

const colorVariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sizes: [
    {
      name: {
        type: String,
        // required: true,
        default: null,
      },
      stock: {
        type: Number,
        default: 0,
      },
      purchasePricePerUnit: {
        type: Number,
        default: 0,
      },
      basePricePerUnit: {
        type: Number,
        default: 0,
      },
      salePricePerUnit: {
        type: Number,
        default: null,
      },
      sold: {
        type: Number,
        default: 0,
      },
      commentSection: {
        totalRating: {
          type: Number,
          default: 0,
        },
        totalReviews: {
          type: Number,
          default: 0,
        },
        comment: {
          type: String,
          default: null,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userName: {
          type: String,
          default: null,
        },
        totalComments: {
          type: Number,
          default: 0,
        },
      },
      images: [
        {
          url: {
            type: String,
            default: null,
          },
          publicId: {
            type: String,
            default: null,
          },
        },
      ],
    },
  ],
});

const nonVariantSchema = new mongoose.Schema({
  stock: {
    type: Number,
    default: 0,
  },
  purchasePricePerUnit: {
    type: Number,
    default: 0,
  },
  basePricePerUnit: {
    type: Number,
    default: 0,
  },
  salePricePerUnit: {
    type: Number,
    default: null,
  },
  sold: {
    type: Number,
    default: 0,
  },
  commentSection: {
    totalRating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    comment: {
      type: String,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userName: {
      type: String,
      default: null,
    },
    totalComments: {
      type: Number,
      default: 0,
    },
  },
  images: [
    {
      url: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
    },
  ],
});

const sizeVariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  colors: [
    {
      name: {
        type: String,
        // required: true,
        default: null,
      },
      stock: {
        type: Number,
        default: 0,
      },
      purchasePricePerUnit: {
        type: Number,
        default: 0,
      },
      basePricePerUnit: {
        type: Number,
        default: 0,
      },
      salePricePerUnit: {
        type: Number,
        default: null,
      },
      sold: {
        type: Number,
        default: 0,
      },
      commentSection: {
        totalRating: {
          type: Number,
          default: 0,
        },
        totalReviews: {
          type: Number,
          default: 0,
        },
        comment: {
          type: String,
          default: null,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userName: {
          type: String,
          default: null,
        },
        totalComments: {
          type: Number,
          default: 0,
        },
      },
      images: [
        {
          url: {
            type: String,
            default: null,
          },
          publicId: {
            type: String,
            default: null,
          },
        },
      ],
    },
  ],
});

const productVariant = new mongoose.Schema({
  variantType: {
    type: String,
    default: "none",
    enum: ["color", "size", "none"],
  },
  sizeVariants: {
    type: [sizeVariantSchema],
    required: function () {
      return this.variantType === "size";
    },
  },
  colorVariants: {
    type: [colorVariantSchema],
    required: function () {
      return this.variantType === "color";
    },
  },
  nonVariant: {
    type: nonVariantSchema,
    required: function () {
      return this.variantType === "none";
    },
  },
  defaultCurrency: {
    type: Object,
    default: {
      symbol: "Rs",
    },
  },
  Measures: [
    {
      rowName: {
        type: String,
        default: null,
      },
      columns: [
        {
          name: {
            type: String,
            default: null,
          },
          value: {
            type: Number,
            default: 0,
          },
        },
      ],
    },
  ],
  measureUnit: {
    type: String,
    default: null,
  },
});

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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },
    productVariant: {
      type: productVariant,
      required: true,
    },
    isActive: {
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
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
