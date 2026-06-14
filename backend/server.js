import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/db.js';
import validateEnv from './config/validateEnv.js';
import errorMiddleware from './middlewares/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import { configureCloudinary } from './utils/cloudinaryHelper.js';
import { initSocket } from './sockets/index.js';
import chatRoutes from './routes/chatRoutes.js';
import { startReminderJob } from './utils/reminderJob.js';
import notificationRoutes from './routes/notificationRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import noteRoutes from './routes/noteRoutes.js';

dotenv.config();
validateEnv();
connectDB();
startReminderJob();
configureCloudinary();

const app = express();

// ✅ CORS configuration – allow localhost and your Vercel frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://interview-process-puce.vercel.app',
  // Add any other production frontend URLs here
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Helmet with relaxed policy for cross-origin
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Simple XSS prevention
const simpleXssClean = (req, res, next) => {
  const clean = (obj) => {
    if (!obj) return;
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/<script[^>]*>.*?<\/script>/gi, '');
      } else if (typeof obj[key] === 'object') {
        clean(obj[key]);
      }
    }
  };
  clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};
app.use(simpleXssClean);

// Safe MongoDB sanitization (no package that overwrites query)
const safeMongoSanitize = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj) return;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string' && (obj[key].startsWith('$') || obj[key].includes('.'))) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
};
app.use(safeMongoSanitize);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notes', noteRoutes);

// Health check / test route
app.get('/', (req, res) => {
  res.json({ message: 'Interview Meet API is running' });
});

// Global error handler (must be last)
app.use(errorMiddleware);

// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Socket.IO initialization (with its own CORS)
const io = initSocket(server);
app.set('io', io);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});