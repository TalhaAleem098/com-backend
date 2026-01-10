const mongoose = require("mongoose");
const { getChatConnection } = require("../../config/db");

const chatConnection = getChatConnection();

const conversationSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true }, 
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

conversationSchema.index({ customerId: 1 });
conversationSchema.index({ createdAt: -1 });

module.exports = chatConnection.model("Conversation", conversationSchema);
