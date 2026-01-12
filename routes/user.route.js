const router = require("express").Router();

router.use("/home", require("./user/home.route"))
router.use("/product", require("./user/product.route"))
router.use("/order", require("./user/order.route"))

module.exports = router;
