const router = require("express").Router();
const mongoose = require("mongoose");
const Product = require("../../models/product.models");

// Get single product by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Fetch product with populated references
    const product = await Product.findOne({
      _id: id,
      isDeleted: false,
      status: "active",
      isPublic: true,
    })
      .populate("category", "name _id image")
      .populate("brand", "name _id logo")
      .select(
        "-createdAt -updatedAt -__v -isDeleted -deletedAt -linkedProducts -commentSection"
      )
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error("❌ [Product Fetch] Error fetching product:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

module.exports = router;
