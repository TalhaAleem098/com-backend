const router = require("express").Router();
const { authMiddleware } = require("@/middlewares/auth.middlewares");
const chatService = require("./chat.service");
const { getConnectedAdmins } = require("@/socket/admin.socket");

// ─── Client Routes (no auth needed — uses chatId) ───

// Send message from client
router.post("/client/send", async (req, res) => {
  try {
    const { chatId, message, senderName } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        message: "chatId and message are required",
      });
    }

    // Ensure session exists
    await chatService.getOrCreateClientSession(chatId, senderName);

    const savedMessage = await chatService.saveMessage({
      chatId,
      senderId: chatId,
      senderRole: "client",
      receiverId: null, // broadcast to admins
      chatType: "admin-client",
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Message sent",
      data: savedMessage,
    });
  } catch (err) {
    console.error("Error sending client message:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
});

// Get messages for a client chat
router.get("/client/messages/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await chatService.getMessages(chatId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
});

// ─── Admin Routes (auth required) ───

// Send message from admin
router.post("/admin/send", authMiddleware, async (req, res) => {
  try {
    const { chatId, message, chatType, receiverId } = req.body;
    const adminId = req.user.id;

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        message: "chatId and message are required",
      });
    }

    const savedMessage = await chatService.saveMessage({
      chatId,
      senderId: adminId,
      senderRole: "admin",
      receiverId: receiverId || null,
      chatType: chatType || "admin-client",
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Message sent",
      data: savedMessage,
    });
  } catch (err) {
    console.error("Error sending admin message:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
});

// Get messages for a specific chat (admin view)
router.get("/admin/messages/:chatId", authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await chatService.getMessages(chatId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error fetching admin messages:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
});

// Get all active chat sessions
router.get("/admin/sessions", authMiddleware, async (req, res) => {
  try {
    const { chatType, page = 1, limit = 20 } = req.query;

    const result = await chatService.getActiveSessions({
      chatType,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error fetching sessions:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
    });
  }
});

// Mark messages as read
router.patch("/admin/read/:chatId", authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;

    await chatService.markAsRead(chatId);

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (err) {
    console.error("Error marking as read:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
    });
  }
});

// Get connected (online) admins
router.get("/admin/online", authMiddleware, async (req, res) => {
  try {
    const onlineAdmins = getConnectedAdmins();
    return res.status(200).json({
      success: true,
      data: { admins: onlineAdmins, count: onlineAdmins.length },
    });
  } catch (err) {
    console.error("Error getting online admins:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to get online admins",
    });
  }
});

// Get total unread chat session count
router.get("/admin/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await chatService.getUnreadSessionCount();
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

module.exports = router;
