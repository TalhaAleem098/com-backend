const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: String, required: true },
    senderType: { type: String, enum: ["customer", "admin"], required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
module.exports = chatConnection.model("Message", messageSchema);