const router = require("express").Router();
const NavbarModel = require("../../models/homeLayout/navbar.models");
const HeroModel = require("../../models/homeLayout/hero.models");
const CategoryModel = require("../../models/homeLayout/category.models");
const DisplayItemsModel = require("../../models/homeLayout/displayItems.models");

router.get("/navbar", async (req, res) => {
  try {
    const navbar = await NavbarModel.findOne();
    
    return res.status(200).json({
      success: true,
      data: navbar,
    });
  } catch (err) {
    console.error("❌ [Home Fetch] Error fetching navbar data:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

router.get("/hero", async (req, res) => {
  try {
    const hero = await HeroModel.findOne();
    
    return res.status(200).json({
      success: true,
      data: hero,
    });
  } catch (err) {
    console.error("❌ [Home Fetch] Error fetching hero data:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const categories = await CategoryModel.find();
    
    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("❌ [Home Fetch] Error fetching categories data:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

router.get("/display-items", async (req, res) => {
  try {
    const displayItems = await DisplayItemsModel.findOne().populate([
      "nonFeatured.firstTwoRows.row1Products",
      "nonFeatured.firstTwoRows.row2Products",
      "nonFeatured.leftImageRightProducts.products",
      "nonFeatured.rightImageLeftProducts.products",
      "nonFeatured.extraFeaturedList.product",
    ]);
    
    return res.status(200).json({
      success: true,
      data: displayItems,
    });
  } catch (err) {
    console.error("❌ [Home Fetch] Error fetching display items data:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const navbar = await NavbarModel.findOne();
    const hero = await HeroModel.findOne();
    const categories = await CategoryModel.find();
    const displayItems = await DisplayItemsModel.findOne().populate([
      "nonFeatured.firstTwoRows.row1Products",
      "nonFeatured.firstTwoRows.row2Products",
      "nonFeatured.leftImageRightProducts.products",
      "nonFeatured.rightImageLeftProducts.products",
      "nonFeatured.extraFeaturedList.product",
    ]);

    return res.status(200).json({
      success: true,
      data: {
        navbar,
        hero,
        categories,
        displayItems,
      },
    });
  } catch (err) {
    console.error("❌ [Home Fetch] Error fetching home layout data:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

module.exports = router;