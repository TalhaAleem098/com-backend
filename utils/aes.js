const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const SALT = "aes-salt-2024";

const getKey = () => {
  if (!process.env.AES_KEY) {
    throw new Error("AES_KEY not set in environment variables");
  }
  
  if (process.env.AES_KEY.length !== 64) {
    throw new Error("AES_KEY must be 64 hex characters (256 bits)");
  }
  
  return Buffer.from(process.env.AES_KEY, 'hex');
};

const encrypt = (text) => {
  try {
    if (!text) {
      throw new Error("Text to encrypt cannot be empty");
    }
    
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

const decrypt = (encryptedText) => {
  try {
    if (!encryptedText) {
      throw new Error("Encrypted text cannot be empty");
    }
    
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted text format");
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

const generateKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = { encrypt, decrypt, generateKey };
