const router = require("express").Router();
const mongoose = require("mongoose");
const Product = require("../../models/product.models");


router.get("/multiple", async (req, res) => {
  console.log("Multiple route hit");
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
      .populate("category", "name _id image")
      .populate("brand", "name _id logo")
      .select(
        "-createdAt -updatedAt -__v -isDeleted -deletedAt -linkedProducts -commentSection"
      )
      .lean();

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (err) {
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
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
});

module.exports = router;