const router = require("express").Router()

router.use("/auth", require("./admin/auth.route.js"))
router.use("/products", require("./admin/products.route"))

module.exports = router;