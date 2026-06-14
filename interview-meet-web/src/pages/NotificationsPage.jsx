import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';
import { Bell, Calendar, Clock, CheckCircle, Circle, Loader2, MailOpen } from 'lucide-react';

const NotificationsPage = () => {
  const { user, notificationCount, setNotificationCount } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotifications = async (pageNum, append = false) => {
    try {
      const { data } = await api.get(`/notifications?page=${pageNum}&limit=20`);
      const newNotifs = data.notifications;
      if (append) {
        setNotifications(prev => [...prev, ...newNotifs]);
      } else {
        setNotifications(newNotifs);
      }
      setHasMore(data.pagination.page < data.pagination.pages);
      setNotificationCount(data.unreadCount);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1, false);
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchNotifications(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === id ? { ...notif, isRead: true } : notif
        )
      );
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setNotificationCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'reminder': return <Clock size={20} className="text-[#06B6D4]" />;
      case 'interview_update': return <Calendar size={20} className="text-[#0F172A]" />;
      default: return <Bell size={20} className="text-gray-500" />;
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <NavBar />
        <div className="max-w-2xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/50 backdrop-blur-sm border border-gray-100 rounded-2xl p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Notifications</h1>
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-sm text-[#06B6D4] hover:text-[#0891B2] transition-colors"
            >
              <MailOpen size={14} /> Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100">
            <Bell size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif._id}
                className={`bg-white/80 backdrop-blur-sm border rounded-2xl p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                  !notif.isRead ? 'border-l-4 border-l-[#06B6D4] bg-[#F0FDF9]' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#0F172A]">{notif.title}</h3>
                      {!notif.isRead && (
                        <span className="inline-flex items-center gap-1 text-xs bg-[#06B6D4]/10 text-[#06B6D4] px-2 py-0.5 rounded-full">
                          <Circle size={6} fill="#06B6D4" /> New
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notif.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <button
                      onClick={() => markAsRead(notif._id)}
                      className="flex-shrink-0 text-xs text-[#06B6D4] hover:text-[#0891B2] underline-offset-2 hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="text-center pt-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-1 text-sm text-[#06B6D4] hover:text-[#0891B2] transition-colors"
                >
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;