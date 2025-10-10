const router = require("express").Router();
const { fetchByType } = require("../../../controllers/admin/categories/get");

router.get("/", async (req, res) => {
  try {
    const { type } = req.query || {}
    const result = await fetchByType(type)
    return res.status(200).json(result)
  } catch (err) {
    console.log("Error fetching data", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;