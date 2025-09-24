const router = require("express").Router()
const { authMiddleware } = require("@/middlewares/auth.middlewares");

router.use("/auth", require("./admin/auth.route.js"))

router.use(authMiddleware);
router.use("/products", require("./admin/products.route"))
router.use("/brand-category", require("./admin/brandCategory.route"))

module.exports = router;