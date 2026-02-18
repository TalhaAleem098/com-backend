const { getChatConnection } = require("@/config/db");
const mongoose = require("mongoose");

// ─── Notification Schema ───
const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ["admin", "coadmin", "employee"],
      default: "admin",
    },
    type: {
      type: String,
      enum: ["chat", "order", "system", "push"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
  },
  { timestamps: true }
);

// Compound index for efficient queries
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

// ─── Push Subscription Schema ───
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: ["admin", "coadmin", "employee", "client"],
      default: "admin",
    },
    subscription: {
      endpoint: { type: String, required: true, unique: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ensure one subscription per endpoint
pushSubscriptionSchema.index({ "subscription.endpoint": 1 }, { unique: true });

// ─── Lazy-loaded Models ───
let NotificationModel = null;
let PushSubscriptionModel = null;

function getNotificationModel() {
  if (!NotificationModel) {
    const conn = getChatConnection(); // Reuse chat DB connection
    NotificationModel = conn.model("Notification", notificationSchema);
  }
  return NotificationModel;
}

function getPushSubscriptionModel() {
  if (!PushSubscriptionModel) {
    const conn = getChatConnection();
    PushSubscriptionModel = conn.model("PushSubscription", pushSubscriptionSchema);
  }
  return PushSubscriptionModel;
}

module.exports = { getNotificationModel, getPushSubscriptionModel };
