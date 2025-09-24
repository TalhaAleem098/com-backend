const router = require("express").Router();
const BrandModel = require("@/models/brand.models");
const CategoryModel = require("@/models/category.models");

router.post("/brand", async (req, res) => {
  try {
    const { name, description } = req.body;
    const existingBrand = await BrandModel.findOne({
      name: name.trim().toLowerCase(),
    });
    if (existingBrand) {
      return res.status(400).json({ message: "Brand already exists" });
    }
    const newBrand = new BrandModel({
      name: name.trim().toLowerCase(),
      description,
    });
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
    const existingCategory = await CategoryModel.findOne({
      name: name.trim().toLowerCase(),
    });
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }
    const newCategory = new CategoryModel({
      name: name.trim().toLowerCase(),
      description,
    });
    await newCategory.save();
    res.status(201).json({
      message: "Category added successfully",
      category: newCategory,
    });
  } catch (err) {
    console.log("Error in adding category", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/category/sub", async (req, res) => {
  try {
    const { categoryId, categoryName, subCategory } = req.body;

    if (!subCategory) {
      return res.status(400).json({ message: "SubCategory name is required" });
    }

    const normalizedSub = subCategory.trim().toLowerCase();
    const category = await CategoryModel.findOne(
      categoryId
        ? { _id: categoryId }
        : { name: categoryName.trim().toLowerCase() }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.subCategories.includes(normalizedSub)) {
      return res
        .status(400)
        .json({ message: "SubCategory already exists in this category" });
    }

    category.subCategories.push(normalizedSub);
    await category.save();

    res.status(201).json({
      message: "SubCategory added successfully",
      category,
    });
  } catch (err) {
    console.log("Error in adding subCategory", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
