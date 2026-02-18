const { verifyToken } = require("@/utils/jwt");
const chatService = require("@/modules/chat/chat.service");
const notificationService = require("@/modules/notification/notification.service");
const { getConnectedAdmins } = require("./admin.socket");

/**
 * Create a chat notification for all connected admins + send push to all admins
 * Also pushes updated notification count to each admin via socket
 */
async function createChatNotification(io, chatId, message) {
  try {
    const connectedAdmins = getConnectedAdmins();
    const shortMessage =
      message.length > 80 ? message.slice(0, 80) + "..." : message;

    // Create in-app notification for each connected admin
    for (const adminId of connectedAdmins) {
      await notificationService.createNotification({
        recipientId: adminId,
        recipientRole: "admin",
        type: "chat",
        title: `New message from ${chatId.slice(0, 8)}...`,
        message: shortMessage,
        data: { chatId },
      });

      // Push notification unread count to this specific admin
      const count = await notificationService.getUnreadCount(adminId);
      io.to("admin:lobby").emit("notificationCountUpdate", {
        notificationUnread: count,
      });
    }

    // Send push notification to all admins
    await notificationService.sendPushToAllAdmins({
      title: "New Chat Message",
      body: shortMessage,
      data: { type: "chat", chatId },
    });
  } catch (err) {
    console.error("[Notification] Error creating chat notification:", err);
  }
}

/**
 * Push updated unread session count to all admins via socket
 */
async function pushUnreadCount(io) {
  try {
    const count = await chatService.getUnreadSessionCount();
    io.to("admin:lobby").emit("unreadCountUpdate", { chatUnread: count });
  } catch (err) {
    console.error("[Socket] Error pushing unread count:", err);
  }
}

/**
 * Handle client socket connections
 * Clients connect with chatId (uuid from localStorage)
 */
function registerClientHandlers(io, socket, chatId) {
  // Join the client's own chat room
  const roomName = `chat:${chatId}`;
  socket.join(roomName);
  console.log(`[Client Socket] Client joined room: ${roomName}`);

  // Handle incoming messages from client
  socket.on("sendMessage", async (data) => {
    try {
      const { message, _id } = data;

      if (!message || !message.trim()) return;

      console.log(`[Client Socket] Message from client ${chatId}:`, message);

      // If message was already saved via REST API, just broadcast
      if (_id) {
        // Broadcast to all admins in the admin room
        io.to("admin:lobby").emit("newClientMessage", {
          _id,
          chatId,
          message,
          senderId: chatId,
          senderRole: "client",
          chatType: "admin-client",
          createdAt: new Date().toISOString(),
        });

        // Create notification for all connected admins
        createChatNotification(io, chatId, message);

        // Push updated unread count to admins
        pushUnreadCount(io);
        return;
      }

      // If message wasn't saved via REST (fallback), save it now
      const savedMessage = await chatService.saveMessage({
        chatId,
        senderId: chatId,
        senderRole: "client",
        receiverId: null,
        chatType: "admin-client",
        message: message.trim(),
      });

      // Notify admins about the new message
      io.to("admin:lobby").emit("newClientMessage", {
        _id: savedMessage._id,
        chatId,
        message: savedMessage.message,
        senderId: chatId,
        senderRole: "client",
        chatType: "admin-client",
        createdAt: savedMessage.createdAt,
      });

      // Confirm delivery back to sender
      socket.emit("messageSaved", {
        tempId: data.tempId,
        _id: savedMessage._id,
        status: "sent",
      });

      // Create notification for admins
      createChatNotification(io, chatId, message);

      // Push updated unread count to admins
      pushUnreadCount(io);
    } catch (err) {
      console.error("[Client Socket] Error handling message:", err);
      socket.emit("messageError", {
        error: "Failed to process message",
        tempId: data.tempId,
      });
    }
  });

  // Handle typing indicator
  socket.on("typing", () => {
    io.to("admin:lobby").emit("clientTyping", { chatId });
  });

  socket.on("stopTyping", () => {
    io.to("admin:lobby").emit("clientStopTyping", { chatId });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`[Client Socket] Client disconnected: ${chatId}`);
    io.to("admin:lobby").emit("clientDisconnected", { chatId });
  });
}

module.exports = { registerClientHandlers };
