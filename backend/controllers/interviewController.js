import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import Interview from '../models/Interview.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import AppError from '../utils/errorHandler.js';

// Helper: check if a user is busy at given date/time (excluding optional interviewId)
const isUserBusy = async (userId, date, time, excludeInterviewId = null) => {
  const query = {
    $or: [{ candidateId: userId }, { hrId: userId }],
    date: new Date(date),
    time,
    status: { $in: ['Scheduled', 'InProgress'] },
  };
  if (excludeInterviewId) query._id = { $ne: excludeInterviewId };
  const existing = await Interview.findOne(query);
  return !!existing;
};

// ========== CREATE INTERVIEW ==========
export const createInterview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

    const { candidateId, position, date, time, duration } = req.body;
    const hrId = req.user.id;

    const hrUser = await User.findById(hrId);
    if (!hrUser || hrUser.role !== 'HR') {
      return next(new AppError('Only HR users can create interviews', 403));
    }

    const candidate = await User.findById(candidateId);
    if (!candidate || candidate.isDeleted) return next(new AppError('Candidate not found', 404));

    const candidateBusy = await isUserBusy(candidateId, date, time);
    if (candidateBusy) return next(new AppError('Candidate already booked at this date/time', 409));
    const hrBusy = await isUserBusy(hrId, date, time);
    if (hrBusy) return next(new AppError('HR already has an interview scheduled at this time', 409));

    const meetLink = `https://meet.interviewmeet.com/${uuidv4()}`;
    const interview = await Interview.create({
      candidateId,
      hrId,
      position,
      date: new Date(date),
      time,
      duration: duration || 60,
      meetLink,
    });

    const msg = `Interview scheduled for ${position} on ${new Date(date).toDateString()} at ${time}`;
    await Notification.create({ userId: candidateId, type: 'interview_update', title: 'New Interview', message: msg, relatedInterviewId: interview._id });
    await Notification.create({ userId: hrId, type: 'interview_update', title: 'Interview Created', message: msg, relatedInterviewId: interview._id });

    res.status(201).json({ success: true, interview, meetLink });
  } catch (error) { next(error); }
};

// ========== GET INTERVIEWS (with pagination & role filtering) ==========
export const getInterviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'HR') {
      filter.hrId = userId;
    } else if (userRole === 'Candidate') {
      filter.candidateId = userId;
    } else if (userRole === 'Admin') {
      // Admin sees all
    } else {
      return next(new AppError('Unauthorized', 403));
    }

    const interviews = await Interview.find(filter)
      .populate('candidateId', 'name email')
      .populate('hrId', 'name email')
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Interview.countDocuments(filter);

    res.status(200).json({
      success: true,
      interviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

// ========== GET SINGLE INTERVIEW ==========
export const getInterviewById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const interview = await Interview.findById(id)
      .populate('candidateId', 'name email skills')
      .populate('hrId', 'name email');

    if (!interview) return next(new AppError('Interview not found', 404));

    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole !== 'Admin' && interview.candidateId._id.toString() !== userId && interview.hrId._id.toString() !== userId) {
      return next(new AppError('Not authorized to view this interview', 403));
    }

    res.status(200).json({ success: true, interview });
  } catch (error) { next(error); }
};

// ========== UPDATE INTERVIEW (Cancel / Reschedule) ==========
export const updateInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, date, time } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const interview = await Interview.findById(id);
    if (!interview) return next(new AppError('Interview not found', 404));

    // Allow any HR or Admin to modify (relaxed for testing)
    if (userRole !== 'Admin' && userRole !== 'HR') {
      return next(new AppError('Only HR users can modify interviews', 403));
    }

    if (action === 'cancel') {
      if (interview.status === 'Cancelled') return next(new AppError('Interview already cancelled', 400));
      interview.status = 'Cancelled';
      await interview.save();

      const cancelMsg = `Interview for ${interview.position} on ${interview.date.toDateString()} at ${interview.time} has been cancelled.`;
      await Notification.create({ userId: interview.candidateId, type: 'interview_update', title: 'Interview Cancelled', message: cancelMsg, relatedInterviewId: interview._id });
      await Notification.create({ userId: interview.hrId, type: 'interview_update', title: 'Interview Cancelled', message: cancelMsg, relatedInterviewId: interview._id });

      return res.status(200).json({ success: true, message: 'Interview cancelled', interview });
    }

    if (action === 'reschedule') {
      if (!date || !time) return next(new AppError('New date and time are required for rescheduling', 400));
      if (interview.status === 'Cancelled') return next(new AppError('Cannot reschedule a cancelled interview', 400));

      const candidateBusy = await isUserBusy(interview.candidateId, date, time, id);
      if (candidateBusy) return next(new AppError('Candidate already booked at the new date/time', 409));
      const hrBusy = await isUserBusy(interview.hrId, date, time, id);
      if (hrBusy) return next(new AppError('HR already has an interview scheduled at the new date/time', 409));

      interview.date = new Date(date);
      interview.time = time;
      await interview.save();

      const rescheduleMsg = `Interview for ${interview.position} rescheduled to ${new Date(date).toDateString()} at ${time}.`;
      await Notification.create({ userId: interview.candidateId, type: 'interview_update', title: 'Interview Rescheduled', message: rescheduleMsg, relatedInterviewId: interview._id });
      await Notification.create({ userId: interview.hrId, type: 'interview_update', title: 'Interview Rescheduled', message: rescheduleMsg, relatedInterviewId: interview._id });

      return res.status(200).json({ success: true, message: 'Interview rescheduled', interview });
    }

    return next(new AppError('Invalid action. Use "cancel" or "reschedule"', 400));
  } catch (error) { next(error); }
};

// ========== END INTERVIEW (capture duration & notify both parties via socket) ==========
export const endInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const interview = await Interview.findById(id);
    if (!interview) return next(new AppError('Interview not found', 404));

    if (userRole !== 'Admin' && interview.candidateId.toString() !== userId && interview.hrId.toString() !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    if (interview.status !== 'InProgress') {
      return next(new AppError('Interview is not in progress', 400));
    }

    const endTime = new Date();
    interview.meetingEndedAt = endTime;
    interview.status = 'Completed';
    interview.waitingRoomStatus = undefined;

    if (interview.meetingStartedAt) {
      const durationMs = endTime - interview.meetingStartedAt;
      interview.duration = Math.round(durationMs / (1000 * 60));
    }

    await interview.save();

    const msg = `Interview for ${interview.position} has ended. Duration: ${interview.duration} minutes.`;
    await Notification.create({ userId: interview.candidateId, type: 'interview_update', title: 'Interview Ended', message: msg, relatedInterviewId: interview._id });
    await Notification.create({ userId: interview.hrId, type: 'interview_update', title: 'Interview Ended', message: msg, relatedInterviewId: interview._id });

    // ✅ Emit socket event to both participants
    const io = req.app.get('io');
    if (io) {
      io.to(interview.candidateId.toString()).emit('call-ended', { interviewId: interview._id });
      io.to(interview.hrId.toString()).emit('call-ended', { interviewId: interview._id });
    }

    res.status(200).json({ success: true, message: 'Interview ended', duration: interview.duration });
  } catch (error) { next(error); }
};