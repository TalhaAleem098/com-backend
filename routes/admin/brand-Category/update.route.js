const router = require("express").Router();
const BrandModel = require("@/models/brand.models");
const CategoryModel = require("@/models/category.models");
const ProductModel = require("@/models/product.models");
const { registerRoute } = require("@/utils/register.routes");

// Update brand
router.put("/brand/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description } = req.body;

    const brand = await BrandModel.findById(id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    const hasProducts = (brand.items || []).length > 0;

    if (name && typeof name === 'string') {
      const normalized = name.trim().toLowerCase();
      const existing = await BrandModel.findOne({ name: normalized, _id: { $ne: id } });
      if (existing) return res.status(400).json({ message: "Another brand with this name already exists" });
      if (!hasProducts) {
        brand.name = normalized;
      } else {
        if (brand.name !== normalized) {
          return res.status(400).json({ message: "Cannot change brand name while products are linked. Unlink products first." });
        }
      }
    }

    if (typeof description !== 'undefined') brand.description = description;

    await brand.save();
    res.json({ message: "Brand updated", brand });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/category/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, subCategories } = req.body;

    const category = await CategoryModel.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const hasProducts = (category.items || []).length > 0;

    if (name && typeof name === 'string') {
      const normalized = name.trim().toLowerCase();
      const existing = await CategoryModel.findOne({ name: normalized, _id: { $ne: id } });
      if (existing) return res.status(400).json({ message: "Another category with this name already exists" });
      if (!hasProducts) {
        category.name = normalized;
      } else {
        if (category.name !== normalized) {
          return res.status(400).json({ message: "Cannot change category name while products are linked. Unlink products first." });
        }
      }
    }

    if (typeof description !== 'undefined') category.description = description;

    if (Array.isArray(subCategories)) {
      const normalizedSubs = subCategories.map(s => String(s || '').trim().toLowerCase()).filter(Boolean);
      const unique = [...new Set(normalizedSubs)];
      if (unique.length !== normalizedSubs.length) {
        return res.status(400).json({ message: "Duplicate sub-categories are not allowed" });
      }
      category.subCategories = unique;
    }

    await category.save();
    res.json({ message: "Category updated", category });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

registerRoute("put", "/api/admin/brand-category/update/brand/:id");
registerRoute("put", "/api/admin/brand-category/update/category/:id");

module.exports = router;