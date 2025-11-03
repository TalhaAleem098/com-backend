const router = require("express").Router();
const { getAllProducts } = require("@/controllers/admin/products/get");

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const dataType = req.query.data === "partial" ? "partial" : "full";
    const searchTerm = req.query.q || req.query.search || req.query.query || null;
    const status = req.query.status || "active";
    
    if(status && !["active", "archived", "deleted"].includes(status)) {
      status = "active";
    }
    
    const filters = {};

    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === "true";
    }

    if (req.query.isPublic !== undefined) {
      filters.isPublic = req.query.isPublic === "true";
    }

    if (req.query.category) {
      filters.category = req.query.category;
    }

    if (req.query.brand) {
      filters.brand = req.query.brand;
    }

    const result = await getAllProducts(page, limit, filters, searchTerm, dataType, status);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
