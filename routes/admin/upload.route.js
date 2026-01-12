const router = require("express").Router();
const { upload, uploadVideo } = require("@/utils/multer");
const { uploadImage, deleteImage, checkImage, uploadVideoFile, deleteVideo } = require("@/controllers/admin/upload.controllers");
const { registerRoute } = require("@/utils/register.routes");

router.post("/", upload.single("image"), uploadImage);
router.delete("/", deleteImage);
router.post("/check", checkImage);
router.post("/video", uploadVideo.single("video"), uploadVideoFile);
router.delete("/video", deleteVideo);

registerRoute("post", "/api/admin/upload/");
registerRoute("delete", "/api/admin/upload/");
registerRoute("post", "/api/admin/upload/check");
registerRoute("post", "/api/admin/upload/video");
registerRoute("delete", "/api/admin/upload/video");

module.exports = router;