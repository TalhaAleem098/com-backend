const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "my secret";

const generateToken = (payload, arg2, arg3) => {
  let rememberMe = false;
  let expTime = arg2;
  if (typeof arg2 === 'boolean') {
    rememberMe = arg2;
    expTime = arg3;
  }

  if (!expTime) expTime = 24 * 60 * 60 * 1000;

  const options = {};
  if (typeof expTime === 'number') {
    options.expiresIn = Math.floor(expTime / 1000);
  } else if (typeof expTime === 'string') {
    options.expiresIn = expTime;
  }

  const tokenPayload = {
    id: payload.id || payload._id,
    role: payload.role,
    rememberMe,
    name: payload.name || payload.displayName || payload.firstName || payload.username,
  };

  return jwt.sign(tokenPayload, secret, options);
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, secret);
    return { valid: true, decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

module.exports = { generateToken, verifyToken };
