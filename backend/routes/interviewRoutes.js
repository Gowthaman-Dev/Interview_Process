import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middlewares/auth.js';
import {
  createInterview,
  getInterviews,
  getInterviewById,
  updateInterview,
  endInterview,
} from '../controllers/interviewController.js';
import Interview from '../models/Interview.js';

const router = express.Router();

// Validation for creating interview
const createValidation = [
  body('candidateId').notEmpty().isMongoId(),
  body('position').notEmpty(),
  body('date').notEmpty().isISO8601(),
  body('time').notEmpty(),
  body('duration').optional().isInt({ min: 15, max: 180 }),
];

// All routes require authentication
router.use(protect);

// GET /api/interviews
router.get('/', getInterviews);

// POST /api/interviews (HR only)
router.post('/', authorize('HR'), createValidation, createInterview);

// GET /api/interviews/:id
router.get('/:id', getInterviewById);

// PUT /api/interviews/:id (cancel/reschedule)
router.put('/:id', updateInterview);

// POST /api/interviews/:id/end (end interview)
router.post('/:id/end', endInterview);

// ========== HTTP ACCEPT ENDPOINT (used by floating card & manual accept) ==========
router.post('/:id/accept', protect, async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Only HR can accept interviews' });
    }

    // ✅ Set meetingStartedAt when accepting via HTTP
    interview.waitingRoomStatus = 'Accepted';
    interview.status = 'InProgress';
    interview.meetingStartedAt = new Date();
    await interview.save();

    const io = req.app.get('io');
    io.to(interview.candidateId.toString()).emit('hr-accepted', {
      interviewId: interview._id,
      meetLink: interview.meetLink,
    });

    res.json({ success: true, message: 'Candidate accepted', interviewId: interview._id });
  } catch (err) {
    next(err);
  }
});

// ========== HTTP JOIN ENDPOINT (candidate joins waiting room) ==========
router.post('/:id/join', protect, async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    if (req.user.role !== 'Candidate' || interview.candidateId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const io = req.app.get('io');
    io.to(interview.hrId.toString()).emit('candidate-waiting', {
      interviewId: interview._id,
      candidateName: req.user.name,
      position: interview.position,
    });

    interview.waitingRoomStatus = 'Waiting';
    await interview.save();

    res.json({ success: true, message: 'Joined waiting room' });
  } catch (err) {
    next(err);
  }
});

export default router;