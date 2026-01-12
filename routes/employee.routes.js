const router = require('express').Router();

router.use("/roles", require("./employees/roles.routes"));
router.use("/orders", require("./employees/orders.routes"));

module.exports = router;