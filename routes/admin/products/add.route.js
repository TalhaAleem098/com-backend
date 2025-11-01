const express = require("express");
const router = express.Router();
const {
  moveImageFromTemp,
  deleteFromCloudinary,
} = require("@/utils/cloudinary");
const { v4: uuidv4 } = require("uuid");
const Product = require("@/models/product.models");


const generateSKU = async () => {
  let sku,
    exists = true;
  while (exists) {
    sku = uuidv4().replace(/-/g, "").substring(0, 6).toUpperCase();
    exists = await Product.findOne({ sku });
  }
  return sku;
};

const validateProductData = (basic, variantType, variantData) => {
  const errors = [];

  // Basic validation
  const required = [
    { field: basic.name, msg: "Product name is required" },
    { field: basic.description, msg: "Product description is required" },
    { field: basic.category, msg: "At least one category is required" },
    { field: basic.brand, msg: "At least one brand is required" },
  ];

  required.forEach(({ field, msg }) => {
    if (!field || (Array.isArray(field) && field.length === 0))
      errors.push(msg);
  });

  // Variant-specific validation
  if (variantType === "none") {
    const v = variantData;
    if (!v?.basePricePerUnit || v.basePricePerUnit <= 0)
      errors.push("Base price is required");
    if (!v?.salePricePerUnit || v.salePricePerUnit <= 0)
      errors.push("Sale price is required");
    if (!v?.locationDistribution?.length)
      errors.push("At least one location with stock is required");
  } else {
    const variants = Array.isArray(variantData) ? variantData : [];
    variants.forEach((v, i) => {
      if (variantType === "size") {
        if (!v.sizeName || !v.abbreviation)
          errors.push(`Size ${i + 1}: Name & abbreviation required`);
        v.colors?.forEach((c, j) => {
          if (!c.colorName)
            errors.push(`Size ${i + 1}, Color ${j + 1}: Color name required`);
          if (!c.basePricePerUnit || c.basePricePerUnit <= 0)
            errors.push(`Size ${i + 1}, Color ${j + 1}: Base price required`);
          if (!c.salePricePerUnit || c.salePricePerUnit <= 0)
            errors.push(`Size ${i + 1}, Color ${j + 1}: Sale price required`);
        });
      } else if (variantType === "color") {
        if (!v.colorName) errors.push(`Color ${i + 1}: Color name required`);
        v.sizes?.forEach((s, j) => {
          if (!s.sizeName || !s.abbreviation)
            errors.push(
              `Color ${i + 1}, Size ${j + 1}: Name & abbreviation required`
            );
          if (!s.basePricePerUnit || s.basePricePerUnit <= 0)
            errors.push(`Color ${i + 1}, Size ${j + 1}: Base price required`);
          if (!s.salePricePerUnit || s.salePricePerUnit <= 0)
            errors.push(`Color ${i + 1}, Size ${j + 1}: Sale price required`);
        });
      }
    });
  }

  return errors;
};

// Map location distribution
const mapLocations = (dist) =>
  (dist || [])
    .filter((ld) => ld.locationId)
    .map((ld) => ({ branch: ld.locationId, stock: Number(ld.stock) || 0 }));

/**
 * Move temp image to permanent folder
 * @param {Object} imageObj - {url, publicId}
 * @returns {Promise<Object>} - {url, publicId} with new location
 */
const moveImageToPermanent = async (imageObj) => {
  if (!imageObj || !imageObj.publicId) return null;
  
  // If already in permanent folder, return as-is
  if (!imageObj.publicId.startsWith("temp/")) {
    return imageObj;
  }

  const moveResult = await moveImageFromTemp(imageObj.publicId, "products");
  if (!moveResult.success) {
    throw new Error(`Failed to move image: ${moveResult.message}`);
  }

  return {
    url: moveResult.file.url,
    publicId: moveResult.file.publicId,
  };
};

/**
 * Process image array - move from temp to permanent
 * @param {Array} images - Array of {url, publicId} objects
 * @returns {Promise<Array>}
 */
const processImages = async (images) => {
  if (!Array.isArray(images) || images.length === 0) return [];
  
  const movedImages = await Promise.all(
    images.map(async (img) => {
      try {
        return await moveImageToPermanent(img);
      } catch (err) {
        console.error("Error moving image:", err);
        return null;
      }
    })
  );

  return movedImages.filter(Boolean);
};

// ---------- Route ----------

router.post("/", async (req, res) => {
  const movedImages = []; // Track moved images for rollback
  
  try {
    // Parse request body
    const body = req.body;
    
    const basic = body.basicInfo || {};
    const variantType = body.variantType || "none";
    const variantData =
      variantType === "none"
        ? body.noneVariant || {}
        : variantType === "size"
        ? body.sizeVariants || []
        : variantType === "color"
        ? body.colorVariants || []
        : null;

    // Validate
    const errors = validateProductData(basic, variantType, variantData);
    if (errors.length)
      return res
        .status(400)
        .json({ success: false, message: "Validation failed", errors });

    // Move display image from temp to permanent
    let displayImageUrl = null;
    if (basic.displayImage && basic.displayImage.publicId) {
      const movedDisplayImage = await moveImageToPermanent(basic.displayImage);
      if (movedDisplayImage) {
        displayImageUrl = movedDisplayImage.url;
        movedImages.push(movedDisplayImage.publicId);
      }
    }

    // Base product data
    const productData = {
      name: basic.name?.trim(),
      sku: basic.sku || (await generateSKU()),
      description: Array.isArray(basic.description)
        ? basic.description.filter(Boolean)
        : [basic.description].filter(Boolean),
      tags: Array.isArray(basic.tags) ? basic.tags.filter(Boolean) : [],
      careInstructions: basic.careInstructions?.trim() || null,
      disclaimer: basic.disclaimer?.trim() || null,
      minStockToMaintain: Number(basic.minStock) || 0,
      defaultCurrency: basic.defaultCurrency || { symbol: "Rs" },
      category: Array.isArray(basic.category)
        ? basic.category.filter(Boolean)
        : [basic.category].filter(Boolean),
      brand: Array.isArray(basic.brand)
        ? basic.brand.filter(Boolean)
        : [basic.brand].filter(Boolean),
      isActive: basic.isActive ?? true,
      isPublic: basic.isPublic ?? true,
      displayImage: displayImageUrl,
      productVariant: {
        variantType,
        defaultCurrency: basic.defaultCurrency || { symbol: "Rs" },
        measures: Array.isArray(body.measurements)
          ? body.measurements.filter(
              (m) => m && (m.rowName || (m.columns && m.columns.length))
            )
          : [],
        measureUnit: body.measureUnit || null,
      },
    };

    // ---------- Handle variants and move images ----------
    if (variantType === "none") {
      const none = variantData;
      
      // Move images from temp to permanent
      const noneImages = await processImages(none.images || []);
      noneImages.forEach(img => movedImages.push(img.publicId));

      productData.productVariant.nonVariant = {
        locationDistribution: mapLocations(none.locationDistribution),
        totalStock: mapLocations(none.locationDistribution).reduce(
          (sum, ld) => sum + ld.stock,
          0
        ),
        sold: Number(none.sold) || 0,
        images: noneImages,
        purchasePricePerUnit: Number(none.purchasePricePerUnit) || 0,
        basePricePerUnit: Number(none.basePricePerUnit) || 0,
        salePricePerUnit: Number(none.salePricePerUnit) || 0,
      };
    } else if (variantType === "size") {
      productData.productVariant.sizeVariants = await Promise.all(
        (variantData || []).map(async (size) => {
          // Move size images from temp to permanent
          const sizeImages = await processImages(size.images || []);
          sizeImages.forEach(img => movedImages.push(img.publicId));

          return {
            sizeName: size.sizeName?.trim() || "",
            abbreviation: size.abbreviation?.trim() || "",
            images: sizeImages,
            colors: (size.colors || []).map((color) => ({
              colorName: color.colorName?.trim() || "",
              locationDistribution: mapLocations(color.locationDistribution),
              totalStock: mapLocations(color.locationDistribution).reduce(
                (sum, ld) => sum + ld.stock,
                0
              ),
              sold: 0,
              purchasePricePerUnit: Number(color.purchasePricePerUnit) || 0,
              basePricePerUnit: Number(color.basePricePerUnit) || 0,
              salePricePerUnit: Number(color.salePricePerUnit) || 0,
            })),
          };
        })
      );
    } else if (variantType === "color") {
      productData.productVariant.colorVariants = await Promise.all(
        (variantData || []).map(async (color) => {
          // Move color images from temp to permanent
          const colorImages = await processImages(color.images || []);
          colorImages.forEach(img => movedImages.push(img.publicId));

          return {
            colorName: color.colorName?.trim() || "",
            images: colorImages,
            sizes: (color.sizes || []).map((size) => ({
              sizeName: size.sizeName?.trim() || "",
              abbreviation: size.abbreviation?.trim() || "",
              locationDistribution: mapLocations(size.locationDistribution),
              totalStock: mapLocations(size.locationDistribution).reduce(
                (sum, ld) => sum + ld.stock,
                0
              ),
              sold: 0,
              purchasePricePerUnit: Number(size.purchasePricePerUnit) || 0,
              basePricePerUnit: Number(size.basePricePerUnit) || 0,
              salePricePerUnit: Number(size.salePricePerUnit) || 0,
            })),
          };
        })
      );
    }

    // ---------- Save product ----------
    const product = new Product(productData);
    if (product.productVariant?.recalculateTotals)
      product.productVariant.recalculateTotals();
    await product.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: { id: product._id, name: product.name, sku: product.sku },
    });
  } catch (err) {
    console.error("Error creating product:", err);
    
    // Rollback: Delete moved images on error
    if (movedImages.length > 0) {
      console.log("Rolling back moved images:", movedImages);
      try {
        await Promise.all(
          movedImages.map(publicId => deleteFromCloudinary(publicId))
        );
      } catch (rollbackErr) {
        console.error("Error during rollback:", rollbackErr);
      }
    }

    if (err.name === "ValidationError") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: Object.values(err.errors).map((e) => e.message),
        });
    }
    if (err.code === 11000)
      return res
        .status(400)
        .json({
          success: false,
          message: "A product with this SKU already exists",
        });
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
  }
});

module.exports = router;
