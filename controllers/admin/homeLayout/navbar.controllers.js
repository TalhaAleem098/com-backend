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

const getBrand = async (req, res) => {
  try {
    const navbar = await Navbar.findOne();

    if (!navbar) {
      return res.status(404).json({
        success: false,
        message: "Navbar not found",
      });
    }

    res.status(200).json({
      success: true,
      data: navbar.brand,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch brand",
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
      data: navbar.brand,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update brand settings",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

const getLinks = async (req, res) => {
  try {
    const navbar = await Navbar.findOne();

    if (!navbar) {
      return res.status(404).json({
        success: false,
        message: "Navbar not found",
      });
    }

    res.status(200).json({
      success: true,
      data: navbar.links,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch links",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

const updateLinks = async (req, res) => {
  try {
    const { links } = req.body;

    if (!links || !Array.isArray(links)) {
      return res.status(400).json({
        success: false,
        message: "Links array is required",
      });
    }

    let navbar = await Navbar.findOne();

    if (!navbar) {
      return res.status(404).json({
        success: false,
        message: "Navbar not found. Please create navbar first.",
      });
    }

    const oldImages = navbar.links
      .filter(link => link.dropdown?.image?.publicId)
      .map(link => link.dropdown.image.publicId);

    const processedLinks = await Promise.all(
      links.map(async (link) => {
        if (link.dropdown?.image?.publicId && link.dropdown.image.publicId.startsWith("temp/")) {
          const moveResult = await moveImageFromTemp(link.dropdown.image.publicId, "navbar/links");
          
          if (!moveResult.success) {
            throw new Error("Failed to move dropdown image");
          }

          return {
            ...link,
            dropdown: {
              ...link.dropdown,
              image: {
                url: moveResult.file.url,
                publicId: moveResult.file.publicId,
              },
            },
          };
        }
        return link;
      })
    );

    navbar.links = processedLinks;

    const newImages = processedLinks
      .filter(link => link.dropdown?.image?.publicId)
      .map(link => link.dropdown.image.publicId);

    const imagesToDelete = oldImages.filter(oldId => !newImages.includes(oldId));
    
    for (const publicId of imagesToDelete) {
      await deleteFromCloudinary(publicId);
    }

    await navbar.save();

    res.status(200).json({
      success: true,
      message: "Links updated successfully",
      data: navbar.links,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Failed to update links",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

const getIcons = async (req, res) => {
  try {
    const navbar = await Navbar.findOne();

    if (!navbar) {
      return res.status(404).json({
        success: false,
        message: "Navbar not found",
      });
    }

    res.status(200).json({
      success: true,
      data: navbar.icons,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch icons",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

const updateIcons = async (req, res) => {
  try {
    const { showSearch, showCart, showWishlist, showUserAccount } = req.body;

    let navbar = await Navbar.findOne();

    if (!navbar) {
      return res.status(404).json({
        success: false,
        message: "Navbar not found. Please create navbar first.",
      });
    }

    if (showSearch !== undefined) navbar.icons.showSearch = showSearch;
    if (showCart !== undefined) navbar.icons.showCart = showCart;
    if (showWishlist !== undefined) navbar.icons.showWishlist = showWishlist;
    if (showUserAccount !== undefined) navbar.icons.showUserAccount = showUserAccount;

    await navbar.save();

    res.status(200).json({
      success: true,
      message: "Icons updated successfully",
      data: navbar.icons,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update icons",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

const getRibon = async (req, res) => {
  try {
    const navbar = await Navbar.findOne();

    if (!navbar) {
      return res.status(404).json({
        success: false,
        message: "Navbar not found",
      });
    }

    res.status(200).json({
      success: true,
      data: navbar.ribon,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch ribon",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

const updateRibon = async (req, res) => {
  try {
    const { texts, icons } = req.body;

    let navbar = await Navbar.findOne();

    if (!navbar) {
      return res.status(404).json({
        success: false,
        message: "Navbar not found. Please create navbar first.",
      });
    }

    if (texts !== undefined && Array.isArray(texts)) {
      navbar.ribon.texts = texts;
    }

    if (icons) {
      if (icons.showWhatsapp !== undefined) navbar.ribon.icons.showWhatsapp = icons.showWhatsapp;
      if (icons.showPhone !== undefined) navbar.ribon.icons.showPhone = icons.showPhone;
      if (icons.showEmail !== undefined) navbar.ribon.icons.showEmail = icons.showEmail;
    }

    await navbar.save();

    res.status(200).json({
      success: true,
      message: "Ribon updated successfully",
      data: navbar.ribon,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update ribon",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

module.exports = {
  getNavbar,
  getBrand,
  updateBrand,
  getLinks,
  updateLinks,
  getIcons,
  updateIcons,
  getRibon,
  updateRibon,
};
