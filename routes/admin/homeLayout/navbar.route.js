const router = require("express").Router();
const { getNavbar } = require("@/controllers/admin/homeLayout/navbar.controllers");

router.get("/", getNavbar);

router.use("/brand", require("./navbar/brand.route"));
router.use("/links", require("./navbar/links.route"));
router.use("/icons", require("./navbar/icons.route"));
router.use("/ribon", require("./navbar/ribon.route"));

module.exports = router;
