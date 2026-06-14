import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';

const FeedbackPage = () => {
  const { interviewId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [interview, setInterview] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [feedbackRes, interviewRes] = await Promise.all([
          api.get(`/feedback/${interviewId}`).catch(() => ({ data: { feedback: null } })),
          api.get(`/interviews/${interviewId}`),
        ]);
        setExistingFeedback(feedbackRes.data.feedback);
        setInterview(interviewRes.data.interview);
        if (feedbackRes.data.feedback) {
          setRating(feedbackRes.data.feedback.rating);
          setComment(feedbackRes.data.feedback.comment);
        }
      } catch (err) {
        toast.error('Failed to load data');
      }
    };
    fetchData();
  }, [interviewId]);

  // Only HR can submit/update feedback
  if (user?.role !== 'HR') {
    return (
      <div>
        <NavBar />
        <div className="max-w-2xl mx-auto p-6 text-center">
          <p className="text-red-500">Only HR can submit feedback.</p>
          <button onClick={() => navigate(-1)} className="mt-3 text-indigo-600">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setLoading(true);
    try {
      if (existingFeedback) {
        toast.error('Feedback already submitted. Update not allowed.');
        return;
      }
      await api.post('/feedback', { interviewId, rating, comment });
      toast.success('Feedback submitted successfully');
      navigate(`/interview/${interviewId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <NavBar />
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-2">Interview Feedback</h1>
          {interview && (
            <p className="text-gray-600 mb-4">
              Position: {interview.position} | Candidate: {interview.candidateId?.name}
            </p>
          )}

          {existingFeedback ? (
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-700 font-semibold">Feedback already submitted:</p>
              <div className="mt-2">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={star <= existingFeedback.rating ? 'text-yellow-500 text-2xl' : 'text-gray-300 text-2xl'}>
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-gray-700">{existingFeedback.comment}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none text-3xl"
                    >
                      <span className={star <= (hoverRating || rating) ? 'text-yellow-500' : 'text-gray-300'}>
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                <textarea
                  rows="5"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Share your feedback about the candidate..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;