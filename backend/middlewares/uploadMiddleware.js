import multer from 'multer';
import AppError from '../utils/errorHandler.js';

// Configure memory storage (we'll upload to Cloudinary directly)
const storage = multer.memoryStorage();

// File filter: only PDF, max 2MB
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF files are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter,
});

export const uploadResume = upload.single('resume');