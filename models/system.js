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

module.exports = mongoose.model("Alerts", alertSchema);