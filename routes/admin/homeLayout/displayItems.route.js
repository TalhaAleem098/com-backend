const router = require("express").Router();
const DisplayItem = require("@/models/homeLayout/displayItems.models");
const { authMiddleware } = require("@/middlewares/auth.middlewares");
const { moveImageFromTemp } = require("@/utils/cloudinary");

const displayItemPopulatePaths = [
  "nonFeatured.firstTwoRows.row1Products",
  "nonFeatured.firstTwoRows.row2Products",
  "nonFeatured.leftImageRightProducts.products",
  "nonFeatured.rightImageLeftProducts.products",
  "nonFeatured.extraFeaturedList.product",
];

const moveImageToPermanent = async (imageObj, folder = "homeLayout/displayItems") => {
  if (!imageObj || !imageObj.publicId) return null;
  if (!imageObj.publicId.startsWith("temp/")) return imageObj;
  
  const moveResult = await moveImageFromTemp(imageObj.publicId, folder);
  if (!moveResult.success) {
    throw new Error(`Failed to move image: ${moveResult.message}`);
  }
  return { url: moveResult.file.url, publicId: moveResult.file.publicId };
};

const moveVideoToPermanent = async (videoObj, folder = "homeLayout/displayItems") => {
  if (!videoObj || !videoObj.publicId) return null;
  if (!videoObj.publicId.startsWith("temp/")) return videoObj;
  
  const moveResult = await moveImageFromTemp(videoObj.publicId, folder, "video");
  if (!moveResult.success) {
    throw new Error(`Failed to move video: ${moveResult.message}`);
  }
  return { videoUrl: moveResult.file.url, publicId: moveResult.file.publicId };
};

router.get("/", authMiddleware, async (req, res) => {
  try {
    let displayItem = await DisplayItem.findOne().populate(displayItemPopulatePaths);

    if (!displayItem) {
      displayItem = await DisplayItem.create({
        displayMode: "featured",
        nonFeatured: {
          firstTwoRows: {
            row1Products: [],
            row2Products: [],
          },
          videoSection: {
            videoUrl: "",
            publicId: "",
          },
          leftImageRightProducts: {
            image: { url: "", publicId: "" },
            products: [],
          },
          rightImageLeftProducts: {
            image: { url: "", publicId: "" },
            products: [],
          },
          extraFeaturedList: [],
        },
        featuredLaunches: {
          launchImage: { url: "", publicId: "" },
          link: "",
        },
      });

      await displayItem.populate(displayItemPopulatePaths);
    }

    return res.status(200).json({
      success: true,
      data: displayItem,
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
    const { displayMode, nonFeatured, featuredLaunches } = req.body;

    let processedNonFeatured = nonFeatured;
    let processedFeaturedLaunches = featuredLaunches;

    if (nonFeatured) {
      if (nonFeatured.videoSection) {
        const movedVideo = await moveVideoToPermanent(nonFeatured.videoSection);
        processedNonFeatured = {
          ...processedNonFeatured,
          videoSection: movedVideo || { videoUrl: "", publicId: "" },
        };
      }

      if (nonFeatured.leftImageRightProducts?.image) {
        const movedImage = await moveImageToPermanent(nonFeatured.leftImageRightProducts.image);
        processedNonFeatured = {
          ...processedNonFeatured,
          leftImageRightProducts: {
            ...nonFeatured.leftImageRightProducts,
            image: movedImage || { url: "", publicId: "" },
          },
        };
      }

      if (nonFeatured.rightImageLeftProducts?.image) {
        const movedImage = await moveImageToPermanent(nonFeatured.rightImageLeftProducts.image);
        processedNonFeatured = {
          ...processedNonFeatured,
          rightImageLeftProducts: {
            ...nonFeatured.rightImageLeftProducts,
            image: movedImage || { url: "", publicId: "" },
          },
        };
      }
    }

    if (featuredLaunches?.launchImage) {
      const movedLaunchImage = await moveImageToPermanent(featuredLaunches.launchImage);
      processedFeaturedLaunches = {
        ...featuredLaunches,
        launchImage: movedLaunchImage || { url: "", publicId: "" },
      };
    }

    let displayItem = await DisplayItem.findOne();

    if (!displayItem) {
      displayItem = await DisplayItem.create({
        displayMode,
        nonFeatured: processedNonFeatured,
        featuredLaunches: processedFeaturedLaunches,
      });
    } else {
      if (displayMode !== undefined) displayItem.displayMode = displayMode;
      if (processedNonFeatured !== undefined) {
        displayItem.nonFeatured = {
          ...displayItem.nonFeatured,
          ...processedNonFeatured,
        };
      }
      if (processedFeaturedLaunches !== undefined) {
        displayItem.featuredLaunches = {
          ...displayItem.featuredLaunches,
          ...processedFeaturedLaunches,
        };
      }
      await displayItem.save();
    }

    displayItem = await DisplayItem.findById(displayItem._id).populate(displayItemPopulatePaths);

    return res.status(200).json({
      success: true,
      message: "Display items updated successfully",
      data: displayItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
