const mongoose = require("mongoose");

const homeLayoutSchema = new mongoose.Schema(
  {
    layoutName: { type: String, required: true },
    topStrip: {
      enabled: { type: Boolean, default: false },
      texts: [{ type: String, default: "" }],
      backgroundColor: { type: String, default: "#000000" },
      textColor: { type: String, default: "#FFFFFF" },
    },
    icons:[{
      svg: { type: String, default: "" },
      link: { type: String, default: "" },
      altText: { type: String, default: "" },
      color: { type: String, default: "#000000" }
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("HomeLayout", homeLayoutSchema);