import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socket';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, Briefcase, Video, CheckCircle, XCircle, Loader2, Users, MessageCircle } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cancelModal, setCancelModal] = useState({ show: false, interviewId: null });
  const [cancelling, setCancelling] = useState(false);
  const [waitingCandidate, setWaitingCandidate] = useState(null);

  const fetchInterviews = async (pageNum, append = false) => {
    try {
      const { data } = await api.get(`/interviews?page=${pageNum}&limit=5`);
      const newInterviews = data.interviews;
      if (append) {
        setInterviews(prev => [...prev, ...newInterviews]);
      } else {
        setInterviews(newInterviews);
      }
      setHasMore(data.pagination.page < data.pagination.pages);
    } catch (err) {
      setError('Failed to load interviews');
      toast.error('Could not load interviews');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      await fetchInterviews(1, false);
      setLoading(false);
    };
    load();
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchInterviews(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const handleCancelClick = (interviewId) => {
    setCancelModal({ show: true, interviewId });
  };

  const confirmCancel = async () => {
    if (!cancelModal.interviewId) return;
    setCancelling(true);
    try {
      await api.put(`/interviews/${cancelModal.interviewId}`, { action: 'cancel' });
      toast.success('Interview cancelled');
      setPage(1);
      await fetchInterviews(1, false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    } finally {
      setCancelling(false);
      setCancelModal({ show: false, interviewId: null });
    }
  };

  useEffect(() => {
    if (user?.role !== 'HR') return;
    let mounted = true;
    const setupSocket = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      let socket;
      try {
        socket = await socketService.connect(token);
        if (!socket || !mounted) return;
      } catch (err) {
        console.error('Socket connection failed:', err);
        return;
      }
      socket.on('candidate-waiting', (data) => {
        if (!mounted) return;
        setWaitingCandidate(data);
        toast(`Candidate ${data.candidateName} is waiting for interview: ${data.position}`, {
          duration: 10000,
          icon: '🕒',
        });
      });
    };
    setupSocket();
    return () => {
      mounted = false;
      const socket = socketService.getSocket();
      if (socket) socket.off('candidate-waiting');
    };
  }, [user]);

  const getStatusBadge = (status) => {
    const config = {
      Scheduled: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: Calendar },
      InProgress: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Video },
      Completed: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
      Cancelled: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
    };
    const { bg, text, icon: Icon } = config[status] || config.Scheduled;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        <Icon size={12} />
        {status}
      </span>
    );
  };

  const handlePendingCandidates = async () => {
    try {
      const { data } = await api.get('/interviews?limit=100');
      const waiting = data.interviews.filter(i => i.waitingRoomStatus === 'Waiting' && i.status === 'Scheduled');
      if (waiting.length === 0) {
        toast('No candidates waiting');
        return;
      }
      const candidate = waiting[0];
      if (window.confirm(`Accept ${candidate.candidateId?.name || 'candidate'} for ${candidate.position}?`)) {
        await api.post(`/interviews/${candidate._id}/accept`);
        toast.success('Accepted! Redirecting to video call...');
        navigate(`/video/${candidate._id}`);
      }
    } catch (err) {
      toast.error('Failed to fetch waiting candidates');
    }
  };

  if (loading) {
    return (
      <div>
        <NavBar />
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-[#0F172A] mb-6">My Interviews</h1>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/50 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <NavBar />
        <div className="max-w-4xl mx-auto p-6 text-center">
          <p className="text-red-500">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-[#0F172A] text-white rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] tracking-tight">My Interviews</h1>
          <div className="flex gap-3">
            {user?.role === 'HR' && (
              <button onClick={handlePendingCandidates} className="flex items-center gap-1.5 bg-white border border-gray-200 text-[#0F172A] px-4 py-2 rounded-xl hover:border-[#06B6D4] transition-all">
                <Users size={16} /> Pending
              </button>
            )}
            {user?.role === 'HR' && (
              <Link to="/create-interview" className="flex items-center gap-1.5 bg-[#0F172A] text-white px-4 py-2 rounded-xl hover:bg-[#1E293B] transition-all">
                <Calendar size={16} /> Create Interview
              </Link>
            )}
          </div>
        </div>

        {interviews.length === 0 ? (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100">
            <Briefcase size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No interviews scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {interviews.map(interview => (
              <div key={interview._id} className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-[#0F172A]">{interview.position}</h2>
                      {getStatusBadge(interview.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1"><Calendar size={14} /> {new Date(interview.date).toDateString()}</div>
                      <div className="flex items-center gap-1"><Clock size={14} /> {interview.time}</div>
                      <div className="flex items-center gap-1"><User size={14} /> {interview.candidateId?.name || 'Candidate'}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {interview.status === 'Scheduled' && (
                      <>
                        <button onClick={() => handleCancelClick(interview._id)} className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">Cancel</button>
                        {user?.role === 'Candidate' && (
                          <Link to={`/waiting-room/${interview._id}`} className="px-3 py-1.5 text-sm bg-[#06B6D4] text-white rounded-lg hover:bg-[#0891B2] transition-colors">Join</Link>
                        )}
                        {user?.role === 'HR' && (
                          <span className="px-3 py-1.5 text-sm text-gray-500 italic">Waiting for candidate</span>
                        )}
                      </>
                    )}
                    {interview.status === 'InProgress' && (
                      <Link to={`/video/${interview._id}`} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        {user?.role === 'Candidate' ? 'Join Call' : 'Start Call'}
                      </Link>
                    )}
                    {interview.status === 'Completed' && (
                      <div className="flex gap-2">
                        <Link to={`/interview/${interview._id}`} className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">Details</Link>
                        <Link to={`/chat/${interview._id}`} className="px-3 py-1.5 text-sm bg-[#06B6D4] text-white rounded-lg hover:bg-[#0891B2] transition-colors flex items-center gap-1">
                          <MessageCircle size={14} /> Chat
                        </Link>
                      </div>
                    )}
                    {interview.status === 'Cancelled' && (
                      <Link to={`/interview/${interview._id}`} className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Details</Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {hasMore && interviews.length > 0 && (
          <div className="mt-8 text-center">
            <button onClick={loadMore} disabled={loadingMore} className="px-5 py-2 bg-white border border-gray-200 text-[#0F172A] rounded-xl hover:border-[#06B6D4] transition-all disabled:opacity-50">
              {loadingMore ? <Loader2 size={16} className="animate-spin inline" /> : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {cancelModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-[#0F172A] mb-3">Cancel Interview</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this interview?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelModal({ show: false, interviewId: null })} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">No</button>
              <button onClick={confirmCancel} disabled={cancelling} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* HR Waiting Card */}
      {waitingCandidate && (
        <div className="fixed bottom-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border-l-4 border-[#06B6D4] p-4 w-80 z-50 animate-slideInRight">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-[#0F172A]">Candidate Waiting</h3>
              <p className="text-sm text-gray-600">{waitingCandidate.candidateName}</p>
              <p className="text-xs text-gray-500">{waitingCandidate.position}</p>
            </div>
            <button onClick={() => setWaitingCandidate(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={async () => {
              try {
                await api.post(`/interviews/${waitingCandidate.interviewId}/accept`);
                navigate(`/video/${waitingCandidate.interviewId}`);
              } catch (err) { toast.error('Accept failed'); }
              finally { setWaitingCandidate(null); }
            }} className="flex-1 bg-[#06B6D4] text-white py-1.5 rounded-lg hover:bg-[#0891B2] transition">Accept</button>
            <button onClick={async () => {
              try {
                await api.put(`/interviews/${waitingCandidate.interviewId}`, { action: 'cancel' });
                toast.success('Rejected');
                setPage(1);
                await fetchInterviews(1, false);
              } catch (err) { toast.error('Reject failed'); }
              finally { setWaitingCandidate(null); }
            }} className="flex-1 bg-red-600 text-white py-1.5 rounded-lg hover:bg-red-700 transition">Reject</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;