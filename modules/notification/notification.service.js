const {
  getNotificationModel,
  getPushSubscriptionModel,
} = require("./notification.model");
const webpush = require("web-push");

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  "mailto:admin@commerce.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ─── Notification CRUD ───

/**
 * Create a notification
 */
async function createNotification({
  recipientId,
  recipientRole = "admin",
  type,
  title,
  message,
  data = {},
}) {
  const Notification = getNotificationModel();

  const notification = await Notification.create({
    recipientId,
    recipientRole,
    type,
    title,
    message,
    data,
  });

  return notification;
}

/**
 * Get notifications for a user (paginated)
 */
async function getNotifications(
  recipientId,
  { page = 1, limit = 20, type, unreadOnly = false } = {}
) {
  const Notification = getNotificationModel();

  const filter = { recipientId };
  if (type) filter.type = type;
  if (unreadOnly) filter.isRead = false;

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get unread notification count
 */
async function getUnreadCount(recipientId) {
  const Notification = getNotificationModel();
  return Notification.countDocuments({ recipientId, isRead: false });
}

/**
 * Mark notification(s) as read
 */
async function markAsRead(recipientId, notificationId) {
  const Notification = getNotificationModel();

  if (notificationId) {
    // Mark a single notification as read
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipientId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
  }

  // Mark all as read
  return Notification.updateMany(
    { recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
}

/**
 * Delete old notifications (cleanup)
 */
async function deleteOldNotifications(daysOld = 30) {
  const Notification = getNotificationModel();
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return Notification.deleteMany({ createdAt: { $lt: cutoff }, isRead: true });
}

// ─── Push Subscription Management ───

/**
 * Save or update a push subscription (prevents duplicates)
 */
async function savePushSubscription({ userId, userRole = "admin", subscription }) {
  const PushSubscription = getPushSubscriptionModel();

  // Upsert by endpoint — prevents duplicate subscriptions
  const result = await PushSubscription.findOneAndUpdate(
    { "subscription.endpoint": subscription.endpoint },
    {
      $set: {
        userId,
        userRole,
        subscription,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  return result;
}

/**
 * Remove a push subscription
 */
async function removePushSubscription(endpoint) {
  const PushSubscription = getPushSubscriptionModel();
  return PushSubscription.findOneAndUpdate(
    { "subscription.endpoint": endpoint },
    { $set: { isActive: false } }
  );
}

/**
 * Send push notification to a specific user
 */
async function sendPushToUser(userId, payload) {
  const PushSubscription = getPushSubscriptionModel();

  const subscriptions = await PushSubscription.find({
    userId,
    isActive: true,
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify(payload)
        );
        return { success: true, endpoint: sub.subscription.endpoint };
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired or no longer valid
          await PushSubscription.findByIdAndUpdate(sub._id, {
            isActive: false,
          });
        }
        return { success: false, endpoint: sub.subscription.endpoint, error: err.message };
      }
    })
  );

  return results;
}

/**
 * Send push notification to all admins
 */
async function sendPushToAllAdmins(payload) {
  const PushSubscription = getPushSubscriptionModel();

  const subscriptions = await PushSubscription.find({
    userRole: { $in: ["admin", "coadmin"] },
    isActive: true,
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify(payload)
        );
        return { success: true };
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.findByIdAndUpdate(sub._id, {
            isActive: false,
          });
        }
        return { success: false, error: err.message };
      }
    })
  );

  return results;
}

module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteOldNotifications,
  savePushSubscription,
  removePushSubscription,
  sendPushToUser,
  sendPushToAllAdmins,
};
