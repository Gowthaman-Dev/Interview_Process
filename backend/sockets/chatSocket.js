import Message from '../models/Message.js';

export default (io, socket) => {
  // Join a chat room (interview room)
  socket.on('join-chat-room', (roomId) => {
    socket.join(`chat_${roomId}`);
    console.log(`User ${socket.user.email} joined chat room ${roomId}`);
  });

  // Send a message
  socket.on('send-message', async ({ roomId, message, messageType = 'text', clientTempId }) => {
    try {
      const newMessage = await Message.create({
        senderId: socket.user._id,
        roomId,
        message,
        messageType,
        isRead: false,
      });

      // Populate sender details for immediate display
      const populatedMessage = await Message.findById(newMessage._id).populate('senderId', 'name email');

      // ✅ Include clientTempId in the broadcast payload
      io.to(`chat_${roomId}`).emit('receive-message', {
        ...populatedMessage.toObject(),
        clientTempId, // echo back the temporary ID for optimistic replacement
      });

      socket.to(`chat_${roomId}`).emit('new-message-notification', { roomId });
    } catch (err) {
      console.error('Send message error:', err);
      socket.emit('chat-error', 'Failed to send message');
    }
  });

  // Mark messages as read for a room
  socket.on('mark-as-read', async ({ roomId }) => {
    try {
      await Message.updateMany(
        { roomId, isRead: false, senderId: { $ne: socket.user._id } },
        { $set: { isRead: true, readAt: new Date() } }
      );
      socket.to(`chat_${roomId}`).emit('messages-read', { userId: socket.user._id, roomId });
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  });
};