import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast';

// Optional icons – you can replace with your own or use emoji
const MicIcon = () => <span>🎤</span>;
const MicOffIcon = () => <span>🔇</span>;
const CameraIcon = () => <span>📷</span>;
const CameraOffIcon = () => <span>📷❌</span>;
const PhoneIcon = () => <span>📞</span>;
const FullscreenIcon = () => <span>⛶</span>;
const MinimizeIcon = () => <span>🗗</span>;

const VideoCallPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const localStream = useRef(null);
  const endedByMe = useRef(false);
  const isCaller = useRef(false);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      setError('Camera/Microphone permission denied. Please allow access and refresh.');
      throw err;
    }
  };

  const setupPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(configuration);
    peerConnection.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnecting(false);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit('ice-candidate', { interviewId: id, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        toast.success('Connected');
        setConnecting(false);
      }
    };

    return pc;
  };

  const createOffer = async (pc) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.current.emit('offer', { interviewId: id, offer });
    } catch (err) {
      console.error('Create offer error:', err);
    }
  };

  const handleOffer = async (offer) => {
    if (!peerConnection.current) return;
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.current.emit('answer', { interviewId: id, answer });
    } catch (err) {
      console.error('Handle offer error:', err);
    }
  };

  const handleAnswer = async (answer) => {
    if (!peerConnection.current) return;
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Handle answer error:', err);
    }
  };

  const handleIceCandidate = async (candidate) => {
    if (!peerConnection.current) return;
    try {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Add ICE candidate error:', err);
    }
  };

  const handleEndCall = async () => {
    if (endedByMe.current) return;
    endedByMe.current = true;
    try {
      await api.post(`/interviews/${id}/end`);
      toast.success('Call ended. Duration recorded.');
      navigate(`/interview/${id}`, { replace: true });
    } catch (err) {
      toast.error('Failed to end call');
    } finally {
      cleanup();
    }
  };

  const cleanup = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };

  const toggleCamera = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraOn;
        setCameraOn(!cameraOn);
      }
    }
  };

  const toggleMic = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micOn;
        setMicOn(!micOn);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get(`/interviews/${id}`);
        if (data.interview.status !== 'InProgress') {
          toast.error('This interview is no longer active.');
          navigate(`/interview/${id}`, { replace: true });
          return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/login');
          return;
        }

        let connectedSocket = socketService.getSocket();
        if (!connectedSocket?.connected) {
          connectedSocket = await socketService.connect(token);
        }
        if (!connectedSocket) throw new Error('Socket connection failed');
        socket.current = connectedSocket;

        socket.current.emit('join-video-room', id);

        socket.current.on('call-ended', () => {
          if (endedByMe.current) return;
          endedByMe.current = true;
          toast('The interview has ended by the other participant.', { icon: 'ℹ️' });
          cleanup();
          navigate(`/interview/${id}`, { replace: true });
        });

        const stream = await getMedia();
        const pc = setupPeerConnection(stream);
        peerConnection.current = pc;

        const isHR = user?.role === 'HR';
        isCaller.current = isHR;

        if (isHR) {
          await createOffer(pc);
        }

        socket.current.on('offer', async ({ offer }) => {
          if (!isHR) await handleOffer(offer);
        });
        socket.current.on('answer', ({ answer }) => {
          if (isHR) handleAnswer(answer);
        });
        socket.current.on('ice-candidate', ({ candidate }) => {
          handleIceCandidate(candidate);
        });
        socket.current.on('user-joined', () => {
          console.log('Other user joined');
        });

        setConnecting(false);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Connection failed');
        setConnecting(false);
      }
    };

    init();

    return () => {
      if (socket.current) {
        socket.current.off('call-ended');
        socket.current.off('offer');
        socket.current.off('answer');
        socket.current.off('ice-candidate');
        socket.current.off('user-joined');
      }
      cleanup();
    };
  }, [id, user, navigate]);

  if (connecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Connecting to interview...</p>
          <p className="text-slate-300 text-sm mt-2">Please wait while we establish the connection</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Video Grid */}
      <div className="flex-1 flex flex-col md:flex-row p-4 md:p-6 gap-4 md:gap-6 items-center justify-center">
        {/* Local Video */}
        <div className="relative w-full md:w-1/2 max-w-lg rounded-2xl overflow-hidden bg-black/50 backdrop-blur-sm shadow-xl">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover aspect-video"
          />
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs">
            <span className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${micOn ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {user?.name || 'You'} {!cameraOn && '(Camera off)'}
            </span>
          </div>
        </div>

        {/* Remote Video */}
        <div className="relative w-full md:w-1/2 max-w-lg rounded-2xl overflow-hidden bg-black/50 backdrop-blur-sm shadow-xl">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover aspect-video"
          />
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs">
            <span className="flex items-center gap-1">👤 Other Participant</span>
          </div>
          {!remoteVideoRef.current?.srcObject && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white/10 backdrop-blur-md border-t border-white/20 p-4 flex justify-center gap-4 md:gap-6">
        <button
          onClick={toggleMic}
          className={`p-3 md:p-4 rounded-full transition-all duration-200 ${
            micOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'
          } text-white shadow-lg`}
        >
          {micOn ? <MicIcon /> : <MicOffIcon />}
        </button>
        <button
          onClick={toggleCamera}
          className={`p-3 md:p-4 rounded-full transition-all duration-200 ${
            cameraOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'
          } text-white shadow-lg`}
        >
          {cameraOn ? <CameraIcon /> : <CameraOffIcon />}
        </button>
        <button
          onClick={handleEndCall}
          className="p-3 md:p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-200 shadow-lg"
        >
          <PhoneIcon />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-3 md:p-4 rounded-full bg-slate-700 text-white hover:bg-slate-600 transition-all duration-200 shadow-lg"
        >
          {isFullscreen ? <MinimizeIcon /> : <FullscreenIcon />}
        </button>
      </div>
    </div>
  );
};

export default VideoCallPage;