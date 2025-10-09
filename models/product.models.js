const mongoose = require("mongoose");
const productVariantSchema = require("./productModel/productVariant.models");

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
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Category",
    },
    brand: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Brand",
    },
    productVariant: {
      type: productVariantSchema,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
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
    commentSection: {
      totalRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      comment: { type: String, default: null },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      userName: { type: String, default: null },
      totalComments: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

productSchema.post('save', async function(doc) {
  try {
    // Update categories
    if (doc.category && doc.category.length > 0) {
      const Category = mongoose.model('Category');
      
      for (const categoryId of doc.category) {
        await Category.findByIdAndUpdate(
          categoryId,
          { 
            $addToSet: { items: doc._id },
          }
        );
      }
    }

    // Update brands
    if (doc.brand && doc.brand.length > 0) {
      const Brand = mongoose.model('Brand');
      
      for (const brandId of doc.brand) {
        await Brand.findByIdAndUpdate(
          brandId,
          { 
            $addToSet: { items: doc._id },
          }
        );
      }
    }

    // Update branch stock
    if (doc.productVariant) {
      const Branch = mongoose.model('Branch');
      const locations = [];

      // Collect all location distributions
      if (doc.productVariant.variantType === 'none' && doc.productVariant.nonVariant?.locationDistribution) {
        locations.push(...doc.productVariant.nonVariant.locationDistribution);
      } else if (doc.productVariant.variantType === 'size' && doc.productVariant.sizeVariants) {
        doc.productVariant.sizeVariants.forEach(size => {
          if (size.colors) {
            size.colors.forEach(color => {
              if (color.locationDistribution) {
                locations.push(...color.locationDistribution);
              }
            });
          }
        });
      } else if (doc.productVariant.variantType === 'color' && doc.productVariant.colorVariants) {
        doc.productVariant.colorVariants.forEach(color => {
          if (color.sizes) {
            color.sizes.forEach(size => {
              if (size.locationDistribution) {
                locations.push(...size.locationDistribution);
              }
            });
          }
        });
      }

      // Update branches
      for (const location of locations) {
        if (location.branch && location.stock > 0) {
          await Branch.findByIdAndUpdate(
            location.branch,
            {
              $addToSet: {
                'stock.products': {
                  productId: doc._id,
                  quantity: location.stock
                }
              }
            }
          );
        }
      }
    }
  } catch (error) {
    console.error('Error in product post-save middleware:', error);
  }
});

// Middleware to handle product deletion
productSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && this.getUpdate()?.isDeleted === true) {
    try {
      // Remove from categories
      if (doc.category && doc.category.length > 0) {
        const Category = mongoose.model('Category');
        
        for (const categoryId of doc.category) {
          await Category.findByIdAndUpdate(
            categoryId,
            { 
              $pull: { items: doc._id },
            }
          );
        }
      }

      // Remove from brands
      if (doc.brand && doc.brand.length > 0) {
        const Brand = mongoose.model('Brand');
        
        for (const brandId of doc.brand) {
          await Brand.findByIdAndUpdate(
            brandId,
            { 
              $pull: { items: doc._id },
            }
          );
        }
      }

      // Remove from branches
      const Branch = mongoose.model('Branch');
      await Branch.updateMany(
        {},
        {
          $pull: {
            'stock.products': { productId: doc._id }
          }
        }
      );
    } catch (error) {
      console.error('Error in product update middleware:', error);
    }
  }
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
