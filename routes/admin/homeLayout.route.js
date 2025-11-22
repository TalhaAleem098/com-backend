const router = require("express").Router();

router.use("/navbar", require("./homeLayout/navbar.route"));

module.exports = router;