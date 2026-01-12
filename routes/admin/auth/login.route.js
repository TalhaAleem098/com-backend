const router = require("express").Router();
const { loginAdmin, loginVerify, resendOtp, refreshToken } = require("@controllers/admin/login.controllers")
const { adminLoginLimit } = require("@/utils/rateLimits");

router.post("/", adminLoginLimit, loginAdmin)
router.post("/verify", loginVerify)
router.post("/resend", resendOtp)
router.post("/refresh", refreshToken)

module.exports = router;