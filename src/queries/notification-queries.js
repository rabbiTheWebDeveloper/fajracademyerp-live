import { dbConnect } from "@/service/mongo";
import { NotificationModel } from "@/model/notification-model";

/**
 * Get notifications for a user (global + targeted)
 */
export async function getAllNotifications({
  userId = null,
  page = 1,
  limit = 20,
} = {}) {
  await dbConnect();

  const query = {
    $or: [
      { isGlobal: true },
      ...(userId ? [{ recipients: userId }] : []),
    ],
  };

  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NotificationModel.countDocuments(query),
  ]);

  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Create a new notification
 */
export async function createNotification(data) {
  await dbConnect();
  const notification = new NotificationModel(data);
  await notification.save();
  return notification.toObject();
}

/**
 * Mark a notification as read by a user
 */
export async function markNotificationAsRead(notificationId, userId) {
  await dbConnect();
  return NotificationModel.findByIdAndUpdate(
    notificationId,
    { $addToSet: { readBy: userId } },
    { new: true }
  ).lean();
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId) {
  await dbConnect();
  const query = {
    $or: [{ isGlobal: true }, { recipients: userId }],
    readBy: { $ne: userId },
  };
  await NotificationModel.updateMany(query, { $addToSet: { readBy: userId } });
  return { success: true };
}

/**
 * Get unread count for a user
 */
export async function getUnreadNotificationCount(userId) {
  await dbConnect();
  const count = await NotificationModel.countDocuments({
    $or: [{ isGlobal: true }, { recipients: userId }],
    readBy: { $ne: userId },
  });
  return count;
}

/**
 * Delete a notification
 */
export async function deleteNotification(id) {
  await dbConnect();
  await NotificationModel.findByIdAndDelete(id);
  return { success: true };
}
