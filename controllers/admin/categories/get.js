const BrandModel = require("../../../models/brand.models");
const CategoryModel = require("../../../models/category.models");

function normalizeType(type) {
  if (!type || typeof type !== "string") return "both";
  const t = type.trim().toLowerCase();
  const brandSyn = new Set(["brand", "brands", "b", "br"]);
  const catSyn = new Set(["category", "categories", "cat", "cats", "c"]);
  if (brandSyn.has(t)) return "brand";
  if (catSyn.has(t)) return "category";
  if (t.includes("brand")) return "brand";
  if (t.includes("cat")) return "category";
  return "both";
}

async function fetchBrands() {
  const brands = await BrandModel.find({}).lean();
  return brands || [];
}

async function fetchCategories() {
  const categories = await CategoryModel.find({}).lean();
  return categories || [];
}

async function fetchByType(type) {
  const which = normalizeType(type);
  const result = {};
  if (which === "brand") {
    result.brands = await fetchBrands();
  } else if (which === "category") {
    result.categories = await fetchCategories();
  } else {
    const [brands, categories] = await Promise.all([
      fetchBrands(),
      fetchCategories(),
    ]);
    if (brands && brands.length) result.brands = brands;
    if (categories && categories.length) result.categories = categories;
  }
  return result;
}

module.exports = { fetchBrands, fetchCategories, fetchByType };
