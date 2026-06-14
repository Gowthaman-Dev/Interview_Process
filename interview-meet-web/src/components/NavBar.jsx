import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import socketService from '../services/socket';
import { Menu, X, Bell, LogOut, User, Calendar } from 'lucide-react';

const NavBar = () => {
  const { user, logout, notificationCount, setNotificationCount } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    let isMounted = true;
    let socket = null;

    const setupSocket = async () => {
      try {
        socket = await socketService.connect(token);
        if (!isMounted || !socket) return;

        const handleNewNotification = (notification) => {
          if (!isMounted) return;
          setNotificationCount(prev => prev + 1);
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
    setIsMenuOpen(false);
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-md border-b border-gray-100/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo with improved typography */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#0F172A] hover:text-[#06B6D4] transition-colors duration-200 font-sans"
          >
            <div className="w-7 h-7 bg-[#0F172A] rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-[#06B6D4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="hidden sm:inline">InterviewMeet</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-5">
            <Link
              to="/profile"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-[#06B6D4] transition-all duration-200"
            >
              <User size={16} />
              <span>Profile</span>
            </Link>
            {user?.role === 'HR' && (
              <Link
                to="/create-interview"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-[#06B6D4] transition-all duration-200"
              >
                <Calendar size={16} />
                <span>Create Interview</span>
              </Link>
            )}
            {/* Notification Bell */}
            <Link to="/notifications" className="relative">
              <Bell size={18} className="text-gray-700 hover:text-[#06B6D4] transition-colors duration-200" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-medium rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-[#0F172A] text-white text-sm font-medium px-3.5 py-1.5 rounded-lg hover:bg-[#1E293B] transition-all duration-200 hover:shadow-md"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-1 rounded-md text-gray-700 hover:text-[#06B6D4] focus:outline-none focus:ring-2 focus:ring-[#06B6D4] transition-all"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden py-3 space-y-2 border-t border-gray-100 animate-slideDown">
            <Link
              to="/profile"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-[#06B6D4] hover:bg-gray-50 rounded-lg transition-all"
            >
              <User size={16} /> Profile
            </Link>
            {user?.role === 'HR' && (
              <Link
                to="/create-interview"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-[#06B6D4] hover:bg-gray-50 rounded-lg transition-all"
              >
                <Calendar size={16} /> Create Interview
              </Link>
            )}
            <Link
              to="/notifications"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-[#06B6D4] hover:bg-gray-50 rounded-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <Bell size={16} /> Notifications
              </div>
              {notificationCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px] text-center shadow-sm">
                  {notificationCount}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </nav>
  );
};

export default NavBar;