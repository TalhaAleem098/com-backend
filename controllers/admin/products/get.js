const Product = require("@/models/product.models");

async function getAllProducts(page = 1, limit = 10, filters = {}) {
  try {
    const skip = (page - 1) * limit;
    const query = { isDeleted: false, ...filters };

    const [products, total] = await Promise.all([
      Product.find(query)
        .select("name description displayImage sku isActive isPublic productVariant.variantType category brand createdAt updatedAt")
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
        totalStock = nv?.totalStock || 0;
        variants = [{
          type: "none",
          stock: totalStock
        }];
      } else if (product.productVariant?.variantType === "size") {
        product.productVariant.sizeVariants?.forEach(size => {
          if (size.colors && Array.isArray(size.colors)) {
            size.colors.forEach(color => {
              const colorStock = color.totalStock || 0;
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
              const sizeStock = size.totalStock || 0;
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
