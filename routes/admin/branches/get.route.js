const router = require("express").Router();
const { getBranches } = require("../../../controllers/admin/branches/get");
const Settings = require("../../../models/settings.models");
const BranchModel = require("../../../models/branches.models");

const { getBranchById, listings } = require("../../../controllers/admin/branches/get");

router.get("/", async (req, res) => {
  try {
    let {
      page,
      perPage,
      limit,
      q,
      sortBy,
      order,
      isActive,
      isDeliveryAvailable,
      productId,
      minTotalStocks,
      maxTotalStocks,
    } = req.query;

    const query = {};

    if (page) query.page = Number(page);
    if (perPage || limit) query.perPage = Number(perPage || limit);

    if (q) query.q = q.trim();
    if (sortBy) query.sortBy = sortBy.trim();
    if (order) query.order = order.trim();

    if (!query.sortBy) query.sortBy = "name";
    if (!query.order) {
      const settings = await Settings.findOne()
        .lean()
        .catch(() => null);
      query.order = settings?.sortingOrder?.ascending ? "asc" : "desc";
    }

    if (isActive !== undefined)
      query.isActive = isActive === "true" || isActive === "1";
    if (isDeliveryAvailable !== undefined)
      query.isDeliveryAvailable =
        isDeliveryAvailable === "true" || isDeliveryAvailable === "1";

    if (productId) query.productId = productId.trim();
    if (minTotalStocks) query.minTotalStocks = Number(minTotalStocks);
    if (maxTotalStocks) query.maxTotalStocks = Number(maxTotalStocks);

    const result = await getBranches(query);
    res.json({ ...result, filters: query });
  } catch (err) {
    console.error("Error fetching branches:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/search", async (req, res) => {
  try {
    let { q } = req.query;
    if (!q || typeof q !== "string" || !q.trim()) {
      return res
        .status(400)
        .json({ message: "Query parameter 'q' is required" });
    }
    q = q.trim();

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const words = q
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);

    const fields = [
      "name",
      "address.city",
      "address.state",
      "address.country",
      "address.streetAddress",
      "email",
      "phone.primary",
      "phone.secondary",
    ];

    let filter = {};
    if (words.length === 1) {
      const re = new RegExp(escapeRegex(words[0]), "i");
      filter.$or = fields.map((f) => ({ [f]: re }));
    } else {
      filter.$and = words.map((word) => {
        const re = new RegExp(escapeRegex(word), "i");
        return { $or: fields.map((f) => ({ [f]: re })) };
      });
    }

    const projection = {
      name: 1,
      type: 1,
      email: 1,
      isActive: 1,
      isDeliveryAvailable: 1,
      "address.streetAddress": 1,
      "address.city": 1,
      "address.state": 1,
      "address.country": 1,
      "address.postalCode": 1,
      "phone.primary": 1,
    };

    const suggestions = await BranchModel.find(filter)
      .select(projection)
      .sort({ name: 1 })
      .limit(10)
      .lean();

    return res.json({ suggestions });
  } catch (err) {
    console.error("Error in search:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/one/:id", async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id || !id.trim())
      return res.status(400).json({ message: "Branch id is required" });
    if (!/^[0-9a-fA-F]{24}$/.test(String(id)))
      return res.status(400).json({ message: "Invalid branch id" });
    const branch = await getBranchById(id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    const addr = branch.address || {};
    const phone = branch.phone || {};
    const loc = branch.location || {};
    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const openingHours = {};
    days.forEach((d) => {
      const src = (branch.openingHours && branch.openingHours[d]) || {};
      openingHours[d] = {
        isHoliday: !!src.isHoliday,
        open: src.open || "",
        close: src.close || "",
        break: {
          start: (src.break && src.break.start) || "",
          end: (src.break && src.break.end) || "",
        },
      };
    });
    const result = {
      _id: branch._id,
      name: branch.name || "",
      address: {
        streetAddress: addr.streetAddress || "",
        city: addr.city || "",
        state: addr.state || "",
        country: addr.country || "",
        postalCode: addr.postalCode || "",
      },
      phone: {
        primary: phone.primary || "",
        secondary: phone.secondary || "",
      },
      email: branch.email || "",
      location: {
        type: loc.type || "Point",
        coordinates:
          Array.isArray(loc.coordinates) && loc.coordinates.length === 2
            ? loc.coordinates
            : [0, 0],
      },
      type: branch.type || "main",
      isActive: typeof branch.isActive === "boolean" ? branch.isActive : true,
      isDeliveryAvailable:
        typeof branch.isDeliveryAvailable === "boolean"
          ? branch.isDeliveryAvailable
          : false,
      openingHours,
      stock: branch.stock || { totalStocks: 0, productsCount: 0, products: [] },
      totalStockValue:
        typeof branch.totalStockValue === "number" ? branch.totalStockValue : 0,
      createdAt: branch.createdAt || null,
      updatedAt: branch.updatedAt || null,
    };

    return res.json({ branch: result });
  } catch (err) {
    console.error("Error fetching branch by id:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/listings", async(req,res)=>{
  try {
    const { page, perPage, limit, q, sortBy, order, type, isActive } = req.query || {}

    const query = { page, perPage, limit, q, sortBy, order, type, isActive }

    const result = await listings(query)

    return res.json({
      success: true,
      ...result
    })
  } catch (err) {
    console.error('Error in listings route:', err)
    return res.status(500).json({ message: 'Something went wrong' })
  }
})


module.exports = router;
