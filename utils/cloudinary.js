require("dotenv").config();
const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || "your_cloud_name",
  api_key: process.env.CLOUDINARY_API_KEY || "your_api_key",
  api_secret: process.env.CLOUDINARY_API_SECRET || "your_api_secret",
});

const uploadToCloudinary = async (filePath, folder = "uploads") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, { folder });
    fs.unlinkSync(filePath);
    return {
      success: true,
      file: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    };
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return {
      success: false,
      message: err.message || "Upload failed",
    };
  }
};

const uploadBufferToCloudinary = (buffer, folder = "uploads") => {
  return new Promise((resolve) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) {
        return resolve({ success: false, message: error.message || "Upload failed" });
      }
      return resolve({ success: true, file: { url: result.secure_url, publicId: result.public_id } });
    });

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok" || result.result === "not found") {
      return {
        success: true,
        message: result.result === "ok" ? "Image deleted successfully" : "Image not found",
      };
    }
    return {
      success: false,
      message: "Failed to delete image",
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || "Delete failed",
    };
  }
};

module.exports = { uploadToCloudinary, uploadBufferToCloudinary, deleteFromCloudinary };
