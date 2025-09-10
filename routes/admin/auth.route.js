const router = require("express").Router();
const { loginAdmin } = require("@controllers/admin/login.controllers")

router.use("/create", require("./auth/create.route"))
router.use("/login", require("./auth/login.route"))

module.exports = router;