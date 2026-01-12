const router = require('express').Router();

router.use("/admin", require("./admin.routes"));
router.use("/employee", require("./employee.routes"));
router.use("/user", require("./user.route"));


module.exports = router;