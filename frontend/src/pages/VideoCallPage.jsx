import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Maximize, Minimize, RefreshCw } from 'lucide-react';

/* ─── pick remote person's name from ANY backend shape ─────────────────────── */
const getRemoteName = (interview, isHR) => {
  if (!interview) return null;
  const obj = isHR
    ? (interview.candidate || interview.candidateUser ||
       interview.applicant || interview.student || interview.user)
    : (interview.interviewer || interview.interviewerUser ||
       interview.hr || interview.hrUser ||
       interview.recruiter || interview.host);
  return obj?.name || obj?.fullName || obj?.firstName || null;
};

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

/* ══════════════════════════════════════════════════════════════════════════════
   VideoCallPage
══════════════════════════════════════════════════════════════════════════════ */
const VideoCallPage = () => {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase]                   = useState('init');   // init | ready | connected | error
  const [error, setError]                   = useState(null);
  const [cameraOn, setCameraOn]             = useState(true);
  const [micOn, setMicOn]                   = useState(true);
  const [isFullscreen, setIsFullscreen]     = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteUserName, setRemoteUserName] = useState('Waiting...');
  const [reconnecting, setReconnecting]     = useState(false);

  /* refs */
  const containerRef   = useRef(null);
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const socketRef      = useRef(null);
  const localStream    = useRef(null);
  const endedByMe      = useRef(false);
  const isHRRef        = useRef(false);
  const hasRemoteDesc  = useRef(false);
  const iceQueue       = useRef([]);
  const makingOffer    = useRef(false);   // perfect negotiation flag

  /* ─── fullscreen ──────────────────────────────────────────────────────────── */
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  };
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  /* ─── attach local stream to <video> safely ──────────────────────────────── */
  const attachLocal = useCallback((stream) => {
    const go = () => {
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    };
    go();
    setTimeout(go, 0);
    requestAnimationFrame(go);
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localVideoRef.current]);

  /* ─── get camera + mic ────────────────────────────────────────────────────── */
  const getMedia = useCallback(async () => {
    // Re-use existing stream if tracks are still live
    if (localStream.current) {
      const tracks = localStream.current.getTracks();
      if (tracks.every(t => t.readyState === 'live')) {
        attachLocal(localStream.current);
        return localStream.current;
      }
      tracks.forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      attachLocal(stream);
      return stream;
    } catch {
      throw new Error('Camera / microphone permission denied. Please allow access and refresh.');
    }
  }, [attachLocal]);

  /* ─── flush queued ICE candidates ────────────────────────────────────────── */
  const flushIce = useCallback(async () => {
    while (iceQueue.current.length) {
      const c = iceQueue.current.shift();
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) { console.warn('ICE flush error:', e); }
    }
  }, []);

  /* ─── close old peer connection ──────────────────────────────────────────── */
  const closePc = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack         = null;
      pcRef.current.onicecandidate  = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    hasRemoteDesc.current = false;
    iceQueue.current      = [];
    makingOffer.current   = false;
  }, []);

  /* ─── create RTCPeerConnection ────────────────────────────────────────────── */
  const createPc = useCallback((stream) => {
    closePc();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
        setRemoteConnected(true);
        setPhase('connected');
        setReconnecting(false);
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { interviewId: id, candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log('[ICE]', s);
      if (s === 'connected' || s === 'completed') {
        setRemoteConnected(true);
        setPhase('connected');
        setReconnecting(false);
      }
      if (s === 'disconnected' || s === 'failed') {
        setRemoteConnected(false);
      }
    };

    return pc;
  }, [id, closePc]);

  /* ─── signalling ──────────────────────────────────────────────────────────── */
  const sendOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || makingOffer.current) return;
    try {
      makingOffer.current = true;
      const offer = await pc.createOffer();
      if (pc.signalingState !== 'stable') return;   // state changed, abort
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('offer', { interviewId: id, offer: pc.localDescription });
      console.log('[Signalling] offer sent');
    } catch (e) {
      console.error('sendOffer error:', e);
    } finally {
      makingOffer.current = false;
    }
  }, [id]);

  const handleOffer = useCallback(async (offer) => {
    const pc = pcRef.current;
    if (!pc) return;

    // Collision guard — if we're also making an offer (both sides HR by mistake),
    // politely back off if we're the "impolite" peer (HR)
    const offerCollision = makingOffer.current || pc.signalingState !== 'stable';
    if (offerCollision && isHRRef.current) return;  // HR is impolite peer

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      hasRemoteDesc.current = true;
      await flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('answer', { interviewId: id, answer: pc.localDescription });
      console.log('[Signalling] answer sent');
    } catch (e) {
      console.error('handleOffer error:', e);
    }
  }, [id, flushIce]);

  const handleAnswer = useCallback(async (answer) => {
    const pc = pcRef.current;
    if (!pc) return;
    if (pc.signalingState === 'stable') return;  // already handled
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      hasRemoteDesc.current = true;
      await flushIce();
      console.log('[Signalling] answer applied');
    } catch (e) {
      console.error('handleAnswer error:', e);
    }
  }, [flushIce]);

  const handleIce = useCallback(async (candidate) => {
    if (!candidate) return;
    if (!hasRemoteDesc.current || !pcRef.current) {
      iceQueue.current.push(candidate);
      return;
    }
    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('addIceCandidate error:', e);
    }
  }, []);

  /* ─── cleanup everything ─────────────────────────────────────────────────── */
  const cleanup = useCallback(() => {
    closePc();
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
  }, [closePc]);

  /* ─── reconnect without full page refresh ────────────────────────────────── */
  const reconnect = useCallback(async () => {
    if (reconnecting) return;
    setReconnecting(true);
    setRemoteConnected(false);
    closePc();

    try {
      const stream = await getMedia();
      const pc = createPc(stream);

      // Re-register socket events (they were removed on cleanup, but socket still live)
      const sock = socketRef.current;
      if (!sock) { setReconnecting(false); return; }

      // Tell room we're back
      sock.emit('join-video-room', id);
      sock.emit('user-ready', { interviewId: id, name: user?.name });

      if (isHRRef.current) {
        await sendOffer();
      }
      console.log('[Reconnect] done, waiting for peer...');
    } catch (e) {
      console.error('reconnect error:', e);
      setReconnecting(false);
      toast.error('Reconnect failed. Please try again.');
    }
  }, [reconnecting, closePc, getMedia, createPc, id, user, sendOffer]);

  /* ─── end call ───────────────────────────────────────────────────────────── */
  const handleEndCall = useCallback(async () => {
    if (endedByMe.current) return;
    endedByMe.current = true;
    try {
      await api.post(`/interviews/${id}/end`);
      toast.success('Call ended. Duration recorded.');
      navigate(`/interview/${id}`, { replace: true });
    } catch {
      toast.error('Failed to end call');
    } finally {
      cleanup();
    }
  }, [id, navigate, cleanup]);

  /* ─── toggle camera / mic ────────────────────────────────────────────────── */
  const toggleCamera = () => {
    const t = localStream.current?.getVideoTracks()[0];
    if (t) { t.enabled = !cameraOn; setCameraOn(v => !v); }
  };
  const toggleMic = () => {
    const t = localStream.current?.getAudioTracks()[0];
    if (t) { t.enabled = !micOn; setMicOn(v => !v); }
  };

  /* ─── MAIN INIT ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        /* 1. Fetch interview */
        const { data } = await api.get(`/interviews/${id}`);
        if (!mounted) return;
        const interview = data.interview || data;

        if (interview.status !== 'InProgress') {
          toast.error('This interview is no longer active.');
          navigate(`/interview/${id}`, { replace: true });
          return;
        }

        /* 2. Resolve names */
        const isHR = user?.role === 'HR';
        isHRRef.current = isHR;
        const name = getRemoteName(interview, isHR);
        if (mounted) setRemoteUserName(name || (isHR ? 'Candidate' : 'Interviewer'));

        /* 3. Auth */
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/login'); return; }

        /* 4. Socket */
        let sock = socketService.getSocket();
        if (!sock?.connected) sock = await socketService.connect(token);
        if (!sock || !mounted) return;
        socketRef.current = sock;

        /* 5. Local media — user sees themselves straight away */
        const stream = await getMedia();
        if (!mounted) return;

        /* 6. Peer connection */
        createPc(stream);

        /* 7. Register ALL socket listeners BEFORE joining room */
        sock.off('user-joined');
        sock.off('user-ready');
        sock.off('offer');
        sock.off('answer');
        sock.off('ice-candidate');
        sock.off('call-ended');

        // Someone joined or signalled they are ready → HR sends offer
        const onPeerReady = ({ name: peerName } = {}) => {
          console.log('[Socket] peer ready / joined', peerName);
          if (peerName && mounted) setRemoteUserName(peerName);
          if (isHRRef.current) {
            console.log('[Signalling] HR sending offer');
            sendOffer();
          }
        };
        sock.on('user-joined', onPeerReady);
        sock.on('user-ready',  onPeerReady);   // custom event from candidate

        sock.on('offer', async ({ offer }) => {
          console.log('[Socket] offer received');
          if (!isHRRef.current) await handleOffer(offer);
        });

        sock.on('answer', async ({ answer }) => {
          console.log('[Socket] answer received');
          if (isHRRef.current) await handleAnswer(answer);
        });

        sock.on('ice-candidate', ({ candidate }) => handleIce(candidate));

        sock.on('call-ended', () => {
          if (endedByMe.current) return;
          endedByMe.current = true;
          toast('The other participant ended the call.', { icon: 'ℹ️' });
          cleanup();
          navigate(`/interview/${id}`, { replace: true });
        });

        /* 8. Join room */
        sock.emit('join-video-room', id);

        /* 9. Candidate announces themselves so HR knows to send offer */
        if (!isHR) {
          sock.emit('user-ready', { interviewId: id, name: user?.name });
        }

        if (mounted) setPhase('ready');

      } catch (err) {
        console.error('[VideoCall] init error:', err);
        if (mounted) {
          setError(err.message || 'Connection failed');
          setPhase('error');
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.off('user-joined');
        socketRef.current.off('user-ready');
        socketRef.current.off('offer');
        socketRef.current.off('answer');
        socketRef.current.off('ice-candidate');
        socketRef.current.off('call-ended');
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */

  /* Loading */
  if (phase === 'init') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center max-w-sm w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Setting up your call...</p>
          <p className="text-slate-400 text-sm mt-2">Getting camera and connecting</p>
        </div>
      </div>
    );
  }

  /* Error */
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center max-w-sm w-full mx-4">
          <p className="text-red-400 font-medium mb-2">Connection error</p>
          <p className="text-slate-300 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  /* Call UI (phase === 'ready' | 'connected') */
  return (
    <div ref={containerRef} className="min-h-screen bg-slate-900 relative flex flex-col overflow-hidden font-sans">

      {/* Ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 mix-blend-screen filter blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 mix-blend-screen filter blur-[120px]" />
      </div>

      {/* ── Video grid ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row p-4 md:p-8 gap-4 md:gap-8 items-center justify-center z-10 w-full max-w-7xl mx-auto mb-20">

        {/* Local video */}
        <div className="relative w-full md:w-1/2 max-w-lg rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] group">
          <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none z-20" />
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video object-cover"
          />
          {/* dark overlay when camera off */}
          {!cameraOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
              <p className="text-slate-400 text-sm">Camera off</p>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full inline-block ${micOn ? 'bg-green-500' : 'bg-red-500'}`} />
              {user?.name || 'You'}
            </span>
          </div>
        </div>

        {/* Remote video */}
        <div className="relative w-full md:w-1/2 max-w-lg rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] group">
          <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none z-20" />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full aspect-video object-cover"
          />

          {/* Waiting overlay — shows until remoteConnected */}
          {!remoteConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 gap-3">
              {reconnecting
                ? <>
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
                    <p className="text-slate-300 text-sm">Reconnecting...</p>
                  </>
                : <>
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
                    <p className="text-slate-300 text-sm">Waiting for {remoteUserName}...</p>
                    {/* ✅ Reconnect button — no page refresh needed */}
                    <button
                      onClick={reconnect}
                      className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-full backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-lg"
                    >
                      <RefreshCw size={16} /> Reconnect
                    </button>
                  </>
              }
            </div>
          )}

          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full inline-block ${remoteConnected ? 'bg-green-500' : 'bg-yellow-400 animate-pulse'}`} />
              {remoteUserName}
            </span>
          </div>
        </div>
      </div>

      {/* ── Floating Controls Bar ─────────────────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-3xl border border-white/20 px-6 py-4 rounded-full flex justify-center items-center gap-4 md:gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50 animate-slide-up">

        {/* Mic */}
        <button
          onClick={toggleMic}
          title={micOn ? 'Mute' : 'Unmute'}
          className={`p-4 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center hover:scale-110 active:scale-95
            ${micOn ? 'bg-white/20 hover:bg-white/30 text-white border border-white/10' : 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-400'}`}
        >
          {micOn ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        {/* Camera */}
        <button
          onClick={toggleCamera}
          title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
          className={`p-4 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center hover:scale-110 active:scale-95
            ${cameraOn ? 'bg-white/20 hover:bg-white/30 text-white border border-white/10' : 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-400'}`}
        >
          {cameraOn ? <VideoIcon size={22} /> : <VideoOff size={22} />}
        </button>

        {/* End call (Larger) */}
        <button
          onClick={handleEndCall}
          title="End call"
          className="px-8 py-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white
            transition-all duration-300 shadow-[0_0_20px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2 font-bold hover:scale-105 active:scale-95"
        >
          <PhoneOff size={24} /> <span className="hidden md:inline tracking-wide">End Call</span>
        </button>

        {/* Reconnect */}
        <button
          onClick={reconnect}
          title="Reconnect"
          disabled={reconnecting}
          className="p-4 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/10
            transition-all duration-300 shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          <RefreshCw size={22} className={reconnecting ? 'animate-spin' : ''} />
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className="p-4 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/10
            transition-all duration-300 shadow-lg flex items-center justify-center hover:scale-110 active:scale-95"
        >
          {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
        </button>
      </div>
    </div>
  );
};

export default VideoCallPage;