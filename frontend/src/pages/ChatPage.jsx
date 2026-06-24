import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, CheckCheck, Check } from 'lucide-react';

const getId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val._id) return String(val._id);
  return String(val);
};

const ChatPage = () => {
  const { interviewId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const socketRef = useRef(null);
  const [roomJoined, setRoomJoined] = useState(false);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Track processed message IDs
  const seenIds = useRef(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async (pageNum, append = false) => {
    try {
      const { data } = await api.get(`/chat/${interviewId}/messages?page=${pageNum}&limit=30`);
      const incoming = data.messages.filter((m) => !seenIds.current.has(m._id));
      incoming.forEach((m) => seenIds.current.add(m._id));
      if (append) {
        setMessages((prev) => [...incoming, ...prev]);
      } else {
        setMessages(incoming);
      }
      setHasMore(data.pagination.page < data.pagination.pages);
    } catch (err) {
      toast.error('Failed to load messages');
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchMessages(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && !loadingMore) {
      loadMore();
    }
  };

  const markMessagesAsRead = () => {
    if (socketRef.current && roomJoined) {
      socketRef.current.emit('mark-as-read', { roomId: interviewId });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!socketRef.current) {
      toast.error('Not connected to chat');
      return;
    }

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage = {
      _id: tempId,
      senderId: { _id: user._id, name: user.name, email: user.email },
      message: newMessage,
      messageType: 'text',
      isRead: false,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    const msgToSend = newMessage;
    setNewMessage('');
    setSending(true);

    try {
      socketRef.current.emit('send-message', {
        roomId: interviewId,
        message: msgToSend,
        messageType: 'text',
        clientTempId: tempId,
      });
    } catch (err) {
      toast.error('Failed to send message');
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    let active = true;
    let socket = null;

    const handleReceiveMessage = (rawMsg) => {
      let newMsg = rawMsg;

      // Normalize senderId if it's a bare string
      if (newMsg.senderId && typeof newMsg.senderId === 'string') {
        const isFromMe = newMsg.senderId === userRef.current._id;
        newMsg = {
          ...newMsg,
          senderId: isFromMe
            ? { _id: userRef.current._id, name: userRef.current.name, email: userRef.current.email }
            : { _id: newMsg.senderId, name: newMsg.senderName || 'Unknown' },
        };
      }

      // Check if already processed (by ID)
      if (seenIds.current.has(newMsg._id)) {
        console.log('⏭️ Duplicate blocked by ID:', newMsg._id);
        return;
      }
      seenIds.current.add(newMsg._id);

      setMessages((prev) => {
        let optIndex = -1;
        // Exact match via clientTempId
        if (newMsg.clientTempId) {
          optIndex = prev.findIndex((m) => m._id === newMsg.clientTempId);
        }
        // Fallback: same sender + same content
        if (optIndex === -1) {
          optIndex = prev.findIndex(
            (m) =>
              m.optimistic === true &&
              getId(m.senderId) === getId(newMsg.senderId) &&
              m.message === newMsg.message
          );
        }
        if (optIndex !== -1) {
          const updated = [...prev];
          updated[optIndex] = newMsg;
          console.log('🔄 Replaced optimistic with real');
          return updated;
        }
        return [...prev, newMsg];
      });

      if (document.hasFocus()) {
        socketRef.current?.emit('mark-as-read', { roomId: interviewId });
      }
    };

    const handleMessagesRead = ({ userId: readerId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          getId(msg.senderId) !== getId(readerId) && !msg.isRead
            ? { ...msg, isRead: true, readAt: new Date() }
            : msg
        )
      );
    };

    const initChat = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // ✅ Reuse existing socket if connected
        let connected = socketService.getSocket();
        if (!connected || !connected.connected) {
          connected = await socketService.connect(token);
        }
        if (!active || !connected) throw new Error('Socket connection failed');

        socket = connected;
        socketRef.current = socket;

        // Remove any previous listeners to avoid duplicates
        socket.off('receive-message', handleReceiveMessage);
        socket.off('messages-read', handleMessagesRead);

        socket.emit('join-chat-room', interviewId);
        setRoomJoined(true);
        socket.emit('mark-as-read', { roomId: interviewId });

        socket.on('receive-message', handleReceiveMessage);
        socket.on('messages-read', handleMessagesRead);
      } catch (err) {
        toast.error('Chat connection failed. Please refresh.');
        console.error('Chat init error:', err);
      }
    };

    initChat();

    return () => {
      active = false;
      if (socket) {
        socket.off('receive-message', handleReceiveMessage);
        socket.off('messages-read', handleMessagesRead);
      }
    };
  }, [interviewId, navigate]);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      seenIds.current = new Set();
      await fetchMessages(1, false);
      setLoading(false);
    };
    loadMessages();
  }, [interviewId]);

  // Mark as read when tab becomes visible
  useEffect(() => {
    markMessagesAsRead();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markMessagesAsRead();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roomJoined, interviewId]);

  const MessageBubble = ({ msg }) => {
    const isMine = getId(msg.senderId) === getId(user?._id);
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
        {!isMine && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold mr-3 shadow-md shrink-0">
            {msg.senderId?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        <div
          className={`max-w-[75%] px-5 py-3 shadow-sm relative group transition-all duration-300 hover:shadow-md ${
            isMine
              ? 'bg-gradient-to-br from-indigo-600 to-cyan-600 text-white rounded-2xl rounded-tr-sm'
              : 'bg-white/90 backdrop-blur-sm text-slate-800 rounded-2xl rounded-tl-sm border border-white/40'
          }`}
        >
          {!isMine && (
            <p className="text-xs font-bold mb-1 text-indigo-500 tracking-wide">{msg.senderId?.name || 'Unknown'}</p>
          )}
          <p className="text-[15px] break-words leading-relaxed font-medium">{msg.message}</p>
          <div className={`flex items-center justify-end gap-1.5 mt-2 ${isMine ? 'text-white/80' : 'text-slate-400'}`}>
            <span className="text-[11px] font-medium tracking-wide">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMine && (
              <span className="text-xs">
                {msg.isRead ? <CheckCheck size={14} className="text-cyan-200" /> : <Check size={14} />}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center relative overflow-hidden">
        {/* Decorative background blurs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-400/20 blur-[100px]" />
        
        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/50 flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-4"></div>
          <p className="text-slate-600 font-semibold tracking-wide">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col relative overflow-hidden font-sans">
      {/* Decorative background blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-300/15 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="bg-white/70 backdrop-blur-2xl border-b border-white/50 sticky top-0 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100/80 transition-all active:scale-95 bg-white/50 shadow-sm border border-slate-100">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-slate-800 text-lg tracking-tight">Interview Chat</h1>
            <p className="text-xs font-semibold text-indigo-500 tracking-wider uppercase">Session ID: {interviewId?.slice(-8)}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 border border-white shadow-sm flex items-center justify-center">
             <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 z-10 relative custom-scrollbar scroll-smooth"
      >
        {loadingMore && (
          <div className="text-center py-3 sticky top-0 z-10">
            <span className="text-xs font-semibold text-slate-500 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm border border-white/50">
              Loading previous messages...
            </span>
          </div>
        )}
        
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="bg-white/60 backdrop-blur-xl shadow-lg border border-white/50 rounded-full p-6 mb-4 transform hover:scale-105 transition-transform duration-300">
              <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-slate-800 font-bold text-lg mb-1">It's quiet here...</p>
            <p className="text-slate-500 text-sm font-medium">Send a message to start the conversation</p>
          </div>
        )}
        
        <div className="max-w-5xl mx-auto w-full">
          {messages.map((msg, idx) => (
            <MessageBubble key={msg._id || idx} msg={msg} />
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white/60 backdrop-blur-2xl border-t border-white/50 p-4 pb-6 z-20 shadow-[0_-4px_30px_rgba(0,0,0,0.02)] relative">
        <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex gap-3 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/80 border border-slate-200/60 rounded-2xl px-6 py-4 text-[15px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-2xl px-6 flex items-center justify-center hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-95 group"
          >
            {sending ? (
               <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
               <Send size={20} className="transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;