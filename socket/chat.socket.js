const chatService = require("@/modules/chat/chat.service");

/**
 * Shared chat socket utilities
 * Common handlers used by both admin and client sockets
 */

/**
 * Handle message status updates
 */
function registerChatHandlers(io, socket) {
  // Message delivered acknowledgment
  socket.on("messageDelivered", async (data) => {
    try {
      const { messageId } = data;
      if (messageId) {
        await chatService.updateMessageStatus(messageId, "delivered");
      }
    } catch (err) {
      console.error("[Chat Socket] Error updating delivery status:", err);
    }
  });

  // Message read acknowledgment
  socket.on("messageRead", async (data) => {
    try {
      const { messageId, chatId, readBy } = data;
      if (messageId) {
        await chatService.updateMessageStatus(messageId, "read");
        // Notify the sender that their message was read
        io.to(`chat:${chatId}`).emit("messageStatusUpdate", {
          messageId,
          status: "read",
          readBy,
        });
      }
    } catch (err) {
      console.error("[Chat Socket] Error updating read status:", err);
    }
  });
}

module.exports = { registerChatHandlers };
