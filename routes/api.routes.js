const router = require('express').Router();

router.use("/admin", require("./admin.routes"));
router.use("/employee", require("./employee.routes"));
router.use("/user", require("./user.route"));
router.use("/chat", require("@/modules/chat/chat.routes"));
router.use("/notifications", require("@/modules/notification/notification.routes"));


module.exports = router;