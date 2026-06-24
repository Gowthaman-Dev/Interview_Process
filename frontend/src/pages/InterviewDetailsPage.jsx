import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';
import {
  Calendar, Clock, User, Mail, Briefcase, FileText, MessageSquare, Star,
  CheckCircle, XCircle, Video, AlertCircle, Edit, Trash2, Send, Loader2, ChevronRight
} from 'lucide-react';

const InterviewDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [interviewRes, feedbackRes, notesRes] = await Promise.all([
          api.get(`/interviews/${id}`),
          api.get(`/feedback/${id}`).catch(() => ({ data: { feedback: null } })),
          user?.role === 'HR' 
            ? api.get(`/notes/${id}`).catch(() => ({ data: { notes: [] } }))
            : Promise.resolve({ data: { notes: [] } }),
        ]);
        setInterview(interviewRes.data.interview);
        setFeedback(feedbackRes.data.feedback);
        if (user?.role === 'HR') setNotes(notesRes.data.notes);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load interview');
        toast.error('Could not load interview details');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, user]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      const { data } = await api.post('/notes', { interviewId: id, note: newNote });
      setNotes(prev => [data.note, ...prev]);
      setNewNote('');
      toast.success('Note added');
    } catch (err) {
      toast.error('Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      Scheduled: { icon: Calendar, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/50' },
      InProgress: { icon: Video, bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/50' },
      Completed: { icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/50' },
      Cancelled: { icon: XCircle, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/50' },
    };
    const { icon: Icon, bg, text, border } = config[status] || config.Scheduled;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-bold border shadow-sm ${bg} ${text} ${border}`}>
        <Icon size={14} />
        {status}
      </span>
    );
  };

  // ✅ Helper: fix Cloudinary URL and force download
  const getResumeDownloadUrl = (url) => {
    if (!url) return '';
    let fixed = url.replace('/image/upload/', '/raw/upload/');
    const separator = fixed.includes('?') ? '&' : '?';
    fixed += separator + 'fl_attachment=1&filename=resume.pdf';
    return fixed;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavBar />
        <div className="max-w-5xl mx-auto p-6 flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#06B6D4] animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavBar />
        <div className="max-w-xl w-full mx-auto p-8 mt-20 text-center glass-panel rounded-3xl animate-fade-in">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <p className="text-xl font-bold text-slate-900 mb-2">{error || 'Interview not found'}</p>
          <p className="text-slate-500 font-medium mb-6">The interview you are looking for does not exist or you don't have access.</p>
          <Link to="/dashboard" className="inline-block px-6 py-2.5 bg-[#0F172A] text-white font-semibold rounded-xl hover:bg-slate-800 transition shadow-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isHR = user?.role === 'HR';
  const isCandidate = user?.role === 'Candidate';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavBar />
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2">
            <span className="hover:text-[#0F172A] cursor-pointer transition-colors" onClick={() => navigate('/dashboard')}>Interviews</span>
            <ChevronRight size={14} />
            <span className="text-[#06B6D4]">Details</span>
          </div>
        </div>

        <div className="glass-panel rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-100 px-6 sm:px-8 py-6 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] tracking-tight mb-2">
                {interview.position}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-slate-400" />
                  {new Date(interview.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={16} className="text-slate-400" />
                  {interview.time}
                </div>
              </div>
            </div>
            <div>
              {getStatusBadge(interview.status)}
            </div>
          </div>

          <div className="px-6 sm:px-8 py-8 space-y-8 bg-slate-50/50">
            {/* Candidate & HR Info - 2 column grid */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Candidate Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <User size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#0F172A]">Candidate Profile</h2>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interviewee</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm flex items-center gap-2"><span className="w-16 font-semibold text-slate-600">Name:</span> <span className="font-medium text-[#0F172A]">{interview.candidateId?.name || 'N/A'}</span></p>
                  <p className="text-sm flex items-center gap-2"><span className="w-16 font-semibold text-slate-600">Email:</span> <span className="font-medium text-[#0F172A] truncate">{interview.candidateId?.email || 'N/A'}</span></p>
                  
                  {interview.candidateId?.skills?.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Top Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {interview.candidateId.skills.map(skill => (
                          <span key={skill} className="bg-slate-100 border border-slate-200 text-slate-700 font-medium text-xs px-2.5 py-1 rounded-md">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ✅ Resume download link */}
                  {interview.candidateId?.resumeUrl && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <a
                        href={getResumeDownloadUrl(interview.candidateId.resumeUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full gap-2 py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <FileText size={16} /> Download Resume
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* HR Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#06B6D4]/10 rounded-xl flex items-center justify-center text-[#06B6D4]">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#0F172A]">HR Contact</h2>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interviewer</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm flex items-center gap-2"><span className="w-16 font-semibold text-slate-600">Name:</span> <span className="font-medium text-[#0F172A]">{interview.hrId?.name || 'N/A'}</span></p>
                  <p className="text-sm flex items-center gap-2"><span className="w-16 font-semibold text-slate-600">Email:</span> <span className="font-medium text-[#0F172A] truncate">{interview.hrId?.email || 'N/A'}</span></p>
                </div>
              </div>
            </div>

            {/* Meeting Link (if scheduled) */}
            {interview.status === 'Scheduled' && interview.meetLink && (
              <div className="bg-cyan-50 rounded-2xl p-5 border border-cyan-200/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Video size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-cyan-800">Meeting Link generated</h2>
                    <a href={interview.meetLink} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-700 hover:underline text-sm font-medium break-all block mt-0.5">
                      {interview.meetLink}
                    </a>
                  </div>
                </div>
                <a href={interview.meetLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-cyan-600 text-white font-semibold text-sm rounded-xl hover:bg-cyan-700 shadow-sm transition-colors whitespace-nowrap">
                  Open Link
                </a>
              </div>
            )}

            {/* Duration (completed) */}
            {interview.status === 'Completed' && interview.duration && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Duration</p>
                  <p className="text-xl font-bold text-[#0F172A]">{interview.duration} Minutes</p>
                </div>
              </div>
            )}

            {/* Feedback Section (Candidate only) */}
            {isCandidate && interview.status === 'Completed' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h2 className="font-bold text-[#0F172A] mb-4 flex items-center gap-2 text-lg">
                  <Star size={20} className="text-amber-500" /> Interview Feedback
                </h2>
                {feedback ? (
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <div className="flex gap-1 mb-3">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={20} className={star <= feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                      ))}
                    </div>
                    <p className="text-slate-700 font-medium text-sm leading-relaxed">{feedback.comment}</p>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50 border border-slate-100 border-dashed rounded-xl">
                    <p className="text-slate-500 font-medium">Your interviewer hasn't provided feedback yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes Section (HR only) */}
            {isHR && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-[#0F172A] flex items-center gap-2 text-lg">
                    <FileText size={20} className="text-[#06B6D4]" /> Internal Notes
                  </h2>
                  <span className="text-xs font-semibold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">HR Only</span>
                </div>
                
                <form onSubmit={handleAddNote} className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="flex-1 relative group">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add an observation or note..."
                      className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] focus:bg-white transition-all shadow-sm font-medium text-sm text-[#0F172A]"
                    />
                  </div>
                  <button type="submit" disabled={submittingNote || !newNote.trim()} className="bg-[#0F172A] text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-sm whitespace-nowrap">
                    {submittingNote ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
                    Add Note
                  </button>
                </form>

                {notes.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-slate-100 border-dashed rounded-xl">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium text-sm">No internal notes added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {notes.map(note => (
                      <div key={note._id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm">
                        <p className="text-sm font-medium text-[#0F172A] leading-relaxed">{note.note}</p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/50">
                          <Clock size={12} className="text-slate-400" />
                          <p className="text-xs font-semibold text-slate-500">
                            {new Date(note.createdAt).toLocaleString()} <span className="mx-1">•</span> <span className="text-[#06B6D4]">{note.hrId?.name || 'HR'}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons Container */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
              {interview.status === 'Scheduled' && (
                <>
                  {isHR && (
                    <button onClick={async () => {
                      if (window.confirm('Are you sure you want to cancel this interview?')) {
                        try {
                          await api.put(`/interviews/${id}`, { action: 'cancel' });
                          toast.success('Interview cancelled');
                          navigate('/dashboard');
                        } catch (err) {
                          toast.error('Cancel failed');
                        }
                      }
                    }} className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-colors flex items-center gap-2 shadow-sm">
                      <Trash2 size={16} /> Cancel Interview
                    </button>
                  )}
                  <Link to={`/waiting-room/${id}`} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm hover-lift">
                    <Video size={18} /> Join Session
                  </Link>
                </>
              )}

              {interview.status === 'InProgress' && (
                <Link to={`/video/${id}`} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm hover-lift animate-pulse">
                  <Video size={18} /> Join Ongoing Call
                </Link>
              )}

              {interview.status === 'Completed' && (
                <>
                  {isHR && !feedback && (
                    <Link to={`/feedback/${interview._id}`} className="px-5 py-2.5 bg-white border border-slate-200 text-[#0F172A] font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 shadow-sm">
                      <Edit size={16} /> Submit Feedback
                    </Link>
                  )}
                  <Link to={`/chat/${id}`} className="px-6 py-2.5 bg-[#0F172A] text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm hover-lift">
                    <MessageSquare size={18} /> View Chat
                  </Link>
                </>
              )}
            </div>

          </div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs font-semibold text-slate-400">
            Interview ID: {interview._id} • Created {new Date(interview.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InterviewDetailsPage;