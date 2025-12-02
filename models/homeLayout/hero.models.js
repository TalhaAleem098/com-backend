const mongoose = require("mongoose");

const HeroSchema = new mongoose.Schema({
  slides: [
    {
      desktop: {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" }
      },
      mobile: {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" }
      },
      clickLink: { type: String, default: "" },
      gradient: {
        from: { type: String, default: "" },
        to: { type: String, default: "" },
      }
    }
  ],
  config: {
    gradientDirection: { type: String, default: "to bottom" },
    showNextPrev: { type: Boolean, default: true },
    showDots: { type: Boolean, default: true },
    autoPlay: { type: Boolean, default: false },
    autoPlaySpeed: { type: Number, default: 3000 }
  }
});

module.exports = mongoose.model("Hero", HeroSchema);
