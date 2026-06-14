import express from 'express';
import { protect } from '../middlewares/auth.js';
import { uploadResume as uploadResumeMiddleware } from '../middlewares/uploadMiddleware.js';
import {
  updateProfile,
  uploadResume,
  searchUsers,
  deleteAccount,
  getProfile,
} from '../controllers/userController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/resume', uploadResumeMiddleware, uploadResume);
router.get('/search', searchUsers);
router.delete('/account', deleteAccount);

export default router;