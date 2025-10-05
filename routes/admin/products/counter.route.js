const router = require("express").Router();
const ProductModel = require("../../../models/product.models");

router.get("/", async (req, res) => {
  try {
    const count = await ProductModel.countDocuments();
    const formattedCount = String(count).padStart(5, "0");
    res.json({ totalProducts: formattedCount });
  } catch (err) {
    console.error("Error fetching product count:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;