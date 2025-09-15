const router = require("express").Router();
const BrandModel = require("@/models/brand.models");
const CategoryModel = require("@/models/category.models");

router.get("/", async (req, res) => {
  try {
    const { type } = req.query;

    let brands = [];
    let categories = [];

    if (!type || type === "brand") {
      brands = await BrandModel.find({});
    }

    if (!type || type === "category") {
      categories = await CategoryModel.find({});
    }

    const result = {};
    if (brands.length) result.brands = brands;
    if (categories.length) result.categories = categories;

    res.status(200).json(result);
  } catch (err) {
    console.log("Error fetching data", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
