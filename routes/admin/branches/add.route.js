const Branches = require("@/models/branches.models");
const router = require("express").Router();

const getByPath = (obj, path) =>
  path
    .split(".")
    .reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
      obj
    );

const normalizeOpeningHours = (openingHours) => {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const cleanTime = (v) => {
    if (v === undefined || v === null) return null;
    if (typeof v !== "string") return null;
    const t = v.trim();
    if (!t) return null;
    return t;
  };

  const src = openingHours && typeof openingHours === "object" ? openingHours : {};
  const result = {};

  for (const day of days) {
    const d = src[day] && typeof src[day] === "object" ? src[day] : {};

    result[day] = {
      isHoliday: !!d.isHoliday,
      open: cleanTime(d.open),
      close: cleanTime(d.close),
      break: {
        start: cleanTime(d.break && d.break.start),
        end: cleanTime(d.break && d.break.end),
      },
    };
  }

  return result;
};

router.post("/", async (req, res) => {
  try {
    const {
      name,
      type,
      address,
      phone,
      email,
      isActive,
      isDeliveryAvailable,
      openingHours,
    } = req.body || {};

    const required = [
      "name",
      "type",
      "address.streetAddress",
      "address.city",
      "address.state",
      "address.country",
      "phone.primary",
    ];

    for (const field of required) {
      const val = getByPath(req.body, field);
      if (
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "")
      )
        return res
          .status(400)
          .json({ field, message: "This field is required" });
    }

    const existing = await Branches.findOne({
      name: name.trim(),
      "address.streetAddress": address.streetAddress.trim(),
      "address.city": address.city.trim(),
      "address.state": address.state.trim(),
      "address.country": address.country.trim(),
    }).lean();

    if (existing)
      return res
        .status(409)
        .json({ message: "Branch with same name and address already exists" });

    const branchData = {
      name: name.trim(),
      type: type && typeof type === "string" ? type.trim() : "main",
      address,
      phone,
      email: email?.trim() || null,
      isActive: typeof isActive === "boolean" ? isActive : true,
      isDeliveryAvailable:
        typeof isDeliveryAvailable === "boolean" ? isDeliveryAvailable : false,
      openingHours: normalizeOpeningHours(openingHours),
    };

    const branch = await Branches.create(branchData);

    return res.status(201).json(branch);
  } catch (err) {
    console.log("Error creating branch:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;