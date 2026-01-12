const Branches = require("@/models/branches.models");
const router = require("express").Router();
const { registerRoute } = require("@/utils/register.routes");

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

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({ message: "Branch id is required" });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
      return res.status(400).json({ message: "Invalid branch id" });
    }

    const existingBranch = await Branches.findById(id).lean();

    if (!existingBranch) {
      return res.status(404).json({ message: "Branch not found" });
    }

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

    const updateData = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ field: "name", message: "This field is required" });
      }
      updateData.name = name.trim();
    }

    if (type !== undefined) {
      if (typeof type !== "string" || !type.trim()) {
        return res.status(400).json({ field: "type", message: "This field is required" });
      }
      const validTypes = ["warehouse", "store", "office", "main", "sub-branch"];
      if (!validTypes.includes(type.trim())) {
        return res.status(400).json({ field: "type", message: "Invalid branch type" });
      }
      updateData.type = type.trim();
    }

    if (address !== undefined) {
      if (!address || typeof address !== "object") {
        return res.status(400).json({ field: "address", message: "Invalid address format" });
      }

      updateData.address = { ...existingBranch.address };

      if (address.streetAddress !== undefined) {
        if (typeof address.streetAddress !== "string" || !address.streetAddress.trim()) {
          return res.status(400).json({ field: "address.streetAddress", message: "This field is required" });
        }
        updateData.address.streetAddress = address.streetAddress.trim();
      }

      if (address.city !== undefined) {
        if (typeof address.city !== "string" || !address.city.trim()) {
          return res.status(400).json({ field: "address.city", message: "This field is required" });
        }
        updateData.address.city = address.city.trim();
      }

      if (address.state !== undefined) {
        if (typeof address.state !== "string" || !address.state.trim()) {
          return res.status(400).json({ field: "address.state", message: "This field is required" });
        }
        updateData.address.state = address.state.trim();
      }

      if (address.country !== undefined) {
        if (typeof address.country !== "string" || !address.country.trim()) {
          return res.status(400).json({ field: "address.country", message: "This field is required" });
        }
        updateData.address.country = address.country.trim();
      }

      if (address.postalCode !== undefined) {
        updateData.address.postalCode = address.postalCode && typeof address.postalCode === "string" ? address.postalCode.trim() : null;
      }
    }

    if (phone !== undefined) {
      if (!phone || typeof phone !== "object") {
        return res.status(400).json({ field: "phone", message: "Invalid phone format" });
      }

      updateData.phone = { ...existingBranch.phone };

      if (phone.primary !== undefined) {
        if (typeof phone.primary !== "string" || !phone.primary.trim()) {
          return res.status(400).json({ field: "phone.primary", message: "This field is required" });
        }
        updateData.phone.primary = phone.primary.trim();
      }

      if (phone.secondary !== undefined) {
        updateData.phone.secondary = phone.secondary && typeof phone.secondary === "string" ? phone.secondary.trim() : null;
      }
    }

    if (email !== undefined) {
      if (email && typeof email === "string") {
        const trimmedEmail = email.trim();
        if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          return res.status(400).json({ field: "email", message: "Invalid email format" });
        }
        updateData.email = trimmedEmail || null;
      } else {
        updateData.email = null;
      }
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ field: "isActive", message: "Invalid value" });
      }
      updateData.isActive = isActive;
    }

    if (isDeliveryAvailable !== undefined) {
      if (typeof isDeliveryAvailable !== "boolean") {
        return res.status(400).json({ field: "isDeliveryAvailable", message: "Invalid value" });
      }
      updateData.isDeliveryAvailable = isDeliveryAvailable;
    }

    if (openingHours !== undefined) {
      updateData.openingHours = normalizeOpeningHours(openingHours);
    }

    if (updateData.name || updateData.address) {
      const checkName = updateData.name || existingBranch.name;
      const checkAddress = updateData.address || existingBranch.address;

      const duplicate = await Branches.findOne({
        _id: { $ne: id },
        name: checkName,
        "address.streetAddress": checkAddress.streetAddress,
        "address.city": checkAddress.city,
        "address.state": checkAddress.state,
        "address.country": checkAddress.country,
      }).lean();

      if (duplicate) {
        return res.status(409).json({ message: "Branch with same name and address already exists" });
      }
    }

    const updatedBranch = await Branches.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json(updatedBranch);
  } catch (err) {
    console.log("Error updating branch:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

registerRoute("put", "/api/admin/branches/update/:id");

module.exports = router;