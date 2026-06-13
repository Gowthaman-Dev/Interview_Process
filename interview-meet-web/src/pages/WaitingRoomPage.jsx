import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast';

const WaitingRoomPage = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [waitingStatus, setWaitingStatus] = useState('Waiting');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'Candidate') {
      toast.error('Only candidates can join waiting room');
      navigate('/dashboard');
      return;
    }

    const setup = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }

      // ✅ Wait for socket to connect
      let socket;
      try {
        socket = await socketService.connect(token);
        if (!socket) throw new Error('Socket connection failed');
      } catch (err) {
        toast.error('Real-time connection failed. Please refresh.');
        navigate('/dashboard');
        return;
      }

      // Now safe to attach event listeners
      socket.on('hr-accepted', (data) => {
        toast.success('HR accepted! Redirecting to video call...');
        navigate(`/video/${data.interviewId}`);
      });

      socket.on('hr-rejected', () => {
        toast.error('HR rejected your interview request.');
        navigate('/dashboard');
      });

      socket.on('waiting-status', (data) => {
        setWaitingStatus(data.status);
      });

      socket.on('error', (errMsg) => {
        toast.error(errMsg);
      });

      // Emit join event
      socket.emit('join-waiting-room', id);

      // Optional HTTP fallback
      try {
        await api.post(`/interviews/${id}/join`);
      } catch (err) {
        console.warn('HTTP join fallback failed:', err);
      }

      setLoading(false);
    };

    setup();

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('hr-accepted');
        socket.off('hr-rejected');
        socket.off('waiting-status');
        socket.off('error');
      }
    };
  }, [id, user, authLoading, navigate]);

  const getStatusColor = () => {
    switch (waitingStatus) {
      case 'Waiting': return 'bg-yellow-100 text-yellow-800';
      case 'Accepted': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Connecting to waiting room...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Waiting Room</h1>
        <p className="text-gray-500 mb-6">
          Please wait while the HR starts the interview.
        </p>
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${getStatusColor()}`}>
          Status: {waitingStatus}
        </div>
        <div className="flex justify-center">
          <div className="animate-pulse flex space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-400 rounded-full animation-delay-200"></div>
            <div className="w-3 h-3 bg-gray-400 rounded-full animation-delay-400"></div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-6">
          You can close this tab – you’ll receive a notification when the interview starts.
        </p>
      </div>
    </div>
  );
};

export default WaitingRoomPage;