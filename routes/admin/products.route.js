const router = require("express").Router();
const { authMiddleware } = require("@/middlewares/auth.middlewares");

router.use(authMiddleware);
router.use("/add", require("./products/add.route"));

module.exports = router;