import Message from '../models/Message.js';
import Interview from '../models/Interview.js';
import AppError from '../utils/errorHandler.js';

// @desc    Get messages for a specific interview (room) with pagination
// @route   GET /api/chat/:roomId/messages?page=1&limit=50
export const getMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify that the user is part of this interview
    const interview = await Interview.findById(roomId);
    if (!interview) return next(new AppError('Interview not found', 404));

    const userId = req.user.id;
    if (interview.candidateId.toString() !== userId && interview.hrId.toString() !== userId && req.user.role !== 'Admin') {
      return next(new AppError('Not authorized to view messages for this interview', 403));
    }

    const messages = await Message.find({ roomId })
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ roomId });

    res.status(200).json({
      success: true,
      messages: messages.reverse(), // return in chronological order
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all messages as read for a room (optional convenience endpoint)
// @route   PUT /api/chat/:roomId/read
export const markAllAsRead = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const interview = await Interview.findById(roomId);
    if (!interview) return next(new AppError('Interview not found', 404));
    if (interview.candidateId.toString() !== userId && interview.hrId.toString() !== userId && req.user.role !== 'Admin') {
      return next(new AppError('Not authorized', 403));
    }

    await Message.updateMany(
      { roomId, isRead: false, senderId: { $ne: userId } },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({ success: true, message: 'All messages marked as read' });
  } catch (error) {
    next(error);
  }
};