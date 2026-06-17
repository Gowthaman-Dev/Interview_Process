import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, CheckCheck, Check } from 'lucide-react';

// Helper: safely get an id string whether it's an ObjectId, a populated
// object ({_id, name, ...}), or a plain string. This is the root fix for
// the "messages show on the wrong side" bug — strict === comparisons
// between an ObjectId and a string (or undefined) silently fail.
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
  const socket = useRef(null);
  const [roomJoined, setRoomJoined] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async (pageNum, append = false) => {
    try {
      const { data } = await api.get(`/chat/${interviewId}/messages?page=${pageNum}&limit=30`);
      const newMessages = data.messages;
      if (append) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
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
    if (socket.current && roomJoined) {
      socket.current.emit('mark-as-read', { roomId: interviewId });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

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

    setMessages(prev => [...prev, optimisticMessage]);
    const msgToSend = newMessage;
    setNewMessage('');
    setSending(true);

    try {
      socket.current.emit('send-message', {
        roomId: interviewId,
        message: msgToSend,
        messageType: 'text',
      });
      console.log('📤 Sent:', msgToSend);
    } catch (err) {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const initChat = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        socket.current = await socketService.connect(token);
        if (!socket.current) throw new Error('Socket connection failed');

        socket.current.emit('join-chat-room', interviewId);
        setRoomJoined(true);
        console.log(`📌 Joined room: ${interviewId}`);

        socket.current.emit('mark-as-read', { roomId: interviewId });

        // ✅ Listen for new messages
        socket.current.on('receive-message', (newMsg) => {
          console.log('📩 Received:', newMsg, 'senderId raw:', newMsg.senderId);

          // Defensive fix: if the server sends senderId as a bare string
          // (not populated with name/email), normalize it to an object so
          // the rest of the UI (avatar initial, name label) doesn't break.
          if (newMsg.senderId && typeof newMsg.senderId === 'string') {
            const isFromMe = newMsg.senderId === user._id;
            newMsg = {
              ...newMsg,
              senderId: isFromMe
                ? { _id: user._id, name: user.name, email: user.email }
                : { _id: newMsg.senderId, name: newMsg.senderName || 'Unknown' },
            };
          }

          setMessages(prev => {
            // 1. If this exact message already exists (by real _id), ignore
            if (prev.some(m => m._id === newMsg._id)) return prev;

            // 2. Find an optimistic message from the same sender with the same content
            const optimisticIndex = prev.findIndex(m =>
              m.optimistic === true &&
              getId(m.senderId) === getId(newMsg.senderId) &&
              m.message === newMsg.message
            );

            // 3. If found, replace it
            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = newMsg;
              console.log('🔄 Replaced optimistic message with real one');
              return updated;
            }

            // 4. Otherwise, append as new message
            return [...prev, newMsg];
          });

          if (document.hasFocus()) {
            socket.current.emit('mark-as-read', { roomId: interviewId });
          }
        });

        socket.current.on('messages-read', ({ userId: readerId }) => {
          console.log('👀 Read by:', readerId);
          setMessages(prev =>
            prev.map(msg =>
              getId(msg.senderId) !== getId(readerId) && !msg.isRead
                ? { ...msg, isRead: true, readAt: new Date() }
                : msg
            )
          );
        });
      } catch (err) {
        toast.error('Chat connection failed');
        console.error(err);
      }
    };

    initChat();

    return () => {
      if (socket.current) {
        socket.current.off('receive-message');
        socket.current.off('messages-read');
      }
    };
  }, [interviewId, navigate]);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
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
    // ✅ FIX: string-safe comparison instead of strict === on possibly
    // mismatched types (ObjectId vs string vs undefined)
    const isMine = getId(msg.senderId) === getId(user?._id);

    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
        {!isMine && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold mr-2 self-end">
            {msg.senderId?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
            isMine
              ? 'bg-[#06B6D4] text-white rounded-br-md'
              : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
          }`}
        >
          {!isMine && (
            <p className="text-xs font-semibold mb-1 text-gray-500">{msg.senderId?.name || 'Unknown'}</p>
          )}
          <p className="text-sm break-words leading-relaxed">{msg.message}</p>
          <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
            <span className="text-[10px]">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMine && (
              <span className="text-xs">
                {msg.isRead ? <CheckCheck size={12} className="text-white/80" /> : <Check size={12} />}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#06B6D4] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 rounded-full hover:bg-gray-100 transition">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-800">Interview Chat</h1>
            <p className="text-xs text-gray-500">ID: {interviewId?.slice(-8)}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {loadingMore && (
          <div className="text-center py-2">
            <span className="text-xs text-gray-400 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full">
              Loading older messages...
            </span>
          </div>
        )}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-white/50 backdrop-blur-sm rounded-full p-4 mb-3">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-400 text-xs mt-1">Start the conversation</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble key={msg._id || idx} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-white/80 backdrop-blur-md border-t border-gray-100 p-3">
        <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-200 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent bg-white/90"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-[#06B6D4] text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-[#0891B2] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {sending ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;