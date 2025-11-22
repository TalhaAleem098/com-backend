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

const uploadBufferToCloudinary = (buffer, folder = "uploads", options = {}) => {
  return new Promise((resolve) => {
    const uploadOptions = { folder, ...options };
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
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
    console.log("🗑️  [Cloudinary Delete] Starting deletion process");
    console.log("📋 [Cloudinary Delete] Public ID:", publicId);
    
    if (!publicId || publicId.trim() === "") {
      console.log("❌ [Cloudinary Delete] Empty or invalid public ID provided");
      return {
        success: false,
        message: "Public ID is required and cannot be empty",
      };
    }

    // Try to get resource info first to verify it exists
    try {
      console.log("� [Cloudinary Delete] Checking if resource exists...");
      const resourceInfo = await cloudinary.api.resource(publicId, { resource_type: 'image' });
      console.log("✅ [Cloudinary Delete] Resource found:", {
        public_id: resourceInfo.public_id,
        format: resourceInfo.format,
        resource_type: resourceInfo.resource_type,
        type: resourceInfo.type,
        created_at: resourceInfo.created_at,
      });
    } catch (checkErr) {
      console.log("⚠️  [Cloudinary Delete] Resource check failed:", checkErr.message);
      if (checkErr.error && checkErr.error.http_code === 404) {
        console.log("📭 [Cloudinary Delete] Resource does not exist");
        return {
          success: true,
          message: "Image not found (already deleted or never existed)",
          result: "not found",
        };
      }
    }

    console.log("�🔄 [Cloudinary Delete] Calling Cloudinary destroy API...");
    
    // Try different resource types if needed
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: 'image',
    });
    
    console.log("📊 [Cloudinary Delete] API Response:", JSON.stringify(result, null, 2));
    console.log("📌 [Cloudinary Delete] Result status:", result.result);
    
    if (result.result === "ok") {
      console.log("✅ [Cloudinary Delete] Image deleted successfully");
      return {
        success: true,
        message: "Image deleted successfully",
        result: result.result,
      };
    } else if (result.result === "not found") {
      console.log("⚠️  [Cloudinary Delete] Image not found in Cloudinary");
      return {
        success: true,
        message: "Image not found (already deleted or never existed)",
        result: result.result,
      };
    } else {
      console.log("❌ [Cloudinary Delete] Unexpected result:", result.result);
      return {
        success: false,
        message: `Delete failed with result: ${result.result}`,
        result: result.result,
      };
    }
  } catch (err) {
    console.error("💥 [Cloudinary Delete] Error occurred:", err);
    console.error("💥 [Cloudinary Delete] Error message:", err.message);
    console.error("💥 [Cloudinary Delete] Error code:", err.error?.http_code);
    console.error("💥 [Cloudinary Delete] Error details:", JSON.stringify(err.error, null, 2));
    console.error("💥 [Cloudinary Delete] Error stack:", err.stack);
    
    return {
      success: false,
      message: err.message || "Delete failed",
      error: err.toString(),
      errorDetails: err.error,
    };
  }
};

/**
 * Move image from temp folder to permanent folder
 * @param {string} publicId - The public ID of the temp image
 * @param {string} newFolder - The destination folder (e.g., "products")
 * @returns {Promise<{success: boolean, file?: {url: string, publicId: string}, message?: string}>}
 */
const moveImageFromTemp = async (publicId, newFolder = "products") => {
  try {
    if (!publicId) {
      return { success: false, message: "Public ID is required" };
    }

    // Check if the image is in temp folder
    if (!publicId.startsWith("temp/")) {
      return { success: false, message: "Image is not in temp folder" };
    }

    // Extract filename from publicId (e.g., "temp/products/abc123" -> "abc123")
    const filename = publicId.split("/").pop();
    const newPublicId = `${newFolder}/${filename}`;

    // Rename (move) the image
    const result = await cloudinary.uploader.rename(publicId, newPublicId, {
      overwrite: false,
      invalidate: true,
    });

    return {
      success: true,
      file: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || "Failed to move image",
    };
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {string[]} publicIds - Array of public IDs to delete
 * @returns {Promise<{success: boolean, deleted: number, failed: number}>}
 */
const deleteManyFromCloudinary = async (publicIds) => {
  try {
    if (!publicIds || publicIds.length === 0) {
      return { success: true, deleted: 0, failed: 0 };
    }

    const result = await cloudinary.api.delete_resources(publicIds);
    
    const deleted = Object.values(result.deleted || {}).filter(
      (status) => status === "deleted"
    ).length;
    
    const failed = publicIds.length - deleted;

    return {
      success: true,
      deleted,
      failed,
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || "Failed to delete images",
      deleted: 0,
      failed: publicIds.length,
    };
  }
};

/**
 * Get all images in temp folder older than specified hours
 * @param {number} hoursOld - Age threshold in hours (default: 24)
 * @returns {Promise<{success: boolean, images?: Array, message?: string}>}
 */
const getTempImages = async (hoursOld = 24) => {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "temp/",
      max_results: 500,
      tags: true,
      context: true,
    });

    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    
    const oldImages = (result.resources || []).filter((resource) => {
      const createdAt = new Date(resource.created_at);
      return createdAt < cutoffTime;
    });

    return {
      success: true,
      images: oldImages.map((img) => ({
        publicId: img.public_id,
        url: img.secure_url,
        createdAt: img.created_at,
      })),
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || "Failed to fetch temp images",
    };
  }
};

/**
 * Check if an image exists in Cloudinary
 * @param {string} publicId - The public ID to check
 * @returns {Promise<{success: boolean, exists: boolean, details?: object, message?: string}>}
 */
const checkImageExists = async (publicId) => {
  try {
    console.log("🔍 [Cloudinary Check] Checking if image exists:", publicId);
    
    const resourceInfo = await cloudinary.api.resource(publicId, { 
      resource_type: 'image',
      type: 'upload' 
    });
    
    console.log("✅ [Cloudinary Check] Image exists:", {
      public_id: resourceInfo.public_id,
      format: resourceInfo.format,
      url: resourceInfo.secure_url,
      created_at: resourceInfo.created_at,
    });
    
    return {
      success: true,
      exists: true,
      details: {
        publicId: resourceInfo.public_id,
        format: resourceInfo.format,
        url: resourceInfo.secure_url,
        resourceType: resourceInfo.resource_type,
        type: resourceInfo.type,
        createdAt: resourceInfo.created_at,
        bytes: resourceInfo.bytes,
      },
    };
  } catch (err) {
    console.log("❌ [Cloudinary Check] Error:", err.message);
    
    if (err.error && err.error.http_code === 404) {
      console.log("📭 [Cloudinary Check] Image does not exist");
      return {
        success: true,
        exists: false,
        message: "Image not found",
      };
    }
    
    return {
      success: false,
      exists: false,
      message: err.message || "Failed to check image",
    };
  }
};

module.exports = { 
  uploadToCloudinary, 
  uploadBufferToCloudinary, 
  deleteFromCloudinary,
  moveImageFromTemp,
  deleteManyFromCloudinary,
  getTempImages,
  checkImageExists,
};
