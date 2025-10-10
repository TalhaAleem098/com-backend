const router = require("express").Router();

router.use("/add", require("./brand-Category/add.route"));
router.use("/get", require("./brand-Category/get.route"));
router.use("/update", require("./brand-Category/update.route"));
router.use("/delete", require("./brand-Category/delete.route"));

module.exports = router;
