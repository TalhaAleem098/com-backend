const router = require("express").Router();
const { getAllProducts } = require("@/controllers/admin/products/get");
const Product = require("@/models/product.models");

// Helper function to calculate total stock for a product
function calculateProductStock(product) {
  let totalStock = 0;
  
  if (!product.productVariant) return 0;

  if (product.productVariant.variantType === "none") {
    const nv = product.productVariant.nonVariant;
    if (nv?.locationDistribution && Array.isArray(nv.locationDistribution)) {
      nv.locationDistribution.forEach(loc => {
        totalStock += loc.stock || 0;
      });
    }
  } else if (product.productVariant.variantType === "size") {
    product.productVariant.sizeVariants?.forEach(size => {
      if (size.colors && Array.isArray(size.colors)) {
        size.colors.forEach(color => {
          if (color.locationDistribution && Array.isArray(color.locationDistribution)) {
            color.locationDistribution.forEach(loc => {
              totalStock += loc.stock || 0;
            });
          }
        });
      }
    });
  } else if (product.productVariant.variantType === "color") {
    product.productVariant.colorVariants?.forEach(color => {
      if (color.sizes && Array.isArray(color.sizes)) {
        color.sizes.forEach(size => {
          if (size.locationDistribution && Array.isArray(size.locationDistribution)) {
            size.locationDistribution.forEach(loc => {
              totalStock += loc.stock || 0;
            });
          }
        });
      }
    });
  }

  return totalStock;
}

// Helper function to determine stock status
function getProductStockStatus(totalStock, minStockToMaintain = 0) {
  if (totalStock === 0) return "outofstock";
  if (totalStock <= minStockToMaintain) return "lowstock";
  return "instock";
}

// Stats endpoint for dashboard boxes
router.get("/stats", async (req, res) => {
  try {
    // Get total count of all products (excluding permanently deleted)
    const totalProducts = await Product.countDocuments({});

    // Get active products count
    const activeProducts = await Product.countDocuments({ status: "active" });

    // Get archived products count
    const archivedProducts = await Product.countDocuments({ status: "archived" });

    // Get deleted products count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const deletedProducts = await Product.countDocuments({ 
      status: "deleted", 
      deletedAt: { $gte: thirtyDaysAgo } 
    });

    // Get all active products to calculate stock levels
    const activeProductsWithStock = await Product.find({ status: "active" })
      .select("productVariant minStockToMaintain")
      .lean();

    // Calculate stock statistics for active products only
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    activeProductsWithStock.forEach(product => {
      const totalStock = calculateProductStock(product);
      const stockStatus = getProductStockStatus(totalStock, product.minStockToMaintain);
      
      switch (stockStatus) {
        case "instock":
          inStockCount++;
          break;
        case "lowstock":
          lowStockCount++;
          break;
        case "outofstock":
          outOfStockCount++;
          break;
      }
    });

    const stats = {
      totalProducts: {
        label: "Total Products",
        value: totalProducts,
        description: "All products in system",
        color: "#3B82F6",
        icon: "package"
      },
      activeProducts: {
        label: "Active Products",
        value: activeProducts,
        description: "Currently active products",
        color: "#10B981",
        icon: "check-circle"
      },
      lowStock: {
        label: "Low Stock",
        value: lowStockCount,
        description: "Active products with low inventory",
        color: "#F59E0B",
        icon: "exclamation-triangle"
      },
      outOfStock: {
        label: "Out of Stock", 
        value: outOfStockCount,
        description: "Active products with zero stock",
        color: "#EF4444",
        icon: "x-circle"
      },
      archivedProducts: {
        label: "Archived",
        value: archivedProducts,
        description: "Archived products",
        color: "#6B7280",
        icon: "archive"
      }
    };

    res.status(200).json({
      success: true,
      stats,
      summary: {
        total: totalProducts,
        active: activeProducts,
        archived: archivedProducts,
        deleted: deletedProducts,
        stockBreakdown: {
          inStock: inStockCount,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount
        }
      }
    });
  } catch (error) {
    console.error("Error fetching product stats:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch product statistics" 
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const dataType = req.query.data === "partial" ? "partial" : "full";
    const searchTerm = req.query.q || req.query.search || req.query.query || null;
    let status = req.query.status || "active";
    const stockFilter = req.query.stockFilter || null;

    if (status && !["active", "archived", "deleted"].includes(status)) {
      status = "active";
    }

    if (stockFilter && !["instock", "lowstock", "outofstock"].includes(stockFilter)) {
      return res.status(400).json({ message: "Invalid stock filter" });
    }

    if (stockFilter && status !== "active") {
      return res.status(400).json({ message: "Stock filters only apply to active products" });
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

    const result = await getAllProducts(page, limit, filters, searchTerm, dataType, status, stockFilter);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});


module.exports = router;