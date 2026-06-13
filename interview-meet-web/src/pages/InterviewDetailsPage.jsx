import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';

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

  if (loading) {
    return (
      <div>
        <NavBar />
        <div className="max-w-3xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div>
        <NavBar />
        <div className="max-w-3xl mx-auto p-6 text-center">
          <p className="text-red-500">{error || 'Interview not found'}</p>
          <Link to="/dashboard" className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white rounded">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isHR = user?.role === 'HR';
  const isCandidate = user?.role === 'Candidate';

  return (
    <div>
      <NavBar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b px-6 py-4 bg-gray-50">
            <h1 className="text-2xl font-bold">{interview.position}</h1>
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge(interview.status)}
              <span className="text-sm text-gray-500">
                {new Date(interview.date).toDateString()} at {interview.time}
              </span>
            </div>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Candidate Info */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Candidate</h2>
              <div className="bg-gray-50 p-3 rounded">
                <p><span className="font-medium">Name:</span> {interview.candidateId?.name || 'N/A'}</p>
                <p><span className="font-medium">Email:</span> {interview.candidateId?.email || 'N/A'}</p>
                {interview.candidateId?.skills?.length > 0 && (
                  <p><span className="font-medium">Skills:</span> {interview.candidateId.skills.join(', ')}</p>
                )}
              </div>
            </div>

            {/* HR Info */}
            <div>
              <h2 className="text-lg font-semibold mb-2">HR Contact</h2>
              <div className="bg-gray-50 p-3 rounded">
                <p><span className="font-medium">Name:</span> {interview.hrId?.name || 'N/A'}</p>
                <p><span className="font-medium">Email:</span> {interview.hrId?.email || 'N/A'}</p>
              </div>
            </div>

            {/* Meeting Link */}
            {interview.status === 'Scheduled' && interview.meetLink && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Meeting Link</h2>
                <a href={interview.meetLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                  {interview.meetLink}
                </a>
              </div>
            )}

            {/* ✅ Attendance Duration (only if completed) */}
            {interview.status === 'Completed' && interview.duration && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Duration</h2>
                <p className="text-gray-700">{interview.duration} minutes</p>
              </div>
            )}

            {/* ✅ Feedback View (Candidate only) */}
            {isCandidate && interview.status === 'Completed' && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Feedback</h2>
                {feedback ? (
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star} className={star <= feedback.rating ? 'text-yellow-500 text-xl' : 'text-gray-300 text-xl'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-700">{feedback.comment}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No feedback yet.</p>
                )}
              </div>
            )}

            {/* ✅ HR can submit feedback button (only if completed and no feedback) */}
            {isHR && interview.status === 'Completed' && !feedback && (
              <div>
                <Link
                  to={`/feedback/${interview._id}`}
                  className="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Submit Feedback
                </Link>
              </div>
            )}

            {/* ✅ Notes Section (HR only) */}
            {isHR && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Internal Notes</h2>
                <form onSubmit={handleAddNote} className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingNote}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </form>
                {notes.length === 0 ? (
                  <p className="text-gray-500 text-sm">No notes yet.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notes.map(note => (
                      <div key={note._id} className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-700">{note.note}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(note.createdAt).toLocaleString()} by {note.hrId?.name || 'HR'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="border-t pt-4 flex flex-wrap gap-3">
              {interview.status === 'Scheduled' && (
                <>
                  <Link to={`/waiting-room/${id}`} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    Join Interview
                  </Link>
                  {isHR && (
                    <button
                      onClick={async () => {
                        if (window.confirm('Cancel this interview?')) {
                          try {
                            await api.put(`/interviews/${id}`, { action: 'cancel' });
                            toast.success('Interview cancelled');
                            navigate('/dashboard');
                          } catch (err) {
                            toast.error('Cancel failed');
                          }
                        }
                      }}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}

              {interview.status === 'InProgress' && (
                <Link to={`/video/${id}`} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  Join Ongoing Call
                </Link>
              )}

              {interview.status === 'Completed' && (
                <Link to={`/chat/${id}`} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  💬 Chat
                </Link>
              )}
            </div>

            <div className="text-sm text-gray-400 mt-6">
              <p>Created: {new Date(interview.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDetailsPage;