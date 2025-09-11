const router = require("express").Router();

router.post("/", async (req, res) => {
  try {
    throw new Error("Not implemented yet");
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
