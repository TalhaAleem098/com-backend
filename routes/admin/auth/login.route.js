const router = require("express").Router();
const { loginAdmin, loginVerify, resendOtp } = require("@controllers/admin/login.controllers")

router.post("/", loginAdmin)
router.post("/verify", loginVerify)
router.post("/resend", resendOtp)


module.exports = router;