import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import socketService from '../services/socket';

const NavBar = () => {
  const { user, logout, notificationCount, setNotificationCount } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    let isMounted = true;
    let socket = null;

    const setupSocket = async () => {
      try {
        // ✅ Await the socket connection (returns a promise that resolves to socket)
        socket = await socketService.connect(token);
        if (!isMounted || !socket) return;

        const handleNewNotification = (notification) => {
          if (!isMounted) return;
          setNotificationCount(prev => prev + 1);
          // Optional: show a toast for reminders (already done in App.jsx)
        };

        socket.on('new-notification', handleNewNotification);
      } catch (err) {
        console.error('Failed to connect socket for NavBar:', err);
      }
    };

    setupSocket();

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('new-notification');
      }
    };
  }, [user, setNotificationCount]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md px-6 py-3 flex justify-between items-center">
      <Link to="/dashboard" className="text-xl font-bold text-indigo-600">
        InterviewMeet
      </Link>
      <div className="flex items-center space-x-4">
        <Link to="/profile" className="text-gray-700 hover:text-indigo-600">
          Profile
        </Link>
        {user?.role === 'HR' && (
          <Link to="/create-interview" className="text-gray-700 hover:text-indigo-600">
            Create Interview
          </Link>
        )}
        {/* Notification Bell */}
        <Link to="/notifications" className="relative">
          <span className="text-xl">🔔</span>
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Link>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default NavBar;