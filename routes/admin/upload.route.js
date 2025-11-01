const router = require("express").Router();
const { upload } = require("@/utils/multer");
const { uploadImage, deleteImage } = require("@/controllers/admin/upload.controllers");

router.post("/", upload.single("image"), uploadImage);
router.delete("/", deleteImage);

module.exports = router;
