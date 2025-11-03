const Product = require("@/models/product.models");

function calculateTotalStock(product) {
  let totalStock = 0;
  
  if (!product.productVariant) return 0;

  if (product.productVariant.variantType === "none") {
    const nv = product.productVariant.nonVariant;
    if (nv?.locationDistribution && Array.isArray(nv.locationDistribution)) {
      nv.locationDistribution.forEach(loc => {
        totalStock += loc.stock || 0;
      });
    }
  } else if (product.productVariant.variantType === "size") {
    product.productVariant.sizeVariants?.forEach(size => {
      if (size.colors && Array.isArray(size.colors)) {
        size.colors.forEach(color => {
          if (color.locationDistribution && Array.isArray(color.locationDistribution)) {
            color.locationDistribution.forEach(loc => {
              totalStock += loc.stock || 0;
            });
          }
        });
      }
    });
  } else if (product.productVariant.variantType === "color") {
    product.productVariant.colorVariants?.forEach(color => {
      if (color.sizes && Array.isArray(color.sizes)) {
        color.sizes.forEach(size => {
          if (size.locationDistribution && Array.isArray(size.locationDistribution)) {
            size.locationDistribution.forEach(loc => {
              totalStock += loc.stock || 0;
            });
          }
        });
      }
    });
  }

  return totalStock;
}

function getStockStatus(totalStock, minStockToMaintain = 0) {
  if (totalStock === 0) return "outofstock";
  if (totalStock <= minStockToMaintain) return "lowstock";
  return "instock";
}

function getDaysUntilDeletion(deletedAt) {
  if (!deletedAt) return null;
  const now = new Date();
  const deleted = new Date(deletedAt);
  const daysPassed = Math.floor((now - deleted) / (1000 * 60 * 60 * 24));
  const daysRemaining = 30 - daysPassed;
  return daysRemaining > 0 ? daysRemaining : 0;
}

async function getAllProducts(page = 1, limit = 10, filters = {}, searchTerm = null, dataType = "full", status = "active", stockFilter = null) {
  try {
    const skip = (page - 1) * limit;
    const query = { ...filters };

    if (status && ["active", "archived", "deleted"].includes(status)) {
      query.status = status;
    } else {
      query.status = "active";
    }

    if (status === "deleted") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.deletedAt = { $gte: thirtyDaysAgo };
    }

    if (searchTerm && typeof searchTerm === "string" && searchTerm.trim()) {
      const searchRegex = new RegExp(searchTerm.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { tags: searchRegex },
        { description: searchRegex }
      ];
    }

    const selectFields = dataType === "partial" 
      ? "name description displayImage minStockToMaintain sku isActive isPublic status productVariant category brand createdAt updatedAt deletedAt"
      : "";

    let allProducts = await Product.find(query)
      .select(selectFields)
      .populate("category", dataType === "partial" ? "name" : "")
      .populate("brand", dataType === "partial" ? "name" : "")
      .sort({ createdAt: -1 })
      .lean();

    if (stockFilter && ["instock", "lowstock", "outofstock"].includes(stockFilter)) {
      allProducts = allProducts.filter(product => {
        const totalStock = calculateTotalStock(product);
        const stockStatus = getStockStatus(totalStock, product.minStockToMaintain);
        return stockStatus === stockFilter;
      });
    }

    const total = allProducts.length;
    const products = allProducts.slice(skip, skip + limit);

    const formattedProducts = products.map(product => {
      if (dataType === "full") {
        const totalStock = calculateTotalStock(product);
        const stockStatus = getStockStatus(totalStock, product.minStockToMaintain);
        
        return {
          ...product,
          totalStock,
          stockStatus,
          daysUntilDeletion: product.status === "deleted" ? getDaysUntilDeletion(product.deletedAt) : null
        };
      }

      let totalStock = 0;
      let variants = [];
      let hasInStock = false;
      let hasOutOfStock = false;

      if (product.productVariant?.variantType === "none") {
        const nv = product.productVariant.nonVariant;
        let noneStock = 0;
        
        if (nv?.locationDistribution && Array.isArray(nv.locationDistribution)) {
          nv.locationDistribution.forEach(loc => {
            noneStock += loc.stock || 0;
          });
        }
        
        totalStock = noneStock;
        hasInStock = noneStock > 0;
        hasOutOfStock = noneStock === 0;
        
        variants = [{
          type: "none",
          stock: noneStock
        }];
      } else if (product.productVariant?.variantType === "size") {
        product.productVariant.sizeVariants?.forEach(size => {
          if (size.colors && Array.isArray(size.colors)) {
            size.colors.forEach(color => {
              let colorStock = 0;
              
              if (color.locationDistribution && Array.isArray(color.locationDistribution)) {
                color.locationDistribution.forEach(loc => {
                  colorStock += loc.stock || 0;
                });
              }
              
              totalStock += colorStock;
              
              if (colorStock > 0) hasInStock = true;
              if (colorStock === 0) hasOutOfStock = true;
              
              variants.push({
                type: "size-color",
                sizeName: size.sizeName,
                abbreviation: size.abbreviation,
                colorName: color.colorName,
                stock: colorStock
              });
            });
          }
        });
      } else if (product.productVariant?.variantType === "color") {
        product.productVariant.colorVariants?.forEach(color => {
          if (color.sizes && Array.isArray(color.sizes)) {
            color.sizes.forEach(size => {
              let sizeStock = 0;
              
              if (size.locationDistribution && Array.isArray(size.locationDistribution)) {
                size.locationDistribution.forEach(loc => {
                  sizeStock += loc.stock || 0;
                });
              }
              
              totalStock += sizeStock;
              
              if (sizeStock > 0) hasInStock = true;
              if (sizeStock === 0) hasOutOfStock = true;
              
              variants.push({
                type: "color-size",
                colorName: color.colorName,
                sizeName: size.sizeName,
                abbreviation: size.abbreviation,
                stock: sizeStock
              });
            });
          }
        });
      }

      const stockStatus = getStockStatus(totalStock, product.minStockToMaintain);

      return {
        _id: product._id,
        name: product.name,
        description: product.description,
        displayImage: product.displayImage,
        sku: product.sku,
        isActive: product.isActive,
        isPublic: product.isPublic,
        status: product.status,
        variantType: product.productVariant?.variantType,
        minStockToMaintain: product.minStockToMaintain,
        totalStock,
        stockStatus,
        hasInStock,
        hasOutOfStock,
        variants,
        category: product.category,
        brand: product.brand,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        daysUntilDeletion: product.status === "deleted" ? getDaysUntilDeletion(product.deletedAt) : null
      };
    });

    return {
      products: formattedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getAllProducts
};
