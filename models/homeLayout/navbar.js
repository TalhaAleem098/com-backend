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
  links: [
    {
      name: { type: String, required: true },
      dropdown: {
        image: {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
        items: [{ type: String }],
      },
    },
  ],
  icons: {
    showSearch: { type: Boolean, default: true },
    showCart: { type: Boolean, default: true },
    showWishlist: { type: Boolean, default: true },
    showUserAccount: { type: Boolean, default: true },
  },
  ribon: {
    texts: [{ type: String }],
    icons: {
      showWhatsapp: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      showEmail: { type: Boolean, default: false },
    },
  },
});

module.exports = mongoose.model("Navbar", NavbarSchema);
