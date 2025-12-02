const router = require("express").Router();

router.use("/navbar", require("./homeLayout/navbar.route"));
router.use("/hero", require("./homeLayout/hero.route"));
router.use("/category", require("./homeLayout/category.route"));

module.exports = router;
