import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';
import toast from 'react-hot-toast';
import { Loader2, Clock } from 'lucide-react';

const WaitingRoomPage = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [waitingStatus, setWaitingStatus] = useState('Waiting');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

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

      try {
        // Connect socket (reuse existing if connected)
        let socket = socketService.getSocket();
        if (!socket || !socket.connected) {
          socket = await socketService.connect(token);
        }
        if (!socket) throw new Error('Socket connection failed');
        socketRef.current = socket;

        // Set up event listeners BEFORE emitting
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

        // Emit join event immediately (no HTTP call)
        socket.emit('join-waiting-room', id);
        setLoading(false);
      } catch (err) {
        toast.error('Connection failed. Please refresh.');
        navigate('/dashboard');
      }
    };

    setup();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('hr-accepted');
        socketRef.current.off('hr-rejected');
        socketRef.current.off('waiting-status');
        socketRef.current.off('error');
      }
    };
  }, [id, user, authLoading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
          <Loader2 size={48} className="animate-spin text-[#06B6D4] mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Joining waiting room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center max-w-md">
        <Clock size={48} className="text-[#06B6D4] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Waiting Room</h1>
        <p className="text-gray-300 mb-4">Please wait for the HR to start the interview.</p>
        <div className="inline-block px-4 py-2 bg-[#06B6D4]/20 rounded-full text-[#06B6D4] font-medium">
          Status: {waitingStatus}
        </div>
        <div className="flex justify-center mt-6">
          <div className="animate-pulse flex space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animation-delay-200"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animation-delay-400"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoomPage;