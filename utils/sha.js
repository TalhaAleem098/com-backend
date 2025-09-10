const crypto = require("crypto");

const generateHash = (input, algo = "sha256") => {
  return crypto.createHash(algo).update(input).digest("hex");
};

module.exports = { generateHash };
