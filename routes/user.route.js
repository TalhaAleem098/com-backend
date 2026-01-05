const router = require("express").Router();

console.log("User router loaded");

router.use("/home", require("./user/home"))
router.use("/product", require(__dirname + "/user/product"))

module.exports = router;
