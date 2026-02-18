const { getMessageModel, getChatSessionModel } = require("./chat.model");

/**
 * Log message details to console
 */
function logMessage({ senderId, senderRole, receiverId, message, timestamp }) {
  console.log("─── Chat Message Log ───");
  console.log("Sender ID   :", senderId);
  console.log("Sender Role :", senderRole);
  console.log("Receiver ID :", receiverId || "N/A (broadcast)");
  console.log("Message     :", message);
  console.log("Timestamp   :", timestamp);
  console.log("────────────────────────");
}

/**
 * Save a message to database and update the chat session
 */
async function saveMessage({
  chatId,
  senderId,
  senderRole,
  receiverId,
  chatType,
  message,
}) {
  const Message = getMessageModel();
  const ChatSession = getChatSessionModel();

  const timestamp = new Date();

  // Step 1: Log
  logMessage({ senderId, senderRole, receiverId, message, timestamp });

  // Step 2: Save message
  const savedMessage = await Message.create({
    chatId,
    senderId,
    senderRole,
    receiverId,
    chatType,
    message,
  });

  // Step 3: Update or create chat session
  const isClientMessage = senderRole === "client";
  await ChatSession.findOneAndUpdate(
    { chatId },
    {
      $set: {
        chatType,
        lastMessage: {
          message,
          senderId,
          timestamp: savedMessage.createdAt,
        },
        isActive: true,
        // Mark as unread when client sends a message
        ...(isClientMessage && { isFullyRead: false }),
      },
    },
    { upsert: true, new: true }
  );

  return savedMessage;
}

/**
 * Get messages for a chat (paginated)
 */
async function getMessages(chatId, { page = 1, limit = 50 } = {}) {
  const Message = getMessageModel();

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments({ chatId }),
  ]);

  return {
    messages: messages.reverse(),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
  };
}

/**
 * Get or create a chat session for client chat
 */
async function getOrCreateClientSession(chatId, clientName) {
  const ChatSession = getChatSessionModel();

  let session = await ChatSession.findOne({ chatId }).lean();

  if (!session) {
    session = await ChatSession.create({
      chatId,
      chatType: "admin-client",
      participants: [
        {
          userId: chatId,
          role: "client",
          name: clientName || "Anonymous Client",
        },
      ],
      lastMessage: {},
      isActive: true,
    });
  }

  return session;
}

/**
 * Get all active chat sessions (for admin panel)
 */
async function getActiveSessions({ chatType, page = 1, limit = 20 } = {}) {
  const ChatSession = getChatSessionModel();

  const filter = { isActive: true };
  if (chatType) filter.chatType = chatType;

  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    ChatSession.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ChatSession.countDocuments(filter),
  ]);

  return {
    sessions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Mark a chat as fully read
 */
async function markAsRead(chatId) {
  const Message = getMessageModel();
  const ChatSession = getChatSessionModel();

  // Mark all client messages in this chat as read
  await Message.updateMany(
    { chatId, senderRole: "client", status: { $ne: "read" } },
    { $set: { status: "read" } }
  );

  // Mark the session as fully read
  await ChatSession.findOneAndUpdate(
    { chatId },
    { $set: { isFullyRead: true } }
  );

  return { success: true };
}

/**
 * Update message status
 */
async function updateMessageStatus(messageId, status) {
  const Message = getMessageModel();
  return Message.findByIdAndUpdate(messageId, { status }, { new: true });
}

/**
 * Get count of unread chat sessions (chats with unread client messages)
 */
async function getUnreadSessionCount() {
  const ChatSession = getChatSessionModel();
  return ChatSession.countDocuments({ isActive: true, isFullyRead: false });
}

module.exports = {
  saveMessage,
  getMessages,
  getOrCreateClientSession,
  getActiveSessions,
  markAsRead,
  updateMessageStatus,
  getUnreadSessionCount,
  logMessage,
};
