const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { generateHash } = require("../utils/sha");
const { encrypt, decrypt } = require("../utils/aes");

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  displayName: { type: String, default: null },
  twoFactorEnabled: { type: Boolean, default: false },
  email: {
    hashed: { type: String, required: true, unique: true },
    encrypted: { type: String, required: true },
  },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    ip: { type: String },
    userAgent: { type: String }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to hash password and email
employeeSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified('email.encrypted')) {
    this.email.hashed = generateHash(this.email.encrypted);
  }
  this.updatedAt = Date.now();
  next();
});

// Method to verify password
employeeSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Method to add login history
employeeSchema.methods.addLoginHistory = function(ip, userAgent) {
  this.loginHistory.push({ ip, userAgent });
  return this.save();
};

// Static method to find by email (decrypt and match)
employeeSchema.statics.findByEmail = async function(email) {
  const hashed = generateHash(email);
  const employee = await this.findOne({ 'email.hashed': hashed });
  if (employee) {
    try {
      const decryptedEmail = decrypt(employee.email.encrypted);
      if (decryptedEmail === email) {
        return employee;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }
  return null;
};

// Method to get decrypted email
employeeSchema.methods.getDecryptedEmail = function() {
  try {
    return decrypt(this.email.encrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

module.exports = mongoose.model("Employee", employeeSchema);
