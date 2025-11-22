const sharp = require("sharp");
const { uploadBufferToCloudinary, deleteFromCloudinary, checkImageExists } = require("@/utils/cloudinary");

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const fileSizeInMB = req.file.size / (1024 * 1024);

    if (fileSizeInMB > 5) {
      return res.status(400).json({ success: false, message: "Image size exceeds 5MB limit" });
    }

    const MAX_BYTES = 200 * 1024;
    const originalBuffer = req.file.buffer;

    const compressToTarget = async (inputBuffer) => {
      let quality = fileSizeInMB < 2 ? 80 : 75;
      let width = 1920;

      for (let pass = 0; pass < 12; pass++) {
        const buf = await sharp(inputBuffer)
          .resize({ width, height: 1920, fit: "inside", withoutEnlargement: true })
          .webp({ quality, effort: 6 })
          .toBuffer();

        if (buf.length <= MAX_BYTES) return buf;

        if (quality > 35) {
          quality = Math.max(30, quality - 5);
          continue;
        }

        if (width > 400) {
          width = Math.floor(width * 0.85);
          quality = 70;
          continue;
        }

        return buf;
      }

      return await sharp(inputBuffer)
        .resize({ width: 800, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 30, effort: 6 })
        .toBuffer();
    };

    const finalBuffer = await compressToTarget(originalBuffer);
    const uploadResult = await uploadBufferToCloudinary(finalBuffer, "temp/products");
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
    console.log("🔍 [Upload Controller] Delete image request received");
    console.log("📦 [Upload Controller] Request body:", JSON.stringify(req.body, null, 2));
    
    const { publicId } = req.body;

    console.log("📋 [Upload Controller] Extracted publicId:", publicId);
    console.log("🔢 [Upload Controller] PublicId type:", typeof publicId);
    console.log("📏 [Upload Controller] PublicId length:", publicId?.length);

    if (!publicId) {
      console.log("❌ [Upload Controller] Public ID is missing or empty");
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    // Trim whitespace
    const trimmedPublicId = publicId.trim();
    console.log("✂️  [Upload Controller] Trimmed publicId:", trimmedPublicId);
    
    if (trimmedPublicId === "") {
      console.log("❌ [Upload Controller] Public ID is empty after trimming");
      return res.status(400).json({
        success: false,
        message: "Public ID cannot be empty",
      });
    }

    console.log("🚀 [Upload Controller] Calling deleteFromCloudinary...");
    const deleteResult = await deleteFromCloudinary(trimmedPublicId);
    
    console.log("📨 [Upload Controller] Delete result:", JSON.stringify(deleteResult, null, 2));
    console.log("✔️  [Upload Controller] Delete success:", deleteResult.success);
    console.log("💬 [Upload Controller] Delete message:", deleteResult.message);

    if (!deleteResult.success) {
      console.log("❌ [Upload Controller] Delete operation failed");
      return res.status(500).json({
        success: false,
        message: deleteResult.message || "Failed to delete image",
        details: deleteResult,
      });
    }

    console.log("✅ [Upload Controller] Delete operation successful");
    return res.status(200).json({
      success: true,
      message: deleteResult.message,
      result: deleteResult.result,
    });
  } catch (err) {
    console.error("💥 [Upload Controller] Exception caught:", err);
    console.error("💥 [Upload Controller] Error message:", err.message);
    console.error("💥 [Upload Controller] Error stack:", err.stack);
    
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete image",
      error: process.env.NODE_ENV === "development" ? err.toString() : undefined,
    });
  }
};

const checkImage = async (req, res) => {
  try {
    console.log("🔍 [Upload Controller] Check image request received");
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    console.log("📋 [Upload Controller] Checking publicId:", publicId);
    const result = await checkImageExists(publicId);

    return res.status(200).json(result);
  } catch (err) {
    console.error("💥 [Upload Controller] Check failed:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to check image",
    });
  }
};

module.exports = { uploadImage, deleteImage, checkImage };