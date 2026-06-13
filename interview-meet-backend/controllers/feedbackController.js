import Feedback from '../models/Feedback.js';
import Interview from '../models/Interview.js';
import AppError from '../utils/errorHandler.js';
import { createNotification } from '../utils/notificationHelper.js';

// @desc    Submit feedback for an interview (HR only)
// @route   POST /api/feedback
export const submitFeedback = async (req, res, next) => {
  try {
    const { interviewId, rating, comment } = req.body;
    const hrId = req.user.id;

    // Validate required fields
    if (!interviewId || !rating || !comment) {
      return next(new AppError('Interview ID, rating, and comment are required', 400));
    }
    if (rating < 1 || rating > 5) {
      return next(new AppError('Rating must be between 1 and 5', 400));
    }

    // Find interview and verify HR owns it
    const interview = await Interview.findById(interviewId);
    if (!interview) return next(new AppError('Interview not found', 404));
    if (interview.hrId.toString() !== hrId && req.user.role !== 'Admin') {
      return next(new AppError('Only the HR who conducted the interview can submit feedback', 403));
    }

    // Check if feedback already exists
    const existing = await Feedback.findOne({ interviewId });
    if (existing) return next(new AppError('Feedback already submitted for this interview', 400));

    // Create feedback
    const feedback = await Feedback.create({
      interviewId,
      hrId,
      candidateId: interview.candidateId,
      rating,
      comment,
    });

    // Notify candidate (optional)
    await createNotification(
      interview.candidateId,
      'interview_update',
      'Feedback Received',
      `The HR has provided feedback for your interview: "${interview.position}".`,
      interviewId
    );

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback for an interview (candidate can view, HR/admin can view)
// @route   GET /api/feedback/:interviewId
export const getFeedback = async (req, res, next) => {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const interview = await Interview.findById(interviewId);
    if (!interview) return next(new AppError('Interview not found', 404));

    // Only candidate, HR of that interview, or admin can view feedback
    if (
      userRole !== 'Admin' &&
      interview.candidateId.toString() !== userId &&
      interview.hrId.toString() !== userId
    ) {
      return next(new AppError('Not authorized to view feedback', 403));
    }

    const feedback = await Feedback.findOne({ interviewId }).populate('hrId candidateId', 'name email');
    if (!feedback) return res.status(200).json({ success: true, feedback: null });

    res.status(200).json({ success: true, feedback });
  } catch (error) {
    next(error);
  }
};