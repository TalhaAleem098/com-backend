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

    if (doc.productVariant) {
      const Branch = mongoose.model('Branch');
      const branchStockMap = new Map();

      if (doc.productVariant.variantType === 'none' && doc.productVariant.nonVariant?.locationDistribution) {
        doc.productVariant.nonVariant.locationDistribution.forEach(location => {
          if (location.branch) {
            const branchId = location.branch.toString();
            const currentStock = branchStockMap.get(branchId) || 0;
            branchStockMap.set(branchId, currentStock + (location.stock || 0));
          }
        });
      } else if (doc.productVariant.variantType === 'size' && doc.productVariant.sizeVariants) {
        doc.productVariant.sizeVariants.forEach(size => {
          if (size.colors && Array.isArray(size.colors)) {
            size.colors.forEach(color => {
              if (color.locationDistribution && Array.isArray(color.locationDistribution)) {
                color.locationDistribution.forEach(location => {
                  if (location.branch) {
                    const branchId = location.branch.toString();
                    const currentStock = branchStockMap.get(branchId) || 0;
                    branchStockMap.set(branchId, currentStock + (location.stock || 0));
                  }
                });
              }
            });
          }
        });
      } else if (doc.productVariant.variantType === 'color' && doc.productVariant.colorVariants) {
        doc.productVariant.colorVariants.forEach(color => {
          if (color.sizes && Array.isArray(color.sizes)) {
            color.sizes.forEach(size => {
              if (size.locationDistribution && Array.isArray(size.locationDistribution)) {
                size.locationDistribution.forEach(location => {
                  if (location.branch) {
                    const branchId = location.branch.toString();
                    const currentStock = branchStockMap.get(branchId) || 0;
                    branchStockMap.set(branchId, currentStock + (location.stock || 0));
                  }
                });
              }
            });
          }
        });
      }

      for (const [branchId, totalStock] of branchStockMap.entries()) {
        try {
          const branch = await Branch.findById(branchId);
          if (!branch) continue;

          branch.stock = branch.stock || { products: [], productsCount: 0, totalStocks: 0 };
          branch.stock.products = branch.stock.products || [];

          const existingIndex = branch.stock.products.findIndex(
            p => p.productId.toString() === doc._id.toString()
          );

          if (existingIndex >= 0) {
            branch.stock.products[existingIndex].quantity = totalStock;
          } else {
            if (totalStock > 0) {
              branch.stock.products.push({
                productId: doc._id,
                quantity: totalStock
              });
            }
          }

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
      if (doc.category && doc.category.length > 0) {
        const Category = mongoose.model('Category');
        
        for (const categoryId of doc.category) {
          try {
            const category = await Category.findById(categoryId);
            if (category) {
              category.items = (category.items || []).filter(
                id => id.toString() !== doc._id.toString()
              );
              await category.save();
            }
          } catch (err) {
            console.error('Error removing product from category:', err);
          }
        }
      }

      if (doc.brand && doc.brand.length > 0) {
        const Brand = mongoose.model('Brand');
        
        for (const brandId of doc.brand) {
          try {
            const brand = await Brand.findById(brandId);
            if (brand) {
              brand.items = (brand.items || []).filter(
                id => id.toString() !== doc._id.toString()
              );
              await brand.save();
            }
          } catch (err) {
            console.error('Error removing product from brand:', err);
          }
        }
      }

      const Branch = mongoose.model('Branch');
      const branchIds = new Set();

      if (doc.productVariant) {
        if (doc.productVariant.variantType === 'none' && doc.productVariant.nonVariant?.locationDistribution) {
          doc.productVariant.nonVariant.locationDistribution.forEach(loc => {
            if (loc.branch) branchIds.add(loc.branch.toString());
          });
        } else if (doc.productVariant.variantType === 'size' && doc.productVariant.sizeVariants) {
          doc.productVariant.sizeVariants.forEach(size => {
            if (size.colors) {
              size.colors.forEach(color => {
                if (color.locationDistribution) {
                  color.locationDistribution.forEach(loc => {
                    if (loc.branch) branchIds.add(loc.branch.toString());
                  });
                }
              });
            }
          });
        } else if (doc.productVariant.variantType === 'color' && doc.productVariant.colorVariants) {
          doc.productVariant.colorVariants.forEach(color => {
            if (color.sizes) {
              color.sizes.forEach(size => {
                if (size.locationDistribution) {
                  size.locationDistribution.forEach(loc => {
                    if (loc.branch) branchIds.add(loc.branch.toString());
                  });
                }
              });
            }
          });
        }
      }

      for (const branchId of branchIds) {
        try {
          const branch = await Branch.findById(branchId);
          if (branch) {
            branch.stock = branch.stock || { products: [] };
            branch.stock.products = (branch.stock.products || []).filter(
              p => p.productId.toString() !== doc._id.toString()
            );
            await branch.save();
          }
        } catch (err) {
          console.error('Error removing product from branch:', err);
        }
      }
    } catch (error) {
      console.error('Error in product update middleware:', error);
    }
  }
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
