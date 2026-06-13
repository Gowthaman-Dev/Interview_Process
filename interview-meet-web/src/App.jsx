import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import CreateInterviewPage from './pages/CreateInterviewPage';
import InterviewDetailsPage from './pages/InterviewDetailsPage';
import WaitingRoomPage from './pages/WaitingRoomPage';
import VideoCallPage from './pages/VideoCallPage';
import ChatPage from './pages/ChatPage';
import NotificationsPage from './pages/NotificationsPage';
import ErrorBoundary from './components/ErrorBoundary';
import socketService from './services/socket';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import FeedbackPage from './pages/FeedbackPage';

// ✅ Fixed NotificationListener – uses async/await to get socket
const NotificationListener = () => {
  const { user, setNotificationCount } = useAuth();

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    let isMounted = true;
    let socket = null;

    const setupSocket = async () => {
      try {
        socket = await socketService.connect(token);
        if (!isMounted || !socket) return;

        const handleNewNotification = (notification) => {
          if (!isMounted) return;
          setNotificationCount(prev => prev + 1);
          if (notification.type === 'reminder') {
            toast(notification.message, { icon: '⏰', duration: 5000 });
          } else {
            toast(notification.message, { icon: '📢' });
          }
        };

        socket.on('new-notification', handleNewNotification);
      } catch (err) {
        console.error('Failed to connect socket for notifications:', err);
      }
    };

    setupSocket();

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('new-notification');
      }
    };
  }, [user, setNotificationCount]);

  return null;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationListener />
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/create-interview" element={<ProtectedRoute><CreateInterviewPage /></ProtectedRoute>} />
            <Route path="/interview/:id" element={<ProtectedRoute><InterviewDetailsPage /></ProtectedRoute>} />
            <Route path="/waiting-room/:id" element={<ProtectedRoute><WaitingRoomPage /></ProtectedRoute>} />
            <Route path="/video/:id" element={<ProtectedRoute><VideoCallPage /></ProtectedRoute>} />
            <Route path="/chat/:interviewId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/" element={<LoginPage />} />
            <Route path="/feedback/:interviewId" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
=
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;