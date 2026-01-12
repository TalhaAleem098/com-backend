const router = require("express").Router();
const BrandModel = require("@/models/brand.models");
const CategoryModel = require("@/models/category.models");
const ProductModel = require("@/models/product.models");
const { registerRoute } = require("@/utils/register.routes");

// Delete brand
router.delete('/brand/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const brand = await BrandModel.findById(id).lean();
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    // Check itemCount and products referencing this brand
    const productsReferencing = await ProductModel.find({ brand: id, isDeleted: false }).limit(1).lean();
    const hasProducts = productsReferencing && productsReferencing.length > 0;

    if (brand.itemCount > 0 || hasProducts) {
      return res.status(400).json({ message: 'Cannot delete brand: products are linked to this brand' });
    }

    await BrandModel.deleteOne({ _id: id });
    res.json({ message: 'Brand deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete category
router.delete('/category/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const category = await CategoryModel.findById(id).lean();
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const productsReferencing = await ProductModel.find({ category: id, isDeleted: false }).limit(1).lean();
    const hasProducts = productsReferencing && productsReferencing.length > 0;

    if (category.itemCount > 0 || hasProducts) {
      return res.status(400).json({ message: 'Cannot delete category: products are linked to this category' });
    }

    await CategoryModel.deleteOne({ _id: id });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

registerRoute("delete", "/api/admin/brand-category/delete/brand/:id");
registerRoute("delete", "/api/admin/brand-category/delete/category/:id");

module.exports = router;
