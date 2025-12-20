const router = require("express").Router();

router.use("/home", require("./user/home"))

module.exports = router;
