const router = require("express").Router()

router.use("/add", require("./branches/add.route"))
router.use("/get", require("./branches/get.route"))
router.use("/update", require("./branches/update.route"))

module.exports = router;