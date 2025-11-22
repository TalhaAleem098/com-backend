const router = require("express").Router();
const { upload } = require("@/utils/multer");
const { uploadImage, deleteImage, checkImage } = require("@/controllers/admin/upload.controllers");

router.post("/", upload.single("image"), uploadImage);
router.delete("/", deleteImage);
router.post("/check", checkImage);

module.exports = router;