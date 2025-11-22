const router = require("express").Router();
const { getNavbar } = require("@/controllers/admin/homeLayout/navbar.controllers");

router.get("/", getNavbar);

router.use("/brand", require("./navbar/brand.route"));

module.exports = router;
