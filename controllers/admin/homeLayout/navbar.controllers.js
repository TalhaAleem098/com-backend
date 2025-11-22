const Navbar = require("@/models/homeLayout/navbar");
const { moveImageFromTemp, deleteFromCloudinary } = require("@/utils/cloudinary");

const getNavbar = async (req, res) => {
  try {
    let navbar = await Navbar.findOne();

    if (!navbar) {
      navbar = new Navbar({
        brand: {
          name: "Store Name",
          isNameShown: true,
          logo: {
            url: "n/a",
            publicId: "n/a",
          },
          isLogoShown: true,
          brandLinkActive: false,
        },
      });
      await navbar.save();
    }

    res.status(200).json({
      success: true,
      data: navbar,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch navbar",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

const updateBrand = async (req, res) => {
  try {
    const { name, isNameShown, logo, isLogoShown, brandLinkActive } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    let navbar = await Navbar.findOne();

    if (!navbar) {
      navbar = new Navbar({
        brand: {
          name: "",
          isNameShown: true,
          logo: { url: "", publicId: "" },
          isLogoShown: true,
          brandLinkActive: false,
        },
      });
    }

    const oldLogoPublicId = navbar.brand?.logo?.publicId;
    let newLogoUrl = navbar.brand?.logo?.url || "";
    let newLogoPublicId = navbar.brand?.logo?.publicId || "";

    if (logo && logo.publicId) {
      if (logo.publicId.startsWith("temp/")) {
        const moveResult = await moveImageFromTemp(logo.publicId, "navbar");
        
        if (!moveResult.success) {
          return res.status(500).json({
            success: false,
            message: "Failed to move logo image",
          });
        }

        newLogoUrl = moveResult.file.url;
        newLogoPublicId = moveResult.file.publicId;

        if (oldLogoPublicId && oldLogoPublicId !== newLogoPublicId) {
          await deleteFromCloudinary(oldLogoPublicId);
        }
      } else {
        newLogoUrl = logo.url;
        newLogoPublicId = logo.publicId;
      }
    }

    navbar.brand = {
      name: name.trim(),
      isNameShown: isNameShown !== undefined ? isNameShown : true,
      logo: {
        url: newLogoUrl,
        publicId: newLogoPublicId,
      },
      isLogoShown: isLogoShown !== undefined ? isLogoShown : true,
      brandLinkActive: brandLinkActive !== undefined ? brandLinkActive : false,
    };

    await navbar.save();

    res.status(200).json({
      success: true,
      message: "Brand settings updated successfully",
      data: navbar,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update brand settings",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

module.exports = {
  getNavbar,
  updateBrand,
};
