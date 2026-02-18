const mongoose = require("mongoose");
const roleModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: { type: String },
    permissions: [
      {
        resource: { type: String, required: true },
        action: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

const connection = mongoose.connection; // Default main database connection
const Roles = connection.model("Roles", roleModel);

module.exports = Roles;
