import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { addNote, getNotes } from '../controllers/noteController.js';

const router = express.Router();

router.use(protect);

// HR only can add notes
router.post('/', authorize('HR'), addNote);
// HR only can view notes (candidate cannot see internal notes)
router.get('/:interviewId', authorize('HR'), getNotes);

export default router;