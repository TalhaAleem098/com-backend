const router = require("express").Router();
const { getRibon, updateRibon } = require("@/controllers/admin/homeLayout/navbar.controllers");

router.get("/", getRibon);
router.post("/", updateRibon);

module.exports = router;
