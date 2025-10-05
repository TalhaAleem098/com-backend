const router = require("express").Router();
const BranchModel = require("../../../models/branches.models");

router.put("/:id", async (req, res) => {
  try {
    let { id } = req.params || null;
    if (!id || !id.trim()) {
      id = req.query.id || null;
      if (!id || !id.trim())
        return res.status(400).json({ message: "Branch id is required" });
    }
    if (!/^[0-9a-fA-F]{24}$/.test(String(id)))
      return res.status(400).json({ message: "Invalid branch id" });
    id = id.trim();

    const branch = await BranchModel.findById(id).catch(() => null);
    if (!branch) return res.status(404).json({ message: "Branch not found" });

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

    if (name && typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (type && typeof type === "string" && type.trim()) {
      updateData.type = type.trim();
    }
    if (address && typeof address === "object") {
      const addr = {};
      if (
        address.streetAddress &&
        typeof address.streetAddress === "string" &&
        address.streetAddress.trim()
      ) {
        addr.streetAddress = address.streetAddress.trim();
      }
      if (
        address.city &&
        typeof address.city === "string" &&
        address.city.trim()
      ) {
        addr.city = address.city.trim();
      }
      if (
        address.state &&
        typeof address.state === "string" &&
        address.state.trim()
      ) {
        addr.state = address.state.trim();
      }
      if (
        address.country &&
        typeof address.country === "string" &&
        address.country.trim()
      ) {
        addr.country = address.country.trim();
      }
      if (
        address.postalCode &&
        typeof address.postalCode === "string" &&
        address.postalCode.trim()
      ) {
        addr.postalCode = address.postalCode.trim();
      }
      if (Object.keys(addr).length) {
        updateData.address = { ...(branch.address || {}), ...addr };
      }
    }
    if (phone && typeof phone === "object") {
      const ph = {};
      if (
        phone.primary &&
        typeof phone.primary === "string" &&
        phone.primary.trim()
      ) {
        ph.primary = phone.primary.trim();
      }
      if (
        phone.secondary &&
        typeof phone.secondary === "string" &&
        phone.secondary.trim()
      ) {
        ph.secondary = phone.secondary.trim();
      }
      if (Object.keys(ph).length) {
        updateData.phone = { ...(branch.phone || {}), ...ph };
      }
    }
    if (email && typeof email === "string") {
      updateData.email = email.trim() || null;
    }
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }
    if (typeof isDeliveryAvailable === "boolean") {
      updateData.isDeliveryAvailable = isDeliveryAvailable;
    }
    if (openingHours && typeof openingHours === "object") {
      const days = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const oh = {};
      days.forEach((d) => {
        if (openingHours[d] && typeof openingHours[d] === "object") {
          const src = openingHours[d];
          const dayData = {};
          if (typeof src.isHoliday === "boolean") {
            dayData.isHoliday = src.isHoliday;
          }
          if (src.open && typeof src.open === "string" && src.open.trim()) {
            dayData.open = src.open.trim();
          }
          if (src.close && typeof src.close === "string" && src.close.trim()) {
            dayData.close = src.close.trim();
          }
          if (src.break && typeof src.break === "object") {
            const brk = {};
            if (
              src.break.start &&
              typeof src.break.start === "string" &&
              src.break.start.trim()
            ) {
              brk.start = src.break.start.trim();
            }
            if (
              src.break.end &&
              typeof src.break.end === "string" &&
              src.break.end.trim()
            ) {
              brk.end = src.break.end.trim();
            }
            if (Object.keys(brk).length) {
              dayData.break = {
                ...((branch.openingHours &&
                  branch.openingHours[d] &&
                  branch.openingHours[d].break) ||
                  {}),
                ...brk,
              };
            }
          }
          if (Object.keys(dayData).length) {
            oh[d] = {
              ...((branch.openingHours && branch.openingHours[d]) || {}),
              ...dayData,
            };
          }
        }
      });
      if (Object.keys(oh).length) {
        updateData.openingHours = { ...(branch.openingHours || {}), ...oh };
      }
    }

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updated = await BranchModel.findByIdAndUpdate(id, updateData, {
      new: true,
    }).catch(() => null);
    if (!updated)
      return res.status(500).json({ message: "Failed to update branch" });

    return res.json({
      message: "Branch updated successfully",
      branch: updated,
    });
  } catch (err) {
    console.error("Error updating branch:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;