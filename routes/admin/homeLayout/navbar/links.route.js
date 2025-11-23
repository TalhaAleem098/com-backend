const router = require("express").Router();
const { getLinks, updateLinks } = require("@/controllers/admin/homeLayout/navbar.controllers");

router.get("/", getLinks);
router.post("/", updateLinks);

module.exports = router;
