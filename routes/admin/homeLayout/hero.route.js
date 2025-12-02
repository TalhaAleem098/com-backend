const router = require("express").Router();
const Hero = require("@/models/homeLayout/hero.models");
const { authMiddleware } = require("@/middlewares/auth.middlewares");
const { moveImageFromTemp } = require("@/utils/cloudinary");

const moveImageToPermanent = async (imageObj, folder = "homeLayout/hero") => {
  if (!imageObj || !imageObj.publicId) return null;
  if (!imageObj.publicId.startsWith("temp/")) return imageObj;
  
  const moveResult = await moveImageFromTemp(imageObj.publicId, folder);
  if (!moveResult.success) {
    throw new Error(`Failed to move image: ${moveResult.message}`);
  }
  return { url: moveResult.file.url, publicId: moveResult.file.publicId };
};

router.get("/", authMiddleware, async (req, res) => {
  try {
    let hero = await Hero.findOne();

    if (!hero) {
      hero = await Hero.create({
        slides: [],
        config: {
          gradientDirection: "to bottom",
          showNextPrev: true,
          showDots: true,
          autoPlay: false,
          autoPlaySpeed: 3000,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: hero,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { slides, config } = req.body;

    if (slides && !Array.isArray(slides)) {
      return res.status(400).json({
        success: false,
        message: "Slides must be an array",
      });
    }

    let processedSlides = [];
    if (slides && Array.isArray(slides)) {
      processedSlides = await Promise.all(
        slides.map(async (slide) => {
          const desktopImg = await moveImageToPermanent(slide.desktop);
          const mobileImg = await moveImageToPermanent(slide.mobile);
          return {
            desktop: desktopImg || { url: "", publicId: "" },
            mobile: mobileImg || { url: "", publicId: "" },
            clickLink: slide.clickLink || "",
            gradient: {
              from: slide.gradient?.from || "",
              to: slide.gradient?.to || "",
            },
          };
        })
      );
    }

    let hero = await Hero.findOne();

    if (!hero) {
      hero = await Hero.create({ slides: processedSlides, config });
    } else {
      if (slides !== undefined) hero.slides = processedSlides;
      if (config !== undefined) hero.config = { ...hero.config, ...config };
      await hero.save();
    }

    return res.status(200).json({
      success: true,
      message: "Hero section updated successfully",
      data: hero,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
