const router = require("express").Router();

console.log("User router loaded");

router.use("/home", require("./user/home.route"))
router.use("/product", require("./user/product.route"))

module.exports = router;
