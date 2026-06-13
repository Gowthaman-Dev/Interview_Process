import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import toast from 'react-hot-toast';

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
    setNewMessage('');
    setSending(true);

    try {
      socket.current.emit('send-message', {
        roomId: interviewId,
        message: newMessage,
        messageType: 'text',
      });
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
        socket.current.emit('mark-as-read', { roomId: interviewId });

        // ✅ FIX: Replace optimistic message instead of appending duplicate
        socket.current.on('receive-message', (newMsg) => {
          setMessages(prev => {
            // Avoid duplicate by real _id
            if (prev.some(m => m._id === newMsg._id)) return prev;

            // Check if this is matching our optimistic message
            const optimisticIndex = prev.findIndex(m =>
              m.optimistic === true &&
              m.message === newMsg.message &&
              m.senderId?._id === newMsg.senderId?._id &&
              Math.abs(new Date(m.createdAt) - new Date(newMsg.createdAt)) < 3000
            );

            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = newMsg;
              return updated;
            }

            return [...prev, newMsg];
          });

          if (document.hasFocus()) {
            socket.current.emit('mark-as-read', { roomId: interviewId });
          }
        });

        socket.current.on('messages-read', ({ userId: readerId }) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.senderId?._id !== readerId && !msg.isRead
                ? { ...msg, isRead: true, readAt: new Date() }
                : msg
            )
          );
        });
      } catch (err) {
        toast.error('Chat connection failed');
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

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      await fetchMessages(1, false);
      setLoading(false);
    };
    loadMessages();
  }, [interviewId]);

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
    const isMine = msg.senderId?._id === user?._id;
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
        <div
          className={`max-w-[70%] rounded-lg px-3 py-2 ${
            isMine ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'
          }`}
        >
          {!isMine && (
            <p className="text-xs font-semibold mb-1 text-gray-600">
              {msg.senderId?.name || 'Unknown'}
            </p>
          )}
          <p className="text-sm break-words">{msg.message}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs opacity-70">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMine && (
              <span className="text-xs">
                {msg.isRead ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white shadow-sm p-4 border-b">
        <button onClick={() => navigate(-1)} className="text-indigo-600 hover:text-indigo-800">
          ← Back
        </button>
        <h1 className="text-xl font-bold mt-2">Chat</h1>
        <p className="text-sm text-gray-500">Interview ID: {interviewId}</p>
      </div>

      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
        style={{ maxHeight: 'calc(100vh - 140px)' }}
      >
        {loadingMore && (
          <div className="text-center py-2">
            <span className="text-xs text-gray-400">Loading older messages...</span>
          </div>
        )}
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-500 mt-10">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble key={msg._id || idx} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="bg-white border-t p-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="bg-indigo-600 text-white rounded-full px-5 py-2 hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatPage;