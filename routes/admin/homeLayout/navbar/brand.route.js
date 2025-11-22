const router = require("express").Router();
const { updateBrand  } = require("@/controllers/admin/homeLayout/navbar.controllers");
const { getNavbar } = require("@/controllers/admin/homeLayout/navbar.controllers");

router.get("/", getNavbar);
router.post("/", updateBrand);

module.exports = router;
