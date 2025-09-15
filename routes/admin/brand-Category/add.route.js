const router = require("express").Router();
const BrandModel = require("@/models/brand.models");
const CategoryModel = require("@/models/category.models");

router.post("/brand", async (req, res) => {
  try {
    const { name, description } = req.body;
    const existingBrand = await BrandModel.findOne({ name });
    if (existingBrand) {
      return res.status(400).json({ message: "Brand already exists" });
    }
    const newBrand = new BrandModel({ name, description });
    await newBrand.save();
    res
      .status(201)
      .json({ message: "Brand added successfully", brand: newBrand });
  } catch (err) {
    console.log("Error in adding brand", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/category", async (req, res) => {
  try {
    const { name, description } = req.body;
    const existingCategory = await CategoryModel.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }
    const newCategory = new CategoryModel({ name, description });
    await newCategory.save();
    res
      .status(201)
      .json({ message: "Category added successfully", category: newCategory });
  } catch (err) {
    console.log("Error in adding category", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
