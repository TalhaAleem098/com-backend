const router = require("express").Router();

router.use("/add", require("./brand-Category/add.route"));
router.use("/get", require("./brand-Category/get.route"));

module.exports = router;
