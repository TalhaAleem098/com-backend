const router = require("express").Router();
const Navbar = require("@/models/homeLayout/navbar.models");
const { authMiddleware } = require("@/middlewares/auth.middlewares");
const { moveImageFromTemp } = require("@/utils/cloudinary");

const moveImageToPermanent = async (imageObj, folder = "homeLayout/navbar") => {
  if (!imageObj || !imageObj.publicId) return null;
  if (!imageObj.publicId.startsWith("temp/")) return imageObj;
  
  const moveResult = await moveImageFromTemp(imageObj.publicId, folder);
  if (!moveResult.success) {
    throw new Error(`Failed to move image: ${moveResult.message}`);
  }
  return { url: moveResult.file.url, publicId: moveResult.file.publicId };
};

router.get("/brand", authMiddleware, async (req, res) => {
  try {
    let navbar = await Navbar.findOne();
    
    if (!navbar) {
      navbar = await Navbar.create({
        brand: {
          text: "MyStore",
          desktop: {
            logo: { url: "", publicId: "" },
            showLogo: true,
            showText: false,
          },
          mobile: {
            logo: { url: "", publicId: "" },
            showLogo: true,
            showText: false,
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: navbar.brand,
    });
  } catch (error) {
    console.error("❌ [Navbar Route] Error fetching brand data:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/brand", authMiddleware, async (req, res) => {
  try {
    const { text, desktop, mobile } = req.body;

    let processedDesktop = desktop;
    let processedMobile = mobile;

    if (desktop?.logo) {
      const movedDesktopLogo = await moveImageToPermanent(desktop.logo);
      processedDesktop = {
        ...desktop,
        logo: movedDesktopLogo || { url: "", publicId: "" },
      };
    }

    if (mobile?.logo) {
      const movedMobileLogo = await moveImageToPermanent(mobile.logo);
      processedMobile = {
        ...mobile,
        logo: movedMobileLogo || { url: "", publicId: "" },
      };
    }

    let navbar = await Navbar.findOne();

    if (!navbar) {
      navbar = await Navbar.create({
        brand: { text, desktop: processedDesktop, mobile: processedMobile },
      });
    } else {
      navbar.brand = {
        text: text || navbar.brand.text,
        desktop: processedDesktop || navbar.brand.desktop,
        mobile: processedMobile || navbar.brand.mobile,
      };
      await navbar.save();
    }

    return res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      data: navbar.brand,
    });
  } catch (error) {
    console.error("❌ [Navbar Route] Error updating brand data:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/links", authMiddleware, async (req, res) => {
  try {
    let navbar = await Navbar.findOne();

    if (!navbar) {
      navbar = await Navbar.create({
        brand: {
          text: "MyStore",
          desktop: {
            logo: { url: "", publicId: "" },
            showLogo: true,
            showText: false,
          },
          mobile: {
            logo: { url: "", publicId: "" },
            showLogo: true,
            showText: false,
          },
        },
        links: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: navbar.links,
    });
  } catch (error) {
    console.error("❌ [Navbar Route] Error fetching links data:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/links", authMiddleware, async (req, res) => {
  try {
    const { links } = req.body;

    if (!Array.isArray(links)) {
      console.error("❌ [Navbar Route] Invalid links format:", links);
      return res.status(400).json({
        success: false,
        message: "Links must be an array",
      });
    }

    for (const link of links) {
      if (!link.name || !link.type) {
        console.log("❌ [Navbar Route] Missing name or type in link:", link);
        return res.status(400).json({
          success: false,
          message: "Each link must have name and type",
        });
      }

      if (!["url", "query"].includes(link.type)) {
        console.log("❌ [Navbar Route] Invalid link type:", link.type);
        return res.status(400).json({
          success: false,
          message: "Link type must be either url or query",
        });
      }

      if (link.type === "url" && !link.url) {
        console.log("❌ [Navbar Route] Missing URL in url-type link:", link);
        return res.status(400).json({
          success: false,
          message: "URL-based links must have a url field",
        });
      }

      if (link.type === "query" && (!link.dropdown || !Array.isArray(link.dropdown) || link.dropdown.length === 0)) {
        console.log("❌ [Navbar Route] Invalid dropdown in query-type link:", link);
        return res.status(400).json({
          success: false,
          message: "Query-based links must have dropdown array with at least one option",
        });
      }

      if (link.type === "query" && link.dropdown) {
        console.log("🔍 [Navbar Route] Validating dropdown options for link:", link.name);
        for (const option of link.dropdown) {
          if (!option.name) {
            return res.status(400).json({
              success: false,
              message: "Each dropdown option must have a name",
            });
          }
        }
      }
    }

    let navbar = await Navbar.findOne();

    if (!navbar) {
      navbar = await Navbar.create({
        brand: {
          text: "MyStore",
          desktop: {
            logo: { url: "", publicId: "" },
            showLogo: true,
            showText: false,
          },
          mobile: {
            logo: { url: "", publicId: "" },
            showLogo: true,
            showText: false,
          },
        },
        links,
      });
    } else {
      navbar.links = links;
      await navbar.save();
    }

    return res.status(200).json({
      success: true,
      message: "Links updated successfully",
      data: navbar.links,
    });
  } catch (error) {
    console.error("❌ [Navbar Route] Error updating links data:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;