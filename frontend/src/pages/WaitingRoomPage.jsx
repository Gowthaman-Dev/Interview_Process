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
      <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-slate-900">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-700/50" />
            <div className="absolute inset-0 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-cyan-400 rounded-full" />
            </div>
          </div>
          <p className="text-white text-xl font-bold tracking-tight">Joining waiting room...</p>
          <p className="text-slate-400 text-sm mt-2 font-medium">Securing connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-slate-900 font-sans">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 z-0 opacity-60">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-cyan-600/30 mix-blend-screen filter blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/30 mix-blend-screen filter blur-[120px] animate-[pulse_10s_ease-in-out_infinite_reverse]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2rem] p-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.4)] relative overflow-hidden group">
          
          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_2s_infinite]" />

          <div className="relative mb-8 flex justify-center">
            {/* Pulsing ring behind the clock */}
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
            <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full border border-slate-700/50 flex items-center justify-center shadow-inner relative z-10">
              <Clock size={40} className="text-cyan-400" />
            </div>
            {/* Orbiting dot */}
            <div className="absolute inset-0 w-24 h-24 mx-auto animate-[spin_4s_linear_infinite]">
              <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] absolute -top-1.5 left-1/2 -translate-x-1/2" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Waiting Room</h1>
          <p className="text-slate-300 font-medium leading-relaxed mb-8">
            Your interviewer has been notified. Please wait for them to start the session.
          </p>
          
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="text-white font-semibold tracking-wide">Status: <span className="text-cyan-400">{waitingStatus}</span></span>
          </div>
          
          <div className="flex justify-center mt-10 gap-2">
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        
        {/* Footer info */}
        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm font-medium">Please do not refresh this page</p>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoomPage;