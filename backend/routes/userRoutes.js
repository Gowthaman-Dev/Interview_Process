import express from 'express';
import { protect } from '../middlewares/auth.js';
import { uploadResume as uploadResumeMiddleware } from '../middlewares/uploadMiddleware.js';
import {
  updateProfile,
  uploadResume,
  searchUsers,
  deleteAccount,
  getProfile,
  deleteResume, // ✅ added
} from '../controllers/userController.js';

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/resume', uploadResumeMiddleware, uploadResume);
router.delete('/resume', deleteResume); // ✅ new route
router.get('/search', searchUsers);
router.delete('/account', deleteAccount);

export default router;