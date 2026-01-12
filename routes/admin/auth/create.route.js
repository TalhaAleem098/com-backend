const router = require("express").Router();
const Admin = require("@models/admin.models");
const { Validate } = require("@utils/validate");
const { generateHash } = require("@utils/sha");
const { encrypt } = require("@utils/aes");

router.post("/admin", async (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    try {
      const { name, displayName, twoFactorEnabled, email, password, notes } =
        req.body;
      const requiredFields = ["name", "email", "password"];
      const missing = Validate(requiredFields, req.body);
      if (missing)
        return res
          .status(400)
          .json({ success: false, message: `Missing field: ${missing}` });

      const hashedEmail = generateHash(email);
      const existing = await Admin.findOne({ "email.hashed": hashedEmail });
      if (existing)
        return res
          .status(409)
          .json({
            success: false,
            message: "Admin with this email already exists",
          });

      const encryptedEmail = await encrypt(email);
      const newAdmin = new Admin({
        name,
        email: { hashed: hashedEmail, encrypted: encryptedEmail },
        password,
        displayName,
        twoFactorEnabled: !!twoFactorEnabled,
        notes: notes || null,
      });
      await newAdmin.save();
      return res.status(201).json({
        success: true,
        message: "Admin created successfully",
      });
    } catch (err) {
      console.log("Error in create admin:", err);
      return res
        .status(500)
        .json({
          success: false,
          message: "Internal Server Error",
          error: err.message,
        });
    }
  } else next();
});

module.exports = router;
