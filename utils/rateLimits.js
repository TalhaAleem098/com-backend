const rateLimit = require("express-rate-limit");

const adminLoginLimit = rateLimit({
  windowsMs: 1 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many clicks! Please try again later",
  },
});

const adminLimit = rateLimit({
  windowsMs: 1 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: "Too many clicks! Please try again later",
  },
});

module.exports = {
  adminLimit,
  adminLoginLimit,
};
