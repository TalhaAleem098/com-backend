const router = require("express").Router();
const mongoose = require("mongoose");
const Product = require("../../models/product.models");

const sanitizeProduct = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (key === 'purchasePricePerUnit' || key === 'basePricePerUnit') {
      continue;
    }
    sanitized[key] = sanitizeProduct(obj[key]);
  }

  return sanitized;
};

const transformObjectIds = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  const transformed = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj[key] instanceof mongoose.Types.ObjectId) {
      transformed[key] = obj[key].toString();
    } else if (typeof obj[key] === 'object') {
      transformed[key] = transformObjectIds(obj[key]);
    } else {
      transformed[key] = obj[key];
    }
  }

  return transformed;
};

router.get("/multiple", async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({
        success: false,
        message: "Product IDs are required",
      });
    }

    const idArray = Array.isArray(ids) ? ids : ids.split(',');

    const validIds = idArray.filter(id => mongoose.isValidObjectId(id));

    if (validIds.length !== idArray.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid product IDs provided",
      });
    }

    const products = await Product.find({
      _id: { $in: validIds },
      isDeleted: false,
      status: "active",
      isPublic: true,
    })
      .select("name productVariant")
      .lean();

    const simplifiedProducts = products.map(product => {
      let images = [];
      let price = null;

      const variant = product.productVariant;

      if (variant) {
        if (variant.variantType === "none" && variant.nonVariant) {
          images = variant.nonVariant.images || [];
          price = variant.nonVariant.salePricePerUnit || variant.nonVariant.basePricePerUnit || 0;
        } else if (variant.variantType === "size" && variant.sizeVariants && variant.sizeVariants.length > 0) {
          const firstSize = variant.sizeVariants[0];
          images = firstSize.images || [];
          if (firstSize.colors && firstSize.colors.length > 0) {
            const firstColor = firstSize.colors[0];
            price = firstColor.salePricePerUnit || firstColor.basePricePerUnit || 0;
          }
        } else if (variant.variantType === "color" && variant.colorVariants && variant.colorVariants.length > 0) {
          const firstColor = variant.colorVariants[0];
          images = firstColor.images || [];
          if (firstColor.sizes && firstColor.sizes.length > 0) {
            const firstSize = firstColor.sizes[0];
            price = firstSize.salePricePerUnit || firstSize.basePricePerUnit || 0;
          }
        }
      }

      const limitedImages = images.slice(0, 2).map(img => img.url).filter(Boolean);

      return {
        _id: product._id.toString(),
        name: product.name,
        images: limitedImages,
        price: price
      };
    });

    console.log("Fetched multiple products:", simplifiedProducts);

    return res.status(200).json({
      success: true,
      data: simplifiedProducts,
    });
  } catch (err) {
    console.error("Error fetching multiple products:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = await Product.findOne({
      _id: id,
      isDeleted: false,
      status: "active",
      isPublic: true,
    })
      .populate("category", "name _id image")
      .populate("brand", "name _id logo")
      .select("-createdAt -updatedAt -__v -isDeleted -deletedAt -commentSection")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const transformedProduct = transformObjectIds(product);
    const sanitizedProduct = sanitizeProduct(transformedProduct);

    let relatedProducts = [];

    if (product.linkedProducts && product.linkedProducts.length > 0) {
      const linkedIds = product.linkedProducts.map(lp => lp.productId);
      
      const linkedProductsData = await Product.find({
        _id: { $in: linkedIds },
        isDeleted: false,
        status: "active",
        isPublic: true,
      })
        .select("name productVariant")
        .lean();

      relatedProducts = linkedProductsData.map(prod => {
        let images = [];
        let price = null;

        const variant = prod.productVariant;

        if (variant) {
          if (variant.variantType === "none" && variant.nonVariant) {
            images = variant.nonVariant.images || [];
            price = variant.nonVariant.salePricePerUnit || variant.nonVariant.basePricePerUnit || 0;
          } else if (variant.variantType === "size" && variant.sizeVariants && variant.sizeVariants.length > 0) {
            const firstSize = variant.sizeVariants[0];
            images = firstSize.images || [];
            if (firstSize.colors && firstSize.colors.length > 0) {
              const firstColor = firstSize.colors[0];
              price = firstColor.salePricePerUnit || firstColor.basePricePerUnit || 0;
            }
          } else if (variant.variantType === "color" && variant.colorVariants && variant.colorVariants.length > 0) {
            const firstColor = variant.colorVariants[0];
            images = firstColor.images || [];
            if (firstColor.sizes && firstColor.sizes.length > 0) {
              const firstSize = firstColor.sizes[0];
              price = firstSize.salePricePerUnit || firstSize.basePricePerUnit || 0;
            }
          }
        }

        const limitedImages = images.slice(0, 2).map(img => img.url).filter(Boolean);

        return {
          _id: prod._id.toString(),
          name: prod.name,
          images: limitedImages,
          price: price
        };
      });
    } else if (product.category && product.category.length > 0) {
      const categoryIds = product.category.map(cat => cat._id || cat);

      const similarProducts = await Product.find({
        _id: { $ne: id },
        isDeleted: false,
        status: "active",
        isPublic: true,
        category: { $in: categoryIds }
      })
        .select("name productVariant category")
        .limit(20)
        .lean();

      const productsWithScore = similarProducts.map(prod => {
        const prodCategories = prod.category.map(cat => cat.toString());
        const matchCount = categoryIds.filter(catId => 
          prodCategories.includes(catId.toString())
        ).length;

        return { product: prod, matchCount };
      });

      productsWithScore.sort((a, b) => b.matchCount - a.matchCount);

      const topProducts = productsWithScore.slice(0, 8);

      relatedProducts = topProducts.map(({ product: prod }) => {
        let images = [];
        let price = null;

        const variant = prod.productVariant;

        if (variant) {
          if (variant.variantType === "none" && variant.nonVariant) {
            images = variant.nonVariant.images || [];
            price = variant.nonVariant.salePricePerUnit || variant.nonVariant.basePricePerUnit || 0;
          } else if (variant.variantType === "size" && variant.sizeVariants && variant.sizeVariants.length > 0) {
            const firstSize = variant.sizeVariants[0];
            images = firstSize.images || [];
            if (firstSize.colors && firstSize.colors.length > 0) {
              const firstColor = firstSize.colors[0];
              price = firstColor.salePricePerUnit || firstColor.basePricePerUnit || 0;
            }
          } else if (variant.variantType === "color" && variant.colorVariants && variant.colorVariants.length > 0) {
            const firstColor = variant.colorVariants[0];
            images = firstColor.images || [];
            if (firstColor.sizes && firstColor.sizes.length > 0) {
              const firstSize = firstColor.sizes[0];
              price = firstSize.salePricePerUnit || firstSize.basePricePerUnit || 0;
            }
          }
        }

        const limitedImages = images.slice(0, 2).map(img => img.url).filter(Boolean);

        return {
          _id: prod._id.toString(),
          name: prod.name,
          images: limitedImages,
          price: price
        };
      });
    }

    delete sanitizedProduct.linkedProducts;

    return res.status(200).json({
      success: true,
      data: {
        product: sanitizedProduct,
        relatedProducts: relatedProducts
      }
    });
  } catch (err) {
    console.error("Error fetching product by ID:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
});

module.exports = router;