const router = require("express").Router();
const Category = require("@/models/homeLayout/category.models");
const { authMiddleware } = require("@/middlewares/auth.middlewares");
const { moveImageFromTemp } = require("@/utils/cloudinary");

const moveImageToPermanent = async (imageObj, folder = "homeLayout/category") => {
  if (!imageObj || !imageObj.publicId) return null;
  if (!imageObj.publicId.startsWith("temp/")) return imageObj;
  
  const moveResult = await moveImageFromTemp(imageObj.publicId, folder);
  if (!moveResult.success) {
    throw new Error(`Failed to move image: ${moveResult.message}`);
  }
  return { url: moveResult.file.url, publicId: moveResult.file.publicId };
};

router.get("/", authMiddleware, async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: "Categories must be an array",
      });
    }

    for (const cat of categories) {
      if (!cat.name || cat.name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Each category must have a name with at least 2 characters",
        });
      }
    }

    const processedCategories = await Promise.all(
      categories.map(async (cat) => {
        const movedImage = await moveImageToPermanent(cat.image);
        return {
          name: cat.name.trim(),
          image: movedImage || { url: "", publicId: "" },
          onClickLink: cat.onClickLink || "",
        };
      })
    );

    await Category.deleteMany({});
    const savedCategories = await Category.insertMany(processedCategories);

    return res.status(200).json({
      success: true,
      message: "Categories updated successfully",
      data: savedCategories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
