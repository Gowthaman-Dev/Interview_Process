import express from 'express';
import { protect } from '../middlewares/auth.js';
import { getMessages, markAllAsRead } from '../controllers/chatController.js';

const router = express.Router();

router.use(protect);

router.get('/:roomId/messages', getMessages);
router.put('/:roomId/read', markAllAsRead);

export default router;