import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { submitFeedback, getFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

router.use(protect);

// HR only can submit feedback
router.post('/', authorize('HR'), submitFeedback);
// Anyone authorized (candidate/HR/admin) can view
router.get('/:interviewId', getFeedback);

export default router;