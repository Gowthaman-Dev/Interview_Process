import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socket';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Interview list state
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Cancel confirmation modal
  const [cancelModal, setCancelModal] = useState({ show: false, interviewId: null });
  const [cancelling, setCancelling] = useState(false);

  // HR real‑time waiting candidate
  const [waitingCandidate, setWaitingCandidate] = useState(null);

  // Fetch interviews (with pagination)
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

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      await fetchInterviews(1, false);
      setLoading(false);
    };
    load();
  }, []);

  // Load more
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchInterviews(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  // Cancel interview
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

  // ✅ Socket listener for HR with async/await (fixed)
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
        console.log('🔥 HR received candidate-waiting event:', data);
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

  // Helper for status badge
  const getStatusBadge = (status) => {
    const colors = {
      Scheduled: 'bg-yellow-100 text-yellow-800',
      InProgress: 'bg-blue-100 text-blue-800',
      Completed: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  // Manual accept fallback (Pending Candidates button)
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
      console.error(err);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <NavBar />
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-6">My Interviews</h1>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-4 rounded shadow animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Interviews</h1>
          <div className="flex gap-2">
            {user?.role === 'HR' && (
              <button
                onClick={handlePendingCandidates}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Pending Candidates
              </button>
            )}
            {user?.role === 'HR' && (
              <Link
                to="/create-interview"
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                + Create Interview
              </Link>
            )}
          </div>
        </div>

        {interviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No interviews scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map(interview => (
              <div key={interview._id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">{interview.position}</h2>
                    <p className="text-gray-600 text-sm">
                      {new Date(interview.date).toDateString()} at {interview.time}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {interview.candidateId?.name || 'Candidate'} (Candidate)
                    </p>
                    <div className="mt-2">{getStatusBadge(interview.status)}</div>
                  </div>
                  <div className="space-x-2">
                    {interview.status === 'Scheduled' && (
                      <>
                        <button
                          onClick={() => handleCancelClick(interview._id)}
                          className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          Cancel
                        </button>
                        {user?.role === 'Candidate' && (
                          <Link
                            to={`/waiting-room/${interview._id}`}
                            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            Join
                          </Link>
                        )}
                        {user?.role === 'HR' && (
                          <span className="px-3 py-1 text-sm text-gray-500 italic">
                            Waiting for candidate
                          </span>
                        )}
                      </>
                    )}
                    {interview.status === 'InProgress' && (
                      <Link
                        to={`/video/${interview._id}`}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        {user?.role === 'Candidate' ? 'Join Call' : 'Start Call'}
                      </Link>
                    )}
                    {interview.status === 'Completed' && (
                      <Link
                        to={`/interview/${interview._id}`}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        View Details
                      </Link>
                    )}
                    {interview.status === 'Cancelled' && (
                      <Link
                        to={`/interview/${interview._id}`}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Details
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && interviews.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Cancel Interview</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this interview?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setCancelModal({ show: false, interviewId: null })}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                No
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HR Waiting Candidate Floating Card */}
      {waitingCandidate && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border-l-4 border-indigo-600 p-4 w-80 z-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">Candidate Waiting</h3>
              <p className="text-sm text-gray-600">{waitingCandidate.candidateName}</p>
              <p className="text-xs text-gray-500">{waitingCandidate.position}</p>
            </div>
            <button
              onClick={() => setWaitingCandidate(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => {
                try {
                  await api.post(`/interviews/${waitingCandidate.interviewId}/accept`);
                  navigate(`/video/${waitingCandidate.interviewId}`);
                } catch (err) {
                  toast.error('Accept failed');
                } finally {
                  setWaitingCandidate(null);
                }
              }}
              className="flex-1 bg-green-600 text-white py-1 rounded hover:bg-green-700"
            >
              Accept
            </button>
            <button
              onClick={async () => {
                try {
                  await api.put(`/interviews/${waitingCandidate.interviewId}`, { action: 'cancel' });
                  toast.success('Rejected');
                  setPage(1);
                  await fetchInterviews(1, false);
                } catch (err) {
                  toast.error('Reject failed');
                } finally {
                  setWaitingCandidate(null);
                }
              }}
              className="flex-1 bg-red-600 text-white py-1 rounded hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;