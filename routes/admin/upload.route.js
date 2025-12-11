const router = require("express").Router();
const { upload, uploadVideo } = require("@/utils/multer");
const { uploadImage, deleteImage, checkImage, uploadVideoFile, deleteVideo } = require("@/controllers/admin/upload.controllers");

router.post("/", upload.single("image"), uploadImage);
router.delete("/", deleteImage);
router.post("/check", checkImage);
router.post("/video", uploadVideo.single("video"), uploadVideoFile);
router.delete("/video", deleteVideo);

module.exports = router;