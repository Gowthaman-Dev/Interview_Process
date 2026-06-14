import Notification from '../models/Notification.js';
import { getIO } from '../sockets/index.js';

// Create a notification and emit via socket to the user
export const createNotification = async (userId, type, title, message, relatedInterviewId = null) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      relatedInterviewId,
    });

    // Emit to user's personal socket room
    const io = getIO();
    io.to(userId.toString()).emit('new-notification', notification);

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Bulk create notifications for multiple users
export const createBulkNotifications = async (users, type, title, message, relatedInterviewId = null) => {
  const notifications = users.map(userId => ({
    userId,
    type,
    title,
    message,
    relatedInterviewId,
  }));

  const created = await Notification.insertMany(notifications);

  // Emit to each user
  const io = getIO();
  created.forEach(notif => {
    io.to(notif.userId.toString()).emit('new-notification', notif);
  });

  return created;
};