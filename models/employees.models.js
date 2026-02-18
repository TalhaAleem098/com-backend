const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    // Personal Information
    name: { type: String, required: true },
    contactInfo: {
      phone: { type: String },
      address: { type: String },
    },
    avatarUrl: { type: String },

    // Security Information
    email: {
      hashed: { type: String, required: true },
      encrypted: { type: String, required: true },
    },
    password: { type: String, required: true },
    twoFactorEnabled: { type: Boolean, default: false },

    // Work Information
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Roles",
      required: true,
    },
    hiringInfo: {
      dateOfJoining: { type: Date },
      position: { type: String },
      department: { type: String },
      manager: { type: mongoose.Schema.Types.ObjectId, ref: "Employees" },
    },
    salary: {
      amount: { type: Number, required: true },
      currency: { type: String, default: "PKR" },
      effectiveDate: { type: Date, default: Date.now },
    },
    bankInfo: {
      accountNumber: { type: String },
      bankName: { type: String },
      iban: { type: String },
    },

    // Status
    isActive: { type: Boolean, default: true },

    // History
    loginHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        ipAddress: String,
        userAgent: String,
        successful: Boolean,
      },
    ],
    actionHistory: [
      {
        resource: { type: String, required: true },
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: String },
      },
    ],
  },
  { timestamps: true },
);

// Methods
employeeSchema.methods.updateLoginHistory = function (
  ipAddress,
  userAgent,
  successful,
) {
  this.loginHistory.push({
    timestamp: new Date(),
    ipAddress,
    userAgent,
    successful,
  });
  return this.save();
};

employeeSchema.methods.getLoginInfo = function () {
  const lastLogin =
    this.loginHistory.length > 0
      ? this.loginHistory[this.loginHistory.length - 1]
      : null;
  const totalLogins = this.loginHistory.length;
  const successfulLogins = this.loginHistory.filter(
    (login) => login.successful,
  ).length;
  return {
    lastLogin,
    totalLogins,
    successfulLogins,
  };
};

employeeSchema.methods.updateSalary = function (
  amount,
  currency = "USD",
  effectiveDate = new Date(),
) {
  this.salary = {
    amount,
    currency,
    effectiveDate,
  };
  return this.save();
};

employeeSchema.methods.getSalaryInfo = function () {
  return this.salary;
};

const connection = mongoose.connection; // Default main database connection
const Employees = connection.model("Employees", employeeSchema);

module.exports = Employees;
