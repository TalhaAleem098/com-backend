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
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
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
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
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
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
});

router.get("/display-items", async (req, res) => {
  try {
    const displayItems = await DisplayItemsModel.findOne();
    console.log(JSON.stringify(displayItems));
    return res.status(200).json({
      success: true,
      data: displayItems,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const navbar = await NavbarModel.findOne();
    const hero = await HeroModel.findOne();
    const categories = await CategoryModel.find();
    const displayItems = await DisplayItemsModel.findOne();

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
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
});

module.exports = router;