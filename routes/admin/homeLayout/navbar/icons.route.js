const router = require("express").Router();
const { getIcons, updateIcons } = require("@/controllers/admin/homeLayout/navbar.controllers");

router.get("/", getIcons);
router.post("/", updateIcons);

module.exports = router;
