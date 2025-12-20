const router = require("express").Router();
// const fetch = require("node-fetch");

router.post("/", async (req, res) => {
  try {
    const layoutSecret = req.headers["x-layout-secret"];
    const revalidateSecret = req.headers["x-revalidate-secret"];

    if (
      layoutSecret !== process.env.LAYOUT_SECRET ||
      revalidateSecret !== process.env.REVALIDATE_SECRET
    ) {
      return res.status(403).json({
        ok: false,
        message: "Forbidden",
      });
    }

    const response = await fetch(
      `${process.env.FRONTEND_URL}/api/homeLayout`,
      {
        method: "POST",
        headers: {
          "x-internal-service-key": process.env.INTERNAL_SERVICE_KEY,
          "x-layout-secret": process.env.LAYOUT_SECRET,
          "x-revalidate-secret": process.env.REVALIDATE_SECRET,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "Revalidation failed");
    }

    // ✅ THIS WAS MISSING
    return res.status(200).json({
      ok: true,
      message: "Home layout revalidated successfully",
    });

  } catch (error) {
    console.error("❌ [Revalidate Route] Error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

module.exports = router;
