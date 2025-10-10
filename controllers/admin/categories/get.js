const BrandModel = require("../../../models/brand.models");
const CategoryModel = require("../../../models/category.models");

/* -------------------- TYPE NORMALIZATION -------------------- */
function normalizeType(type) {
  if (!type || typeof type !== "string") return "all";

  const t = type.trim().toLowerCase();
  const synonyms = {
    brand: ["brand", "brands", "b", "br"],
    category: ["category", "categories", "cat", "cats", "c"],
  };

  for (const [key, values] of Object.entries(synonyms)) {
    if (values.includes(t) || t.includes(key)) return key;
  }

  return "all";
}

/* -------------------- FETCH HELPERS -------------------- */
async function fetchBrands() {
  return (
    (await BrandModel.find(
      {},
      {
        _id: 1,
        name: 1,
        itemCount: 1,
        createdAt: 1,
        updatedAt: 1,
        description: 1,
      }
    )
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1 })
      .lean()) || []
  );
}

async function fetchCategories() {
  return (
    (await CategoryModel.find(
      {},
      { _id: 1, name: 1, itemCount: 1, createdAt: 1, updatedAt: 1, description: 1 }
    )
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1 })
      .lean()) || []
  );
}

async function fetchByType(type) {
  const which = normalizeType(type);
  const result = {};

  switch (which) {
    case "brand":
      result.brands = await fetchBrands();
      break;

    case "category":
      result.categories = await fetchCategories();
      break;

    default: // "all"
      const [brands, categories] = await Promise.all([
        fetchBrands(),
        fetchCategories(),
      ]);
      result.brands = brands;
      result.categories = categories;
      break;
  }

  return result;
}

module.exports = {
  fetchBrands,
  fetchCategories,
  fetchByType,
};
