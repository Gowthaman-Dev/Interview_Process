import InterviewNote from '../models/InterviewNote.js';
import Interview from '../models/Interview.js';
import AppError from '../utils/errorHandler.js';

// @desc    Add a note to an interview (HR only)
// @route   POST /api/notes
export const addNote = async (req, res, next) => {
  try {
    const { interviewId, note } = req.body;
    const hrId = req.user.id;

    if (!interviewId || !note) {
      return next(new AppError('Interview ID and note are required', 400));
    }

    // Verify HR owns the interview
    const interview = await Interview.findById(interviewId);
    if (!interview) return next(new AppError('Interview not found', 404));
    if (interview.hrId.toString() !== hrId && req.user.role !== 'Admin') {
      return next(new AppError('Only the HR who conducted the interview can add notes', 403));
    }

    const newNote = await InterviewNote.create({
      interviewId,
      hrId,
      note,
    });

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      note: newNote,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all notes for an interview (HR only)
// @route   GET /api/notes/:interviewId
export const getNotes = async (req, res, next) => {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const interview = await Interview.findById(interviewId);
    if (!interview) return next(new AppError('Interview not found', 404));

    // Only the HR who owns the interview or admin can view notes
    if (userRole !== 'Admin' && interview.hrId.toString() !== userId) {
      return next(new AppError('Not authorized to view notes', 403));
    }

    const notes = await InterviewNote.find({ interviewId })
      .sort({ createdAt: -1 })
      .populate('hrId', 'name email');

    res.status(200).json({ success: true, notes });
  } catch (error) {
    next(error);
  }
};