const { verifyToken } = require("@/utils/jwt");
const chatService = require("@/modules/chat/chat.service");

// Track connected admins: Map<adminId, Set<socketId>>
const connectedAdmins = new Map();

/**
 * Handle admin socket connections
 * Admins must authenticate via token
 */
function registerAdminHandlers(io, socket, adminData) {
  const adminId = adminData.id;
  const adminName = adminData.name || "Admin";

  // Track admin connection
  if (!connectedAdmins.has(adminId)) {
    connectedAdmins.set(adminId, new Set());
  }
  connectedAdmins.get(adminId).add(socket.id);

  // Join admin lobby (receives all client messages)
  socket.join("admin:lobby");
  console.log(`[Admin Socket] Admin ${adminName} (${adminId}) joined admin:lobby`);

  // Join admin-to-admin room
  socket.join(`admin:${adminId}`);

  // Notify other admins that this admin is online
  socket.to("admin:lobby").emit("adminOnline", {
    adminId,
    adminName,
  });

  // ─── Admin joins a specific client chat room ───
  socket.on("joinChat", (data) => {
    const { chatId } = data;
    const roomName = `chat:${chatId}`;
    socket.join(roomName);
    console.log(`[Admin Socket] Admin ${adminName} joined chat room: ${roomName}`);
  });

  socket.on("leaveChat", (data) => {
    const { chatId } = data;
    const roomName = `chat:${chatId}`;
    socket.leave(roomName);
    console.log(`[Admin Socket] Admin ${adminName} left chat room: ${roomName}`);
  });

  // ─── Admin sends message to client ───
  socket.on("sendMessageToClient", async (data) => {
    try {
      const { chatId, message, _id } = data;

      if (!message || !message.trim()) return;

      console.log(`[Admin Socket] Admin ${adminName} -> Client ${chatId}:`, message);

      if (_id) {
        // Message already saved via REST, just broadcast
        const roomName = `chat:${chatId}`;

        // Send to the client
        io.to(roomName).emit("receiveMessage", {
          _id,
          chatId,
          message,
          senderId: adminId,
          senderRole: "admin",
          chatType: "admin-client",
          createdAt: new Date().toISOString(),
        });

        // Notify other admins watching this chat
        socket.to("admin:lobby").emit("adminMessageSent", {
          _id,
          chatId,
          message,
          senderId: adminId,
          senderName: adminName,
          senderRole: "admin",
          chatType: "admin-client",
          createdAt: new Date().toISOString(),
        });
        return;
      }

      // Fallback: save if not already persisted
      const savedMessage = await chatService.saveMessage({
        chatId,
        senderId: adminId,
        senderRole: "admin",
        receiverId: chatId,
        chatType: "admin-client",
        message: message.trim(),
      });

      const roomName = `chat:${chatId}`;
      io.to(roomName).emit("receiveMessage", {
        _id: savedMessage._id,
        chatId,
        message: savedMessage.message,
        senderId: adminId,
        senderRole: "admin",
        chatType: "admin-client",
        createdAt: savedMessage.createdAt,
      });

      socket.to("admin:lobby").emit("adminMessageSent", {
        _id: savedMessage._id,
        chatId,
        message: savedMessage.message,
        senderId: adminId,
        senderName: adminName,
        senderRole: "admin",
        chatType: "admin-client",
        createdAt: savedMessage.createdAt,
      });

      socket.emit("messageSaved", {
        tempId: data.tempId,
        _id: savedMessage._id,
        status: "sent",
      });
    } catch (err) {
      console.error("[Admin Socket] Error sending to client:", err);
      socket.emit("messageError", {
        error: "Failed to send message",
        tempId: data.tempId,
      });
    }
  });

  // ─── Admin-to-Admin messaging ───
  socket.on("sendMessageToAdmin", async (data) => {
    try {
      const { chatId, message, receiverId, _id } = data;

      if (!message || !message.trim() || !receiverId) return;

      console.log(`[Admin Socket] Admin ${adminName} -> Admin ${receiverId}:`, message);

      if (_id) {
        io.to(`admin:${receiverId}`).emit("receiveAdminMessage", {
          _id,
          chatId,
          message,
          senderId: adminId,
          senderName: adminName,
          senderRole: "admin",
          chatType: "admin-admin",
          createdAt: new Date().toISOString(),
        });

        // Also send back to sender (for multi-tab)
        socket.emit("receiveAdminMessage", {
          _id,
          chatId,
          message,
          senderId: adminId,
          senderName: adminName,
          senderRole: "admin",
          chatType: "admin-admin",
          createdAt: new Date().toISOString(),
        });
        return;
      }

      const savedMessage = await chatService.saveMessage({
        chatId,
        senderId: adminId,
        senderRole: "admin",
        receiverId,
        chatType: "admin-admin",
        message: message.trim(),
      });

      io.to(`admin:${receiverId}`).emit("receiveAdminMessage", {
        _id: savedMessage._id,
        chatId,
        message: savedMessage.message,
        senderId: adminId,
        senderName: adminName,
        senderRole: "admin",
        chatType: "admin-admin",
        createdAt: savedMessage.createdAt,
      });

      socket.emit("messageSaved", {
        tempId: data.tempId,
        _id: savedMessage._id,
        status: "sent",
      });
    } catch (err) {
      console.error("[Admin Socket] Error sending to admin:", err);
      socket.emit("messageError", {
        error: "Failed to send message",
        tempId: data.tempId,
      });
    }
  });

  // ─── Typing indicators ───
  socket.on("adminTyping", (data) => {
    const { chatId } = data;
    io.to(`chat:${chatId}`).emit("adminTyping", { adminId, adminName });
  });

  socket.on("adminStopTyping", (data) => {
    const { chatId } = data;
    io.to(`chat:${chatId}`).emit("adminStopTyping", { adminId });
  });

  // ─── Mark messages as read ───
  socket.on("markAsRead", async (data) => {
    const { chatId } = data;
    try {
      await chatService.markAsRead(chatId);

      // Notify the client chat room that messages were read
      io.to(`chat:${chatId}`).emit("messagesRead", {
        chatId,
        readBy: adminId,
      });

      // Send updated unread count to ALL admins
      const unreadCount = await chatService.getUnreadSessionCount();
      io.to("admin:lobby").emit("unreadCountUpdate", { chatUnread: unreadCount });
    } catch (err) {
      console.error("[Admin Socket] Error marking as read:", err);
    }
  });

  // ─── Disconnect ───
  socket.on("disconnect", () => {
    console.log(`[Admin Socket] Admin ${adminName} (${adminId}) disconnected`);

    const adminSockets = connectedAdmins.get(adminId);
    if (adminSockets) {
      adminSockets.delete(socket.id);
      if (adminSockets.size === 0) {
        connectedAdmins.delete(adminId);
        // Only emit offline if all tabs/devices disconnected
        io.to("admin:lobby").emit("adminOffline", { adminId, adminName });
      }
    }
  });
}

function getConnectedAdmins() {
  return Array.from(connectedAdmins.keys());
}

module.exports = { registerAdminHandlers, getConnectedAdmins };
