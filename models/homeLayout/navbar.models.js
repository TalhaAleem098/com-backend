const mongoose = require("mongoose");

const NavbarSchema = new mongoose.Schema(
  {
    brand: {
      text: {
        type: String,
        required: true,
        trim: true,
        default: "MyStore",
      },
      desktop: {
        logo: {
          url: {
            type: String,
            default: "",
          },
          publicId: {
            type: String,
            default: "",
          },
        },
        showLogo: {
          type: Boolean,
          default: true,
        },
        showText: {
          type: Boolean,
          default: false,
        },
      },
      mobile: {
        logo: {
          url: {
            type: String,
            default: "",
          },
          publicId: {
            type: String,
            default: "",
          },
        },
        showLogo: {
          type: Boolean,
          default: true,
        },
        showText: {
          type: Boolean,
          default: false,
        },
      },
    },
    links: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        type: {
          type: String,
          enum: ["url", "query"],
          required: true,
        },
        url: {
          type: String,
          trim: true,
          default: "",
        },
        dropdown: [
          {
            name: {
              type: String,
              required: true,
              trim: true,
            },
          },
        ],
        order: {
          type: Number,
          default: 0,
        },
        isVisible: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Navbar = mongoose.model("Navbar", NavbarSchema);

module.exports = Navbar;
