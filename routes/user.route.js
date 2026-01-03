const router = require("express").Router();

router.use("/home", require("./user/home"))
router.use("/product", require("./user/product"))

module.exports = router;
