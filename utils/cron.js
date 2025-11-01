const cron = require("node-cron");
const { getTempImages, deleteManyFromCloudinary } = require("./cloudinary");

/**
 * Cleanup old temporary images from Cloudinary
 * Runs daily at 2:00 AM
 * Deletes images older than 24 hours
 */
const cleanupTempImages = () => {
  // Schedule: Run every day at 2:00 AM
  // Format: second minute hour day month weekday
  cron.schedule("0 2 * * *", async () => {
    console.log("🧹 [Cron] Starting temp image cleanup...");
    
    try {
      // Get temp images older than 24 hours
      const result = await getTempImages(24);
      
      if (!result.success) {
        console.error("❌ [Cron] Failed to fetch temp images:", result.message);
        return;
      }

      const images = result.images || [];
      
      if (images.length === 0) {
        console.log("✅ [Cron] No temp images to clean up");
        return;
      }

      console.log(`📋 [Cron] Found ${images.length} temp images to delete`);

      // Delete images in batches of 100 (Cloudinary limit)
      const batchSize = 100;
      let totalDeleted = 0;
      let totalFailed = 0;

      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        const publicIds = batch.map(img => img.publicId);
        
        const deleteResult = await deleteManyFromCloudinary(publicIds);
        
        if (deleteResult.success) {
          totalDeleted += deleteResult.deleted;
          totalFailed += deleteResult.failed;
        } else {
          console.error(`❌ [Cron] Failed to delete batch:`, deleteResult.message);
          totalFailed += batch.length;
        }
      }

      console.log(`✅ [Cron] Cleanup complete: ${totalDeleted} deleted, ${totalFailed} failed`);
    } catch (error) {
      console.error("❌ [Cron] Error during cleanup:", error.message);
    }
  });

  console.log("⏰ [Cron] Temp image cleanup scheduled (daily at 2:00 AM)");
};

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
  cleanupTempImages();
  console.log("✅ [Cron] All cron jobs initialized");
};

module.exports = {
  initializeCronJobs,
  cleanupTempImages,
};
