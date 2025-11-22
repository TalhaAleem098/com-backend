const mongoose = require("mongoose");

const NavbarSchema = new mongoose.Schema({
  brand: {
    name: { type: String, required: true },
    isNameShown: { type: Boolean, default: true },
    logo: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    isLogoShown: { type: Boolean, default: true },
    brandLinkActive: { type: Boolean, default: false },
  },
});


module.exports = mongoose.model("Navbar", NavbarSchema);