import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast';

const VideoCallPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

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
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit('ice-candidate', { interviewId: id, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        toast.error('Connection lost. Please refresh.');
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
      console.error(err);
      endedByMe.current = false;
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
    if (socket.current) {
      socket.current.disconnect();
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
        // Check if interview is still in progress before starting
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

        let connectedSocket;
        try {
          connectedSocket = await socketService.connect(token);
          if (!connectedSocket) throw new Error('Socket connection failed');
          socket.current = connectedSocket;
        } catch (err) {
          toast.error('Real-time connection failed. Please refresh.');
          navigate('/dashboard');
          return;
        }

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p>Connecting to video call...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
            You {!cameraOn && '(Camera off)'}
          </div>
        </div>
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
            Other Participant
          </div>
        </div>
      </div>
      <div className="bg-gray-800 p-4 flex justify-center gap-4">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full ${micOn ? 'bg-gray-600' : 'bg-red-600'} text-white hover:opacity-80`}
        >
          {micOn ? '🎤 Mic On' : '🔇 Mic Off'}
        </button>
        <button
          onClick={toggleCamera}
          className={`p-3 rounded-full ${cameraOn ? 'bg-gray-600' : 'bg-red-600'} text-white hover:opacity-80`}
        >
          {cameraOn ? '📷 Camera On' : '📷 Camera Off'}
        </button>
        <button
          onClick={handleEndCall}
          className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700"
        >
          📞 End Call
        </button>
      </div>
    </div>
  );
};

export default VideoCallPage;