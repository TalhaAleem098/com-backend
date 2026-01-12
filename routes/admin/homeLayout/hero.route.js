const router = require("express").Router();
const Hero = require("@/models/homeLayout/hero.models");
const { authMiddleware } = require("@/middlewares/auth.middlewares");
const { moveImageFromTemp } = require("@/utils/cloudinary");
const { registerRoute } = require("@/utils/register.routes");

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

    console.log("📦 [Hero Route] Received request body:", JSON.stringify(req.body, null, 2));

    if (slides && !Array.isArray(slides)) {
      return res.status(400).json({
        success: false,
        message: "Slides must be an array",
      });
    }

    let processedSlides = [];
    if (slides && Array.isArray(slides)) {
      console.log(`🎨 [Hero Route] Processing ${slides.length} slide(s)`);
      
      processedSlides = await Promise.all(
        slides.map(async (slide, index) => {
          const gradientFrom = slide.gradient?.from && slide.gradient.from.trim() !== "" 
            ? slide.gradient.from 
            : "#000000";
          const gradientTo = slide.gradient?.to && slide.gradient.to.trim() !== "" 
            ? slide.gradient.to 
            : "";
          
          console.log(`🎨 [Hero Route] Slide ${index + 1} gradient colors:`, {
            from: gradientFrom,
            to: gradientTo || "none"
          });
          
          const desktopImg = await moveImageToPermanent(slide.desktop);
          const mobileImg = await moveImageToPermanent(slide.mobile);
          return {
            desktop: desktopImg || { url: "", publicId: "" },
            mobile: mobileImg || { url: "", publicId: "" },
            clickLink: slide.clickLink || "",
            gradient: {
              from: gradientFrom,
              to: gradientTo,
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

registerRoute("get", "/api/admin/home-layout/hero/");
registerRoute("post", "/api/admin/home-layout/hero/");

module.exports = router;
