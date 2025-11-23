const router = require("express").Router();
const { getBrand, updateBrand } = require("@/controllers/admin/homeLayout/navbar.controllers");

router.get("/", getBrand);
router.post("/", updateBrand);

module.exports = router;
