const Product = require("@/models/product.models");

async function getAllProducts(page = 1, limit = 10, filters = {}) {
  try {
    const skip = (page - 1) * limit;
    const query = { isDeleted: false, ...filters };

    const [products, total] = await Promise.all([
      Product.find(query)
        .select("name description displayImage minStockToMaintain sku isActive isPublic productVariant category brand createdAt updatedAt")
        .populate("category", "name")
        .populate("brand", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    const formattedProducts = products.map(product => {
      let totalStock = 0;
      let variants = [];

      if (product.productVariant?.variantType === "none") {
        const nv = product.productVariant.nonVariant;
        let noneStock = 0;
        
        if (nv?.locationDistribution && Array.isArray(nv.locationDistribution)) {
          nv.locationDistribution.forEach(loc => {
            noneStock += loc.stock || 0;
          });
        }
        
        totalStock = noneStock;
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

      return {
        _id: product._id,
        name: product.name,
        description: product.description,
        displayImage: product.displayImage,
        sku: product.sku,
        isActive: product.isActive,
        isPublic: product.isPublic,
        variantType: product.productVariant?.variantType,
        minStockToMaintain: product.minStockToMaintain,
        totalStock,
        variants,
        category: product.category,
        brand: product.brand,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
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

async function searchProducts(searchTerm, limit = 15) {
  try {
    if (!searchTerm || typeof searchTerm !== "string") {
      return { products: [] };
    }

    const searchRegex = new RegExp(searchTerm.trim(), "i");

    const products = await Product.find({
      isDeleted: false,
      $or: [
        { name: searchRegex },
        { sku: searchRegex },
        { tags: searchRegex },
        { description: searchRegex }
      ]
    })
      .select("name displayImage sku")
      .limit(limit)
      .sort({ name: 1 })
      .lean();

    return {
      products: products.map(p => ({
        _id: p._id,
        name: p.name,
        displayImage: p.displayImage,
        sku: p.sku
      }))
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getAllProducts,
  searchProducts
};
