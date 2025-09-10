const router = require('express').Router();

router.use("/admin", require("./admin.routes"));


module.exports = router;