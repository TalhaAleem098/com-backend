const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      defaukt: "400",
    },
  },
  { timestamps: true }
);

const connection = mongoose.connection; // Default main database connection
module.exports = connection.model("Alerts", alertSchema);