const router = require("express").Router()

router.use("/auth", require("./admin/auth.route.js"))
router.use("/products", require("./admin/products.route"))
router.use("/brand-category", require("./admin/brandCategory.route"))

module.exports = router;