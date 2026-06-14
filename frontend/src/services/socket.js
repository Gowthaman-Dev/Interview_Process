import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connectionPromise = null;
  }

  async connect(token) {
    if (!token) {
      console.error('No token provided for socket connection');
      return null;
    }

    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    if (this.connectionPromise) {
      console.log('Socket connection already in progress, waiting...');
      return this.connectionPromise;
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log('Connecting to Socket.IO at:', API_URL);

    this.connectionPromise = new Promise((resolve, reject) => {
      const socket = io(API_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Socket connection timeout'));
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ Socket connected:', socket.id);
        this.socket = socket;
        this.connectionPromise = null;
        resolve(socket);
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        console.error('❌ Socket connection error:', err.message);
        this.connectionPromise = null;
        reject(err);
      });
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionPromise = null;
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();