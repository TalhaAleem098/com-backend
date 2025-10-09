const express = require("express");
const router = express.Router();
const { upload } = require("@/utils/multer");
const { uploadToCloudinary, uploadBufferToCloudinary } = require("@/utils/cloudinary");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const Product = require("@/models/product.models");

const generateSKU = async () => {
  let sku, exists = true;
  while (exists) {
    const raw = uuidv4().replace(/-/g, ""); // UUID without hyphens
    sku = raw.substring(0, 6).toUpperCase();
    exists = await Product.findOne({ sku });
  }
  return sku;
};

// Validation function
const validateProductData = (basic, variantType, variantData) => {
  const errors = [];

  // Basic validation
  if (!basic.name || String(basic.name).trim() === "") {
    errors.push("Product name is required");
  }
  if (!basic.description || String(basic.description).trim() === "") {
    errors.push("Product description is required");
  }
  if (!basic.category || (Array.isArray(basic.category) && basic.category.length === 0)) {
    errors.push("At least one category is required");
  }
  if (!basic.brand || (Array.isArray(basic.brand) && basic.brand.length === 0)) {
    errors.push("At least one brand is required");
  }

  // Variant specific validation
  if (variantType === "none") {
    const noneVariant = variantData;
    if (!noneVariant || !noneVariant.basePricePerUnit || noneVariant.basePricePerUnit <= 0) {
      errors.push("Base price is required for non-variant products");
    }
    if (!noneVariant || !noneVariant.salePricePerUnit || noneVariant.salePricePerUnit <= 0) {
      errors.push("Sale price is required for non-variant products");
    }
    if (!noneVariant || !noneVariant.locationDistribution || noneVariant.locationDistribution.length === 0) {
      errors.push("At least one location with stock is required");
    }
  } else if (variantType === "size") {
    const sizeVariants = variantData;
    if (!sizeVariants || sizeVariants.length === 0) {
      errors.push("At least one size variant is required");
    } else {
      sizeVariants.forEach((size, sizeIndex) => {
        if (!size.sizeName || !size.abbreviation) {
          errors.push(`Size ${sizeIndex + 1}: Name and abbreviation are required`);
        }
        if (!size.colors || size.colors.length === 0) {
          errors.push(`Size ${sizeIndex + 1}: At least one color is required`);
        } else {
          size.colors.forEach((color, colorIndex) => {
            if (!color.colorName) {
              errors.push(`Size ${sizeIndex + 1}, Color ${colorIndex + 1}: Color name is required`);
            }
            if (!color.basePricePerUnit || color.basePricePerUnit <= 0) {
              errors.push(`Size ${sizeIndex + 1}, Color ${colorIndex + 1}: Base price is required`);
            }
            if (!color.salePricePerUnit || color.salePricePerUnit <= 0) {
              errors.push(`Size ${sizeIndex + 1}, Color ${colorIndex + 1}: Sale price is required`);
            }
          });
        }
      });
    }
  } else if (variantType === "color") {
    const colorVariants = variantData;
    if (!colorVariants || colorVariants.length === 0) {
      errors.push("At least one color variant is required");
    } else {
      colorVariants.forEach((color, colorIndex) => {
        if (!color.colorName) {
          errors.push(`Color ${colorIndex + 1}: Color name is required`);
        }
        if (!color.sizes || color.sizes.length === 0) {
          errors.push(`Color ${colorIndex + 1}: At least one size is required`);
        } else {
          color.sizes.forEach((size, sizeIndex) => {
            if (!size.sizeName || !size.abbreviation) {
              errors.push(`Color ${colorIndex + 1}, Size ${sizeIndex + 1}: Name and abbreviation are required`);
            }
            if (!size.basePricePerUnit || size.basePricePerUnit <= 0) {
              errors.push(`Color ${colorIndex + 1}, Size ${sizeIndex + 1}: Base price is required`);
            }
            if (!size.salePricePerUnit || size.salePricePerUnit <= 0) {
              errors.push(`Color ${colorIndex + 1}, Size ${sizeIndex + 1}: Sale price is required`);
            }
          });
        }
      });
    }
  }

  return errors;
};

router.post("/", upload.any(), async (req, res) => {
  try {
    const body = Object.fromEntries(
      Object.entries(req.body).map(([k, v]) => {
        try { return [k, JSON.parse(v)]; } catch { return [k, v]; }
      })
    );

    const basic = body.basicInfo || {};
    const variantType = body.variantType || "none";

    // Get variant data based on type
    let variantData = null;
    if (variantType === "none") {
      variantData = body.noneVariant || {};
    } else if (variantType === "size") {
      variantData = body.sizeVariants || [];
    } else if (variantType === "color") {
      variantData = body.colorVariants || [];
    }

    // Validate the data
    const validationErrors = validateProductData(basic, variantType, variantData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed", 
        errors: validationErrors 
      });
    }
    
    const productData = {
      name: basic.name?.trim() || null,
      sku: basic.sku || await generateSKU(),
      description: Array.isArray(basic.description) 
        ? basic.description.filter(Boolean) 
        : [basic.description].filter(Boolean),
      tags: Array.isArray(basic.tags) 
        ? basic.tags.filter(Boolean) 
        : [],
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
      displayImage: null, // Will be set during image processing
      productVariant: {
        variantType: variantType,
        defaultCurrency: basic.defaultCurrency || { symbol: "Rs" },
        measures: Array.isArray(body.measurements) ? body.measurements.filter(m => m && (m.rowName || (m.columns && m.columns.length > 0))) : [],
        measureUnit: body.measureUnit || null,
      },
    };

    // Handle different variant types
    if (variantType === "none") {
      const none = variantData;
      const locationDist = (none.locationDistribution || [])
        .filter(ld => ld.locationId && ld.locationId.trim())
        .map(ld => ({ branch: ld.locationId, stock: Number(ld.stock) || 0 }));
      
      productData.productVariant.nonVariant = {
        locationDistribution: locationDist,
        totalStock: locationDist.reduce((sum, ld) => sum + ld.stock, 0),
        sold: Number(none.sold) || 0,
        images: [],
        purchasePricePerUnit: Number(none.purchasePricePerUnit) || 0,
        basePricePerUnit: Number(none.basePricePerUnit) || 0,
        salePricePerUnit: Number(none.salePricePerUnit) || 0,
      };
    } else if (variantType === "size") {
      const sizeVariants = variantData;
      productData.productVariant.sizeVariants = sizeVariants.map(size => ({
        sizeName: size.sizeName?.trim() || "",
        abbreviation: size.abbreviation?.trim() || "",
        images: [],
        colors: (size.colors || []).map(color => {
          const locationDist = (color.locationDistribution || [])
            .filter(ld => ld.locationId && ld.locationId.trim())
            .map(ld => ({ branch: ld.locationId, stock: Number(ld.stock) || 0 }));
          
          return {
            colorName: color.colorName?.trim() || "",
            locationDistribution: locationDist,
            totalStock: locationDist.reduce((sum, ld) => sum + ld.stock, 0),
            sold: 0,
            purchasePricePerUnit: Number(color.purchasePricePerUnit) || 0,
            basePricePerUnit: Number(color.basePricePerUnit) || 0,
            salePricePerUnit: Number(color.salePricePerUnit) || 0,
          };
        })
      }));
    } else if (variantType === "color") {
      const colorVariants = variantData;
      productData.productVariant.colorVariants = colorVariants.map(color => ({
        colorName: color.colorName?.trim() || "",
        images: [],
        sizes: (color.sizes || []).map(size => {
          const locationDist = (size.locationDistribution || [])
            .filter(ld => ld.locationId && ld.locationId.trim())
            .map(ld => ({ branch: ld.locationId, stock: Number(ld.stock) || 0 }));
          
          return {
            sizeName: size.sizeName?.trim() || "",
            abbreviation: size.abbreviation?.trim() || "",
            locationDistribution: locationDist,
            totalStock: locationDist.reduce((sum, ld) => sum + ld.stock, 0),
            sold: 0,
            purchasePricePerUnit: Number(size.purchasePricePerUnit) || 0,
            basePricePerUnit: Number(size.basePricePerUnit) || 0,
            salePricePerUnit: Number(size.salePricePerUnit) || 0,
          };
        })
      }));
    }

    // Handle image uploads
    if (req.files && req.files.length) {
      const HARD_LIMIT = 5 * 1024 * 1024; // 5MB
      const TARGET_MAX = Math.floor(1.4 * 1024 * 1024); // 1.4MB

      // Validate files
      for (const f of req.files) {
        if (!f.mimetype.startsWith("image/")) {
          return res.status(400).json({ 
            success: false, 
            message: `Only images allowed: ${f.originalname}` 
          });
        }
        if (f.size > HARD_LIMIT) {
          return res.status(400).json({ 
            success: false, 
            message: `File too large: ${f.originalname}, max 5MB` 
          });
        }
      }

      // Image compression function
      const compressToWebP = async buffer => {
        let out = await sharp(buffer).webp({ quality: 80 }).toBuffer();
        let quality = 70;
        while (out.length > TARGET_MAX && quality >= 40) {
          out = await sharp(buffer).webp({ quality }).toBuffer().catch(() => out);
          quality -= 10;
        }
        if (out.length > TARGET_MAX) {
          let width = (await sharp(buffer).metadata().catch(() => ({}))).width || null;
          let factor = 0.9;
          while (out.length > TARGET_MAX && factor > 0.3 && width) {
            out = await sharp(buffer).resize(Math.round(width * factor)).webp({ quality: 60 }).toBuffer().catch(() => out);
            factor -= 0.1;
          }
        }
        if (out.length > TARGET_MAX) throw new Error("Cannot compress image under 1.4MB");
        return out;
      };

      // Upload all files
      const uploaded = await Promise.all(req.files.map(async file => {
        try {
          const buf = await compressToWebP(file.buffer);
          const result = await uploadBufferToCloudinary(buf, "products");
          return { 
            fieldname: file.fieldname, 
            success: result.success,
            file: result.file 
          };
        } catch (error) {
          console.error(`Failed to process ${file.fieldname}:`, error);
          return { fieldname: file.fieldname, success: false, error: error.message };
        }
      }));

      // Process uploaded files
      for (const u of uploaded) {
        if (!u?.success || !u.file) continue;
        
        const fileObj = { 
          url: u.file.url || u.file.secure_url || null, 
          publicId: u.file.publicId || u.file.public_id || null 
        };
        
        // Handle display image
        if (u.fieldname === "displayImage") {
          productData.displayImage = fileObj.url;
        }
        // Handle non-variant images
        else if (variantType === "none" && u.fieldname.startsWith("noneVariant_")) {
          productData.productVariant.nonVariant.images.push(fileObj);
        }
        // Handle size variant images
        else if (variantType === "size") {
          const sizeMatch = u.fieldname.match(/^sizeVariant_(\d+)_image_/);
          if (sizeMatch) {
            const sizeIndex = parseInt(sizeMatch[1]);
            if (productData.productVariant.sizeVariants[sizeIndex]) {
              productData.productVariant.sizeVariants[sizeIndex].images.push(fileObj);
            }
          }
        }
        // Handle color variant images
        else if (variantType === "color") {
          const colorMatch = u.fieldname.match(/^colorVariant_(\d+)_image_/);
          if (colorMatch) {
            const colorIndex = parseInt(colorMatch[1]);
            if (productData.productVariant.colorVariants[colorIndex]) {
              productData.productVariant.colorVariants[colorIndex].images.push(fileObj);
            }
          }
        }
      }
    }

    const product = new Product(productData);
    
    // Recalculate totals if method exists
    if (product.productVariant?.recalculateTotals) {
      try { 
        product.productVariant.recalculateTotals(); 
      } catch (error) {
        console.error("Error recalculating totals:", error);
      }
    }
    
    await product.save();

    res.status(201).json({ 
      success: true, 
      message: "Product created successfully",
      data: {
        id: product._id,
        name: product.name,
        sku: product.sku
      }
    });

  } catch (err) {
    console.error("Error creating product:", err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed", 
        errors: validationErrors 
      });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "A product with this SKU already exists" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;