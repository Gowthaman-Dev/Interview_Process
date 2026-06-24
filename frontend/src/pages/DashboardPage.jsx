import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import socketService from '../services/socket';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, Briefcase, Video, CheckCircle, XCircle, Loader2, Users, MessageCircle, Trash2, Search, Filter, ChevronLeft, ChevronRight, AlertCircle, Plus, MoreHorizontal, X } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Modals
  const [cancelModal, setCancelModal] = useState({ show: false, interviewId: null });
  const [cancelling, setCancelling] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, interviewId: null, bulk: false });
  const [deleting, setDeleting] = useState(false);

  const [waitingCandidate, setWaitingCandidate] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search/filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, filterStatus]);

  // Fetch interviews with pagination
  const fetchInterviews = useCallback(async (pageNum) => {
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: 5,
        search: debouncedSearchTerm,
        status: filterStatus,
      });
      const { data } = await api.get(`/interviews?${params}`);
      setInterviews(data.interviews);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError('Failed to load interviews');
      toast.error('Could not load interviews');
    }
  }, [debouncedSearchTerm, filterStatus]);

  // Initial load and page changes
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setSelectedIds(new Set());
      setSelectAll(false);
      setIsSearching(true);
      await fetchInterviews(page);
      setIsSearching(false);
      setLoading(false);
    };
    load();
  }, [page, fetchInterviews]);

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Selection handlers
  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
    setSelectAll(newSet.size === interviews.length && interviews.length > 0);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      const allIds = interviews.map(i => i._id);
      setSelectedIds(new Set(allIds));
    }
    setSelectAll(!selectAll);
  };

  // Cancel
  const handleCancelClick = (interviewId) => {
    setCancelModal({ show: true, interviewId });
  };

  const confirmCancel = async () => {
    if (!cancelModal.interviewId) return;
    setCancelling(true);
    try {
      await api.put(`/interviews/${cancelModal.interviewId}`, { action: 'cancel' });
      toast.success('Interview cancelled');
      await fetchInterviews(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    } finally {
      setCancelling(false);
      setCancelModal({ show: false, interviewId: null });
    }
  };

  // Delete (single & bulk)
  const handleDeleteClick = (interviewId = null, bulk = false) => {
    setDeleteModal({ show: true, interviewId, bulk });
  };

  const confirmDelete = async () => {
    if (deleteModal.bulk) {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) {
        toast.error('No interviews selected');
        setDeleteModal({ show: false, interviewId: null, bulk: false });
        return;
      }
      setDeleting(true);
      try {
        await Promise.all(ids.map(id => api.delete(`/interviews/${id}`)));
        toast.success(`${ids.length} interview(s) deleted`);
        setSelectedIds(new Set());
        setSelectAll(false);
        await fetchInterviews(page);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Delete failed');
      } finally {
        setDeleting(false);
        setDeleteModal({ show: false, interviewId: null, bulk: false });
      }
    } else {
      if (!deleteModal.interviewId) return;
      setDeleting(true);
      try {
        await api.delete(`/interviews/${deleteModal.interviewId}`);
        toast.success('Interview deleted');
        await fetchInterviews(page);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Delete failed');
      } finally {
        setDeleting(false);
        setDeleteModal({ show: false, interviewId: null, bulk: false });
      }
    }
  };

  // Socket listener for HR
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
      Scheduled: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/50', icon: Calendar },
      InProgress: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/50', icon: Video },
      Completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/50', icon: CheckCircle },
      Cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/50', icon: XCircle },
    };
    const { bg, text, border, icon: Icon } = config[status] || config.Scheduled;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-semibold border ${bg} ${text} ${border}`}>
        <Icon size={14} />
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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavBar />
        <div className="max-w-6xl w-full mx-auto p-6 lg:p-8 flex-1 mt-8">
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 bg-slate-200 rounded-lg w-48 animate-pulse"></div>
            <div className="h-10 bg-slate-200 rounded-xl w-32 animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavBar />
        <div className="max-w-xl mx-auto p-8 mt-20 text-center glass-panel rounded-3xl">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-[#0F172A] text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavBar />
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 animate-fade-in">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight mb-1">Interviews</h1>
            <p className="text-slate-500 font-medium text-sm">Manage and review your upcoming and past sessions.</p>
          </div>
          <div className="flex gap-3">
            {user?.role === 'HR' && (
              <button onClick={handlePendingCandidates} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover-lift">
                <Users size={16} /> Pending
              </button>
            )}
            {user?.role === 'HR' && (
              <Link to="/create-interview" className="flex items-center gap-2 bg-[#0F172A] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-sm hover-lift">
                <Plus size={18} /> New Interview
              </Link>
            )}
          </div>
        </div>

        {/* Toolbar: Search, Filter, Bulk Actions */}
        <div className="flex flex-wrap lg:flex-nowrap gap-4 mb-8">
          <div className="flex-1 relative min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by role or candidate name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] shadow-sm font-medium text-slate-700 placeholder:text-slate-400"
            />
            {isSearching && (
              <Loader2 size={16} className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[#06B6D4] animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
              <Filter size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 appearance-none bg-transparent focus:outline-none focus:ring-0 font-medium text-slate-700 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="InProgress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            
            {selectedIds.size > 0 && (
              <button
                onClick={() => handleDeleteClick(null, true)}
                className="flex items-center justify-center gap-1.5 bg-white border border-rose-200 text-rose-600 font-semibold px-4 py-2.5 rounded-xl hover:bg-rose-50 transition-all shadow-sm"
              >
                <Trash2 size={16} /> <span className="hidden sm:inline">Delete Selected ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {interviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 glass-panel rounded-3xl border border-slate-200 border-dashed text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Briefcase size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No interviews found</h3>
            <p className="text-slate-500 font-medium max-w-sm">We couldn't find any interviews matching your current criteria. Try adjusting your search or filters.</p>
            {user?.role === 'HR' && (
              <Link to="/create-interview" className="mt-6 px-5 py-2.5 bg-[#0F172A] text-white font-semibold rounded-xl hover:bg-slate-800 transition-all hover-lift">
                Schedule an Interview
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Select All Checkbox - Desktop Only */}
              {interviews.length > 0 && (
                <div className="hidden sm:flex items-center gap-3 px-6 py-2">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 border-slate-300 rounded text-[#06B6D4] focus:ring-[#06B6D4] cursor-pointer transition-all"
                    />
                  </div>
                  <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Select All</label>
                </div>
              )}
              
              {/* Interview Cards */}
              {interviews.map((interview, index) => (
                <div 
                  key={interview._id} 
                  className={`glass-panel rounded-2xl p-5 sm:p-6 transition-all duration-300 border-l-4 hover:-translate-y-0.5 hover:shadow-lg ${
                    interview.status === 'Scheduled' ? 'border-l-amber-400' :
                    interview.status === 'InProgress' ? 'border-l-indigo-400' :
                    interview.status === 'Completed' ? 'border-l-emerald-400' :
                    'border-l-rose-400'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                    
                    {/* Checkbox */}
                    <div className="hidden sm:flex items-center h-full">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(interview._id)}
                        onChange={() => toggleSelect(interview._id)}
                        className="w-5 h-5 border-slate-300 rounded text-[#06B6D4] focus:ring-[#06B6D4] cursor-pointer transition-all"
                      />
                    </div>

                    <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      
                      {/* Main Info */}
                      <div className="lg:col-span-5 space-y-2">
                        <div className="flex items-center gap-3 justify-between sm:justify-start">
                          <h2 className="text-lg font-bold text-[#0F172A] truncate" title={interview.position}>
                            {interview.position}
                          </h2>
                          <div className="sm:hidden">{getStatusBadge(interview.status)}</div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                          <User size={16} className="text-slate-400" />
                          <span>{interview.candidateId?.name || 'Candidate'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-xs">{user?.role === 'HR' ? 'Candidate' : 'Interviewer'}</span>
                        </div>
                      </div>

                      {/* Date & Time Info */}
                      <div className="lg:col-span-4 flex flex-col justify-center space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Calendar size={16} className="text-slate-400" />
                          {new Date(interview.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                          <Clock size={16} className="text-slate-400" />
                          {interview.time}
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="lg:col-span-3 flex flex-row lg:flex-col justify-between items-center lg:items-end gap-3 w-full border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0">
                        <div className="hidden sm:block mb-2">
                          {getStatusBadge(interview.status)}
                        </div>

                        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                          {interview.status === 'Scheduled' && (
                            <>
                              <button onClick={() => handleCancelClick(interview._id)} className="px-3.5 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
                              {user?.role === 'Candidate' && (
                                <Link to={`/waiting-room/${interview._id}`} className="px-3.5 py-2 text-sm font-semibold bg-[#0F172A] text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm">Join</Link>
                              )}
                              {user?.role === 'HR' && (
                                <span className="px-3 py-2 text-xs font-semibold text-amber-600 bg-amber-50 rounded-lg border border-amber-200/50">Awaiting Candidate</span>
                              )}
                            </>
                          )}
                          
                          {interview.status === 'InProgress' && (
                            <Link to={`/video/${interview._id}`} className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 flex items-center gap-1.5 animate-pulse">
                              <Video size={16} />
                              {user?.role === 'Candidate' ? 'Join Call' : 'Start Call'}
                            </Link>
                          )}
                          
                          {interview.status !== 'InProgress' && (
                            <>
                              <Link to={`/interview/${interview._id}`} className="px-3.5 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                                Details
                              </Link>
                              {interview.status === 'Completed' && (
                                <Link to={`/chat/${interview._id}`} className="p-2 text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-[#06B6D4] transition-colors shadow-sm" title="View Chat/Feedback">
                                  <MessageCircle size={18} />
                                </Link>
                              )}
                              <button onClick={() => handleDeleteClick(interview._id)} className="p-2 text-slate-400 bg-white border border-slate-200 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-sm" title="Delete">
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-10 space-x-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${
                    page === 1
                      ? 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                      : 'border-slate-300 text-slate-700 hover:bg-white hover:shadow-sm bg-white'
                  }`}
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="hidden sm:flex space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`w-10 h-10 rounded-xl border font-semibold transition-all ${
                        p === page
                          ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                
                <div className="sm:hidden flex items-center px-4 font-semibold text-slate-600">
                  Page {page} of {totalPages}
                </div>

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${
                    page === totalPages
                      ? 'border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                      : 'border-slate-300 text-slate-700 hover:bg-white hover:shadow-sm bg-white'
                  }`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancel Modal */}
      {cancelModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-5 mx-auto">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-[#0F172A] mb-2">Cancel Interview</h3>
            <p className="text-center text-slate-500 font-medium mb-8">Are you sure you want to cancel this interview? This action will notify the candidate.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelModal({ show: false, interviewId: null })} className="flex-1 px-4 py-2.5 font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Go Back</button>
              <button onClick={confirmCancel} disabled={cancelling} className="flex-1 px-4 py-2.5 font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors flex justify-center items-center">
                {cancelling ? <Loader2 size={18} className="animate-spin" /> : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-5 mx-auto">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-[#0F172A] mb-2">Delete Interview{deleteModal.bulk ? 's' : ''}</h3>
            <p className="text-center text-slate-500 font-medium mb-8">
              {deleteModal.bulk
                ? `Are you sure you want to permanently delete ${selectedIds.size} selected interview(s)? This cannot be undone.`
                : 'Are you sure you want to permanently delete this interview? This cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ show: false, interviewId: null, bulk: false })} className="flex-1 px-4 py-2.5 font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Keep It</button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 px-4 py-2.5 font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors flex justify-center items-center">
                {deleting ? <Loader2 size={18} className="animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HR Waiting Card Notification */}
      {waitingCandidate && (
        <div className="fixed bottom-6 right-6 glass-panel rounded-2xl shadow-2xl border border-slate-200 p-5 w-80 z-50 animate-slide-up">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                <Video size={18} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">Candidate Waiting</h3>
                <p className="text-xs font-semibold text-slate-500">{waitingCandidate.candidateName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{waitingCandidate.position}</p>
              </div>
            </div>
            <button onClick={() => setWaitingCandidate(null)} className="text-slate-400 hover:text-slate-700 p-1 bg-slate-50 rounded-md">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => {
              try {
                await api.post(`/interviews/${waitingCandidate.interviewId}/accept`);
                navigate(`/video/${waitingCandidate.interviewId}`);
              } catch (err) { toast.error('Accept failed'); }
              finally { setWaitingCandidate(null); }
            }} className="flex-1 bg-indigo-600 text-white font-semibold py-2 text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
              Admit Now
            </button>
            <button onClick={async () => {
              try {
                await api.put(`/interviews/${waitingCandidate.interviewId}`, { action: 'cancel' });
                toast.success('Rejected');
                await fetchInterviews(page);
              } catch (err) { toast.error('Reject failed'); }
              finally { setWaitingCandidate(null); }
            }} className="flex-1 bg-white border border-slate-200 text-slate-600 font-semibold py-2 text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;