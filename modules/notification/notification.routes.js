const router = require("express").Router();
const { authMiddleware } = require("@/middlewares/auth.middlewares");
const notificationService = require("./notification.service");

// ─── Notification Routes (auth required) ───

// Get notifications for the logged-in admin
router.get("/", authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { page = 1, limit = 20, type, unreadOnly } = req.query;

    const result = await notificationService.getNotifications(adminId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      unreadOnly: unreadOnly === "true",
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

// Get unread count
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const count = await notificationService.getUnreadCount(adminId);

    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (err) {
    console.error("Error getting unread count:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to get unread count",
    });
  }
});

// Mark notification(s) as read
router.patch("/read", authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { notificationId } = req.body; // Optional: specific notification

    await notificationService.markAsRead(adminId, notificationId);

    return res.status(200).json({
      success: true,
      message: notificationId
        ? "Notification marked as read"
        : "All notifications marked as read",
    });
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark as read",
    });
  }
});

// ─── Push Subscription Routes ───

// Subscribe to push notifications
router.post("/push/subscribe", authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const adminRole = req.user.role;
    const subscription = req.body;

    if (!subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription data",
      });
    }

    await notificationService.savePushSubscription({
      userId: adminId,
      userRole: adminRole,
      subscription,
    });

    return res.status(201).json({
      success: true,
      message: "Push subscription saved",
    });
  } catch (err) {
    console.error("Error saving push subscription:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save subscription",
    });
  }
});

// Unsubscribe from push notifications
router.post("/push/unsubscribe", authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: "Endpoint is required",
      });
    }

    await notificationService.removePushSubscription(endpoint);

    return res.status(200).json({
      success: true,
      message: "Push subscription removed",
    });
  } catch (err) {
    console.error("Error removing push subscription:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to remove subscription",
    });
  }
});

module.exports = router;
