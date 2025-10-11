const express = require("express");
const router = express.Router();
const { upload } = require("@/utils/multer");
const {
  uploadToCloudinary,
  uploadBufferToCloudinary,
} = require("@/utils/cloudinary");
const sharp = require("sharp");
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

const compressToWebP = async (buffer, targetMax = 1.4 * 1024 * 1024) => {
  let out = await sharp(buffer).webp({ quality: 80 }).toBuffer();
  let quality = 70;
  while (out.length > targetMax && quality >= 40) {
    out = await sharp(buffer)
      .webp({ quality })
      .toBuffer()
      .catch(() => out);
    quality -= 10;
  }

  if (out.length > targetMax) {
    let width =
      (
        await sharp(buffer)
          .metadata()
          .catch(() => ({}))
      ).width || null;
    let factor = 0.9;
    while (out.length > targetMax && factor > 0.3 && width) {
      out = await sharp(buffer)
        .resize(Math.round(width * factor))
        .webp({ quality: 60 })
        .toBuffer()
        .catch(() => out);
      factor -= 0.1;
    }
  }

  if (out.length > targetMax)
    throw new Error("Cannot compress image under 1.4MB");
  return out;
};

// Map location distribution
const mapLocations = (dist) =>
  (dist || [])
    .filter((ld) => ld.locationId)
    .map((ld) => ({ branch: ld.locationId, stock: Number(ld.stock) || 0 }));

// ---------- Route ----------

router.post("/", upload.any(), async (req, res) => {
  try {
    // Parse JSON fields
    const body = Object.fromEntries(
      Object.entries(req.body).map(([k, v]) => {
        try {
          return [k, JSON.parse(v)];
        } catch {
          return [k, v];
        }
      })
    );

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
      displayImage: null,
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

    // ---------- Handle variants ----------
    const handleVariantImages = async (variantImages, type) => {
      if (!variantImages?.length) return [];
      const uploaded = await Promise.all(
        variantImages.map(async (file) => {
          if (!file.mimetype.startsWith("image/"))
            throw new Error(`Only images allowed: ${file.originalname}`);
          if (file.size > 5 * 1024 * 1024)
            throw new Error(`File too large: ${file.originalname}`);
          const buf = await compressToWebP(file.buffer);
          const result = await uploadBufferToCloudinary(buf, "products");
          return {
            url: result.file?.url || result.file?.secure_url,
            publicId: result.file?.publicId || result.file?.public_id,
          };
        })
      );
      return uploaded;
    };

    // Map variants
    if (variantType === "none") {
      const none = variantData;
      productData.productVariant.nonVariant = {
        locationDistribution: mapLocations(none.locationDistribution),
        totalStock: mapLocations(none.locationDistribution).reduce(
          (sum, ld) => sum + ld.stock,
          0
        ),
        sold: Number(none.sold) || 0,
        images: [],
        purchasePricePerUnit: Number(none.purchasePricePerUnit) || 0,
        basePricePerUnit: Number(none.basePricePerUnit) || 0,
        salePricePerUnit: Number(none.salePricePerUnit) || 0,
      };
    } else if (variantType === "size") {
      productData.productVariant.sizeVariants = (variantData || []).map(
        (size) => ({
          sizeName: size.sizeName?.trim() || "",
          abbreviation: size.abbreviation?.trim() || "",
          images: [],
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
        })
      );
    } else if (variantType === "color") {
      productData.productVariant.colorVariants = (variantData || []).map(
        (color) => ({
          colorName: color.colorName?.trim() || "",
          images: [],
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
        })
      );
    }

    // ---------- Handle file uploads ----------
    if (req.files?.length) {
      const uploadedFiles = await handleVariantImages(req.files);

      uploadedFiles.forEach((file, i) => {
        const field = req.files[i].fieldname;
        if (!file?.url) return;
        const fileObj = { url: file.url, publicId: file.publicId };

        if (field === "displayImage") productData.displayImage = fileObj.url;
        else if (variantType === "none" && field.startsWith("noneVariant_"))
          productData.productVariant.nonVariant.images.push(fileObj);
        else if (variantType === "size") {
          const match = field.match(/^sizeVariant_(\d+)_image_/);
          if (match)
            productData.productVariant.sizeVariants[
              parseInt(match[1])
            ].images.push(fileObj);
        } else if (variantType === "color") {
          const match = field.match(/^colorVariant_(\d+)_image_/);
          if (match)
            productData.productVariant.colorVariants[
              parseInt(match[1])
            ].images.push(fileObj);
        }
      });
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
