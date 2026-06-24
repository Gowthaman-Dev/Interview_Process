import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import socketService from '../services/socket';
import { Menu, X, Bell, LogOut, User, Calendar, Video } from 'lucide-react';

const NavBar = () => {
  const { user, logout, notificationCount, setNotificationCount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo with improved typography */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#0F172A] hover:opacity-80 transition-opacity duration-200 font-sans"
          >
            <div className="w-8 h-8 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-sm">
              <Video className="w-4 h-4 text-[#06B6D4]" />
            </div>
            <span className="hidden sm:inline">InterviewMeet</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive('/dashboard') ? 'bg-slate-100 text-[#0F172A]' : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              Dashboard
            </Link>
            
            <Link
              to="/profile"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive('/profile') ? 'bg-slate-100 text-[#0F172A]' : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              <User size={16} />
              <span>Profile</span>
            </Link>

            {user?.role === 'HR' && (
              <Link
                to="/create-interview"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive('/create-interview') ? 'bg-slate-100 text-[#0F172A]' : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
                }`}
              >
                <Calendar size={16} />
                <span>Create Interview</span>
              </Link>
            )}

            <div className="h-5 w-px bg-slate-200 mx-2"></div>

            {/* Notification Bell */}
            <Link 
              to="/notifications" 
              className="relative p-2 rounded-lg text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 transition-all duration-200"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center shadow-sm border-2 border-white ring-1 ring-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Link>

            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-1.5 bg-[#0F172A] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition-all duration-200 hover-lift shadow-sm"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 focus:outline-none transition-all"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-1.5 border-t border-slate-100 animate-slide-up">
            <Link
              to="/dashboard"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                isActive('/dashboard') ? 'bg-slate-100 text-[#0F172A]' : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/profile"
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                isActive('/profile') ? 'bg-slate-100 text-[#0F172A]' : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              <User size={18} /> Profile
            </Link>
            {user?.role === 'HR' && (
              <Link
                to="/create-interview"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive('/create-interview') ? 'bg-slate-100 text-[#0F172A]' : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
                }`}
              >
                <Calendar size={18} /> Create Interview
              </Link>
            )}
            <Link
              to="/notifications"
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                isActive('/notifications') ? 'bg-slate-100 text-[#0F172A]' : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell size={18} /> Notifications
              </div>
              {notificationCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center shadow-sm">
                  {notificationCount}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all mt-2"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;