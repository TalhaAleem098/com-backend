const sharp = require("sharp");
const { uploadBufferToCloudinary, deleteFromCloudinary } = require("@/utils/cloudinary");

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const fileSizeInMB = req.file.size / (1024 * 1024);

    if (fileSizeInMB > 5) {
      return res.status(400).json({
        success: false,
        message: "Image size exceeds 5MB limit",
      });
    }

    let imageBuffer = req.file.buffer;

    if (fileSizeInMB < 2) {
      imageBuffer = await sharp(req.file.buffer)
        .webp({ quality: 80, effort: 6 })
        .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
        .toBuffer();
    } else {
      imageBuffer = await sharp(req.file.buffer)
        .webp({ quality: 75, effort: 6 })
        .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
        .toBuffer();
    }

    const uploadResult = await uploadBufferToCloudinary(imageBuffer, "products");

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: uploadResult.message || "Failed to upload image to Cloudinary",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        url: uploadResult.file.url,
        publicId: uploadResult.file.publicId,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to process image",
    });
  }
};

const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    const deleteResult = await deleteFromCloudinary(publicId);

    if (!deleteResult.success) {
      return res.status(500).json({
        success: false,
        message: deleteResult.message || "Failed to delete image",
      });
    }

    return res.status(200).json({
      success: true,
      message: deleteResult.message,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete image",
    });
  }
};

module.exports = { uploadImage, deleteImage };
