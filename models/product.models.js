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
        try {
          const category = await Category.findById(categoryId);
          if (!category) continue;
          // add product id only if not present
          const exists = (category.items || []).some(id => id.toString() === doc._id.toString());
          if (!exists) {
            category.items = category.items || [];
            category.items.push(doc._id);
            // save so pre-save hook updates itemCount reliably
            await category.save();
          }
        } catch (err) {
          console.error('Error updating category for product post-save:', err);
        }
      }
    }

    // Update brands
    if (doc.brand && doc.brand.length > 0) {
      const Brand = mongoose.model('Brand');

      for (const brandId of doc.brand) {
        try {
          const brand = await Brand.findById(brandId);
          if (!brand) continue;
          const exists = (brand.items || []).some(id => id.toString() === doc._id.toString());
          if (!exists) {
            brand.items = brand.items || [];
            brand.items.push(doc._id);
            await brand.save();
          }
        } catch (err) {
          console.error('Error updating brand for product post-save:', err);
        }
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

      // Update branches by loading and saving so branch pre-save recalculates totals
      for (const location of locations) {
        if (!location.branch) continue;
        try {
          const branch = await Branch.findById(location.branch);
          if (!branch) continue;

          branch.stock = branch.stock || { products: [] };
          const existingIndex = (branch.stock.products || []).findIndex(p => p.productId.toString() === doc._id.toString());
          if (existingIndex >= 0) {
            // update quantity
            branch.stock.products[existingIndex].quantity = location.stock || 0;
          } else {
            // only add if stock is positive (you can change logic as needed)
            branch.stock.products.push({ productId: doc._id, quantity: location.stock || 0 });
          }

          // save branch to trigger pre-save recalculation of counts/totals
          await branch.save();
        } catch (err) {
          console.error('Error updating branch for product post-save:', err);
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
