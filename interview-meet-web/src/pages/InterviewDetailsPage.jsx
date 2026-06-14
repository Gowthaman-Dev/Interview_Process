import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';
import {
  Calendar, Clock, User, Mail, Briefcase, FileText, MessageSquare, Star,
  CheckCircle, XCircle, Video, AlertCircle, Edit, Trash2, Send
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
      Scheduled: { icon: Calendar, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
      InProgress: { icon: Video, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      Completed: { icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      Cancelled: { icon: XCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    };
    const { icon: Icon, bg, text, border } = config[status] || config.Scheduled;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text} border ${border}`}>
        <Icon size={12} />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div>
        <NavBar />
        <div className="max-w-4xl mx-auto p-6 animate-pulse">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 space-y-6">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-32 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div>
        <NavBar />
        <div className="max-w-4xl mx-auto p-6 text-center">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{error || 'Interview not found'}</p>
            <Link to="/dashboard" className="mt-4 inline-block px-5 py-2 bg-[#0F172A] text-white rounded-xl hover:bg-[#1E293B] transition">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isHR = user?.role === 'HR';
  const isCandidate = user?.role === 'Candidate';

  return (
    <div>
      <NavBar />
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-100 px-6 py-5 bg-gradient-to-r from-gray-50 to-white">
            <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] tracking-tight">
              {interview.position}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {getStatusBadge(interview.status)}
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Calendar size={14} />
                {new Date(interview.date).toDateString()}
              </div>
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Clock size={14} />
                {interview.time}
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-8">
            {/* Candidate & HR Info - 2 column grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Candidate Card */}
              <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#0F172A]/10 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-[#0F172A]" />
                  </div>
                  <h2 className="font-semibold text-[#0F172A]">Candidate</h2>
                </div>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium text-gray-600">Name:</span> {interview.candidateId?.name || 'N/A'}</p>
                  <p className="text-sm flex items-center gap-1"><Mail size={12} className="text-gray-400"/> {interview.candidateId?.email || 'N/A'}</p>
                  {interview.candidateId?.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {interview.candidateId.skills.map(skill => (
                        <span key={skill} className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* HR Card */}
              <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#06B6D4]/10 rounded-full flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-[#06B6D4]" />
                  </div>
                  <h2 className="font-semibold text-[#0F172A]">HR Contact</h2>
                </div>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium text-gray-600">Name:</span> {interview.hrId?.name || 'N/A'}</p>
                  <p className="text-sm flex items-center gap-1"><Mail size={12} className="text-gray-400"/> {interview.hrId?.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Meeting Link (if scheduled) */}
            {interview.status === 'Scheduled' && interview.meetLink && (
              <div className="bg-cyan-50/50 rounded-xl p-4 border border-cyan-100">
                <h2 className="text-sm font-semibold text-cyan-700 mb-2 flex items-center gap-1"><Video size={14} /> Meeting Link</h2>
                <a href={interview.meetLink} target="_blank" rel="noopener noreferrer" className="text-[#06B6D4] hover:underline break-all text-sm">
                  {interview.meetLink}
                </a>
              </div>
            )}

            {/* Duration (completed) */}
            {interview.status === 'Completed' && interview.duration && (
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Duration</p>
                  <p className="text-lg font-semibold text-[#0F172A]">{interview.duration} minutes</p>
                </div>
              </div>
            )}

            {/* Feedback Section (Candidate only) */}
            {isCandidate && interview.status === 'Completed' && (
              <div className="bg-yellow-50/40 rounded-xl p-4 border border-yellow-100">
                <h2 className="font-semibold text-[#0F172A] mb-2 flex items-center gap-1"><Star size={16} className="text-yellow-500"/> Feedback</h2>
                {feedback ? (
                  <div>
                    <div className="flex gap-1 mb-2">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={18} className={star <= feedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} />
                      ))}
                    </div>
                    <p className="text-gray-700 text-sm">{feedback.comment}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No feedback yet.</p>
                )}
              </div>
            )}

            {/* Submit Feedback Button (HR only) */}
            {isHR && interview.status === 'Completed' && !feedback && (
              <div className="flex justify-end">
                <Link to={`/feedback/${interview._id}`} className="inline-flex items-center gap-1.5 bg-[#0F172A] text-white px-4 py-2 rounded-xl hover:bg-[#1E293B] transition shadow-sm">
                  <Edit size={14} /> Submit Feedback
                </Link>
              </div>
            )}

            {/* Notes Section (HR only) */}
            {isHR && (
              <div className="border-t border-gray-100 pt-6">
                <h2 className="font-semibold text-[#0F172A] mb-3 flex items-center gap-1"><FileText size={16} /> Internal Notes</h2>
                <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent transition"
                  />
                  <button type="submit" disabled={submittingNote} className="bg-[#06B6D4] text-white px-4 py-2 rounded-xl hover:bg-[#0891B2] transition disabled:opacity-50 flex items-center gap-1">
                    <Send size={14} /> Add
                  </button>
                </form>
                {notes.length === 0 ? (
                  <p className="text-gray-400 text-sm">No notes yet.</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {notes.map(note => (
                      <div key={note._id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-sm text-gray-700">{note.note}</p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock size={10} /> {new Date(note.createdAt).toLocaleString()} by {note.hrId?.name || 'HR'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="border-t border-gray-100 pt-6 flex flex-wrap gap-3">
              {interview.status === 'Scheduled' && (
                <>
                  <Link to={`/waiting-room/${id}`} className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition shadow-sm flex items-center gap-1">
                    <Video size={16} /> Join Interview
                  </Link>
                  {isHR && (
                    <button onClick={async () => {
                      if (window.confirm('Cancel this interview?')) {
                        try {
                          await api.put(`/interviews/${id}`, { action: 'cancel' });
                          toast.success('Interview cancelled');
                          navigate('/dashboard');
                        } catch (err) {
                          toast.error('Cancel failed');
                        }
                      }
                    }} className="px-5 py-2.5 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition flex items-center gap-1">
                      <Trash2 size={16} /> Cancel
                    </button>
                  )}
                </>
              )}
              {interview.status === 'InProgress' && (
                <Link to={`/video/${id}`} className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-1">
                  <Video size={16} /> Join Ongoing Call
                </Link>
              )}
              {interview.status === 'Completed' && (
                <Link to={`/chat/${id}`} className="px-5 py-2.5 bg-[#0F172A] text-white rounded-xl hover:bg-[#1E293B] transition flex items-center gap-1">
                  <MessageSquare size={16} /> Chat
                </Link>
              )}
            </div>

            <div className="text-xs text-gray-400 border-t border-gray-100 pt-4 text-right">
              Created {new Date(interview.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDetailsPage;