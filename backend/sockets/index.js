import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',                 // Local Vite dev
        'http://localhost:5174',                 // Alternative dev port
        'https://interview-process-puce.vercel.app', // Your deployed frontend
        // Add any other production frontends here
      ],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.log('Socket auth: no token');
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.user.email} (${socket.user.role})`);

    // Join a personal room (user ID) for direct messages
    socket.join(socket.user._id.toString());

    // Dynamically load interview socket handlers (waiting room, video signaling)
    import('./interviewSocket.js')
      .then((module) => module.default(io, socket))
      .catch((err) => console.error('Failed to load interviewSocket:', err));

    // Dynamically load chat socket handlers (send/receive messages, read receipts)
    import('./chatSocket.js')
      .then((module) => module.default(io, socket))
      .catch((err) => console.error('Failed to load chatSocket:', err));

    socket.on('disconnect', () => {
      console.log(`🔴 User disconnected: ${socket.user.email}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};