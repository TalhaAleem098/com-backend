const router = require("express").Router()

router.use("/auth", require("./admin/auth.route.js"))

module.exports = router;