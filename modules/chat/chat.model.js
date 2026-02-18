const { getChatConnection } = require("@/config/db");
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["admin", "client"],
      required: true,
    },
    receiverId: {
      type: String,
      default: null,
    },
    chatType: {
      type: String,
      enum: ["admin-client", "admin-admin"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient chat history queries
messageSchema.index({ chatId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1, senderRole: 1 });
messageSchema.index({ receiverId: 1 });

const chatSessionSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
      required: true,
      unique: true,
    },
    chatType: {
      type: String,
      enum: ["admin-client", "admin-admin"],
      required: true,
    },
    participants: [
      {
        userId: { type: String, required: true },
        role: { type: String, enum: ["admin", "client"], required: true },
        name: { type: String, default: "Anonymous" },
      },
    ],
    lastMessage: {
      message: { type: String, default: "" },
      senderId: { type: String, default: null },
      timestamp: { type: Date, default: null },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFullyRead: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

chatSessionSchema.index({ chatType: 1, isActive: 1 });
chatSessionSchema.index({ "participants.userId": 1 });
chatSessionSchema.index({ updatedAt: -1 });

let Message;
let ChatSession;

const getMessageModel = () => {
  if (!Message) {
    const chatConn = getChatConnection();
    Message = chatConn.model("Message", messageSchema);
  }
  return Message;
};

const getChatSessionModel = () => {
  if (!ChatSession) {
    const chatConn = getChatConnection();
    ChatSession = chatConn.model("ChatSession", chatSessionSchema);
  }
  return ChatSession;
};

module.exports = { getMessageModel, getChatSessionModel };
