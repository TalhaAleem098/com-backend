const crypto = require("crypto");

const ALGO = "aes-256-cbc";

const getKey = () => {
  if (!process.env.AES_KEY) throw new Error("AES_KEY not set in env");
  return crypto.scryptSync(process.env.AES_KEY, "salt", 32);
};

const encrypt = (text) => {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (encryptedText) => {
  const key = getKey();
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

module.exports = { encrypt, decrypt };
