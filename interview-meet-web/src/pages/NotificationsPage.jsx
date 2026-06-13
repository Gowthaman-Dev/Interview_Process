import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';

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
      // Update global unread count
      setNotificationCount(data.unreadCount);
    } catch (err) {
      toast.error('Failed to load notifications');
    }
  };

  useEffect(() => {
    fetchNotifications(1, false);
    setLoading(false);
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
      case 'reminder': return '⏰';
      case 'interview_update': return '📅';
      default: return '🔔';
    }
  };

  if (loading) {
    return (
      <div>
        <NavBar />
        <div className="max-w-2xl mx-auto p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-100 h-20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif._id}
                className={`bg-white border rounded-lg p-4 shadow-sm transition ${
                  !notif.isRead ? 'border-l-4 border-l-indigo-500 bg-indigo-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getIcon(notif.type)}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{notif.title}</h3>
                    <p className="text-gray-600 text-sm">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <button
                      onClick={() => markAsRead(notif._id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="text-center py-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-indigo-600 text-sm"
                >
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