const Branches = require("@/models/branches.models");
const router = require("express").Router();

const getByPath = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

router.post("/", async (req, res) => {
  try {
    const { name, type, address, phone, email, isActive, isDeliveryAvailable, openingHours } = req.body || {};

    const required = [
      "name",
      "type",
      "address.streetAddress",
      "address.city",
      "address.state",
      "address.country",
      "phone.primary",
    ];

    for (let i = 0; i < required.length; i++) {
      const field = required[i];
      const val = getByPath(req.body, field);
      if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        return res.status(400).json({ field, message: "This field is required" });
      }
    }

    // duplicate check: same name + same address (except postalCode)
    const existing = await Branches.findOne({
      name: name.trim(),
      "address.streetAddress": address.streetAddress.trim(),
      "address.city": address.city.trim(),
      "address.state": address.state.trim(),
      "address.country": address.country.trim(),
    }).lean();

    if (existing) {
      return res.status(409).json({ message: "Branch with same name and address already exists" });
    }

    const branchData = {
      name,
      type,
      address,
      phone,
      email: email || null,
      isActive: typeof isActive === "boolean" ? isActive : true,
      isDeliveryAvailable: typeof isDeliveryAvailable === "boolean" ? isDeliveryAvailable : false,
      openingHours: openingHours || {},
    };

    const branch = await Branches.create(branchData);
    return res.status(201).json(branch);
  } catch (err) {
    console.log("Error: ", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;