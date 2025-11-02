const sharp = require("sharp");
const { uploadBufferToCloudinary, deleteFromCloudinary } = require("@/utils/cloudinary");

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const fileSizeInMB = req.file.size / (1024 * 1024);

    if (fileSizeInMB > 5) {
      return res.status(400).json({ success: false, message: "Image size exceeds 5MB limit" });
    }

    const MAX_BYTES = 200 * 1024; // 200 KB target
    const originalBuffer = req.file.buffer;

    // Adaptive compression: try reducing quality first, then dimensions.
    const compressToTarget = async (inputBuffer) => {
      // start quality based on original size
      let quality = fileSizeInMB < 2 ? 80 : 75;
      let width = 1920;

      // limit attempts to avoid long loops
      for (let pass = 0; pass < 12; pass++) {
        const buf = await sharp(inputBuffer)
          .resize({ width, height: 1920, fit: "inside", withoutEnlargement: true })
          .webp({ quality, effort: 6 })
          .toBuffer();

        if (buf.length <= MAX_BYTES) return buf;

        // reduce quality first
        if (quality > 35) {
          quality = Math.max(30, quality - 5);
          continue;
        }

        // if quality already low, reduce dimensions (width)
        if (width > 400) {
          width = Math.floor(width * 0.85);
          // reset quality a bit when resizing to keep decent visual quality
          quality = 70;
          continue;
        }

        // if we can't reach target, return the best we have
        return buf;
      }

      // fallback: final attempt with lower quality and smaller width
      return await sharp(inputBuffer)
        .resize({ width: 800, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 30, effort: 6 })
        .toBuffer();
    };

    const finalBuffer = await compressToTarget(originalBuffer);

    // Upload final webp buffer to Cloudinary under products/webp
    const uploadResult = await uploadBufferToCloudinary(finalBuffer, "products/webp");

    if (!uploadResult.success) {
      return res.status(500).json({ success: false, message: uploadResult.message || "Failed to upload image to Cloudinary" });
    }

    return res.status(200).json({ success: true, data: { url: uploadResult.file.url, publicId: uploadResult.file.publicId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Failed to process image" });
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
