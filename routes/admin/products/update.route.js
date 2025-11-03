const express = require("express");
const router = express.Router();
const {
  moveImageFromTemp,
  deleteFromCloudinary,
} = require("@/utils/cloudinary");
const Product = require("@/models/product.models");

/**
 * Move temp image to permanent folder
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
 * Process image array - move from temp to permanent, keep existing ones
 */
const processImagesForUpdate = async (images, existingImages = []) => {
  if (!Array.isArray(images) || images.length === 0) return [];
  
  const processedImages = await Promise.all(
    images.map(async (img) => {
      try {
        // If it's a temp image, move it
        if (img.publicId && img.publicId.startsWith("temp/")) {
          return await moveImageToPermanent(img);
        }
        // Otherwise, keep the existing image
        return img;
      } catch (err) {
        return null;
      }
    })
  );

  return processedImages.filter(Boolean);
};

/**
 * Find images to delete (removed from product)
 */
const findImagesToDelete = (oldImages, newImages) => {
  const newPublicIds = new Set(newImages.map(img => img.publicId).filter(Boolean));
  const toDelete = [];
  
  oldImages.forEach(img => {
    if (img.publicId && !newPublicIds.has(img.publicId)) {
      toDelete.push(img.publicId);
    }
  });
  
  return toDelete;
};

// Map location distribution
const mapLocations = (dist) =>
  (dist || [])
    .filter((ld) => ld.locationId)
    .map((ld) => ({ branch: ld.locationId, stock: Number(ld.stock) || 0 }));

router.patch("/:id", async (req, res) => {
  const movedImages = []; // Track moved images for rollback
  const imagesToDelete = []; // Track images to delete
  
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

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

    // Handle display image
    let displayImageUrl = existingProduct.displayImage;
    if (basic.displayImage) {
      if (basic.displayImage.publicId && basic.displayImage.publicId.startsWith("temp/")) {
        // New image uploaded, move it
        const movedDisplayImage = await moveImageToPermanent(basic.displayImage);
        if (movedDisplayImage) {
          displayImageUrl = movedDisplayImage.url;
          movedImages.push(movedDisplayImage.publicId);
          
          // Delete old display image if it exists
          if (existingProduct.displayImage && existingProduct.displayImage !== displayImageUrl) {
            const oldPublicId = existingProduct.displayImage.split('/').slice(-1)[0].split('.')[0];
            if (oldPublicId) {
              imagesToDelete.push(`products/${oldPublicId}`);
            }
          }
        }
      } else if (basic.displayImage.url) {
        // Existing image, keep it
        displayImageUrl = basic.displayImage.url;
      }
    }

    // Update product data
    const updateData = {
      name: basic.name?.trim() || existingProduct.name,
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
      isFeatured: basic.isFeatured ?? false,
      displayImage: displayImageUrl,
      linkedProducts: Array.isArray(body.linkedProducts)
        ? body.linkedProducts
            .filter((lp) => lp && lp.productId)
            .map((lp) => ({
              productId: lp.productId,
              name: lp.name || null,
              image: lp.image || null,
            }))
        : [],
      "productVariant.variantType": variantType,
      "productVariant.defaultCurrency": basic.defaultCurrency || { symbol: "Rs" },
    };

    if (Array.isArray(body.measurements) && body.measurements.length > 0) {
      const validMeasurements = body.measurements.filter(
        (m) => m && (m.rowName || (m.columns && m.columns.length > 0))
      );
      updateData["productVariant.measures"] = validMeasurements;
      updateData["productVariant.measureUnit"] = body.measureUnit || "";
    } else {
      updateData["productVariant.measures"] = [];
      updateData["productVariant.measureUnit"] = "";
    }

    // Handle variants and images
    if (variantType === "none") {
      const oldImages = existingProduct.productVariant?.nonVariant?.images || [];
      const newImages = await processImagesForUpdate(variantData.images || [], oldImages);
      
      // Track moved images
      newImages.forEach(img => {
        if (img.publicId && img.publicId.startsWith("products/")) {
          const wasTemp = (variantData.images || []).find(
            vi => vi.publicId === img.publicId.replace("products/", "temp/products/")
          );
          if (wasTemp) {
            movedImages.push(img.publicId);
          }
        }
      });

      // Find images to delete
      const toDelete = findImagesToDelete(oldImages, newImages);
      imagesToDelete.push(...toDelete);

      updateData["productVariant.nonVariant"] = {
        locationDistribution: mapLocations(variantData.locationDistribution),
        totalStock: mapLocations(variantData.locationDistribution).reduce(
          (sum, ld) => sum + ld.stock,
          0
        ),
        sold: existingProduct.productVariant?.nonVariant?.sold || 0,
        images: newImages,
        purchasePricePerUnit: Number(variantData.purchasePricePerUnit) || 0,
        basePricePerUnit: Number(variantData.basePricePerUnit) || 0,
        salePricePerUnit: Number(variantData.salePricePerUnit) || 0,
      };
    } else if (variantType === "size") {
      updateData["productVariant.sizeVariants"] = await Promise.all(
        (variantData || []).map(async (size, idx) => {
          const oldSize = existingProduct.productVariant?.sizeVariants?.[idx];
          const oldImages = oldSize?.images || [];
          const newImages = await processImagesForUpdate(size.images || [], oldImages);

          // Track moved and deleted images
          newImages.forEach(img => {
            if (img.publicId && img.publicId.startsWith("products/")) {
              const wasTemp = (size.images || []).find(
                vi => vi.publicId === img.publicId.replace("products/", "temp/products/")
              );
              if (wasTemp) movedImages.push(img.publicId);
            }
          });
          
          const toDelete = findImagesToDelete(oldImages, newImages);
          imagesToDelete.push(...toDelete);

          return {
            sizeName: size.sizeName?.trim() || "",
            abbreviation: size.abbreviation?.trim() || "",
            images: newImages,
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
      updateData["productVariant.colorVariants"] = await Promise.all(
        (variantData || []).map(async (color, idx) => {
          const oldColor = existingProduct.productVariant?.colorVariants?.[idx];
          const oldImages = oldColor?.images || [];
          const newImages = await processImagesForUpdate(color.images || [], oldImages);

          // Track moved and deleted images
          newImages.forEach(img => {
            if (img.publicId && img.publicId.startsWith("products/")) {
              const wasTemp = (color.images || []).find(
                vi => vi.publicId === img.publicId.replace("products/", "temp/products/")
              );
              if (wasTemp) movedImages.push(img.publicId);
            }
          });
          
          const toDelete = findImagesToDelete(oldImages, newImages);
          imagesToDelete.push(...toDelete);

          return {
            colorName: color.colorName?.trim() || "",
            images: newImages,
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

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (updatedProduct.productVariant?.recalculateTotals) {
      updatedProduct.productVariant.recalculateTotals();
      await updatedProduct.save();
    }

    // Delete old images that were removed
    if (imagesToDelete.length > 0) {
      await Promise.all(
        imagesToDelete.map(publicId => deleteFromCloudinary(publicId))
      );
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: { id: updatedProduct._id, name: updatedProduct.name, sku: updatedProduct.sku },
    });
  } catch (err) {
    if (movedImages.length > 0) {
      try {
        await Promise.all(
          movedImages.map(publicId => deleteFromCloudinary(publicId))
        );
      } catch (rollbackErr) {
        
      }
    }

    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;
