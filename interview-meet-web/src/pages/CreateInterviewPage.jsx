import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SearchPage from './SearchPage';
import toast from 'react-hot-toast';

const CreateInterviewPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    position: '',
    date: '',
    time: '',
    duration: 60,
  });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user types
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!selectedCandidate) newErrors.candidate = 'Please select a candidate';
    if (!formData.position.trim()) newErrors.position = 'Position is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    if (formData.duration < 15 || formData.duration > 180)
      newErrors.duration = 'Duration must be between 15 and 180 minutes';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        candidateId: selectedCandidate._id,
        position: formData.position,
        date: formData.date,
        time: formData.time,
        duration: Number(formData.duration),
      };
      const { data } = await api.post('/interviews', payload);
      toast.success('Interview scheduled successfully!');
      navigate('/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message;
      if (msg && (msg.includes('already booked') || msg.includes('busy'))) {
        toast.error('Time conflict: The candidate or you already have an interview at this time');
      } else {
        toast.error(msg || 'Failed to create interview');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (candidate) => {
    setSelectedCandidate(candidate);
    setShowSearchModal(false);
    if (errors.candidate) setErrors(prev => ({ ...prev, candidate: '' }));
  };

  // HR only – if user role is not HR, redirect or show access denied
  if (user?.role !== 'HR') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2">Only HR users can create interviews.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Schedule New Interview</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Candidate Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Candidate <span className="text-red-500">*</span>
            </label>
            {selectedCandidate ? (
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border">
                <div>
                  <p className="font-medium">{selectedCandidate.name}</p>
                  <p className="text-sm text-gray-500">{selectedCandidate.email}</p>
                  {selectedCandidate.skills?.length > 0 && (
                    <p className="text-xs text-gray-400">Skills: {selectedCandidate.skills.join(', ')}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="w-full bg-gray-100 border border-gray-300 rounded-md py-2 px-4 text-left hover:bg-gray-200 transition"
              >
                + Select Candidate
              </button>
            )}
            {errors.candidate && <p className="text-red-500 text-xs mt-1">{errors.candidate}</p>}
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Position</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Frontend Developer"
            />
            {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="mt-1 w-full border rounded-md px-3 py-2"
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Time</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="mt-1 w-full border rounded-md px-3 py-2"
              />
              {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
            </div>
          </div>

          {/* Duration (minutes) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              min="15"
              max="180"
              step="15"
              className="mt-1 w-full border rounded-md px-3 py-2"
            />
            {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Scheduling...
              </>
            ) : (
              'Schedule Interview'
            )}
          </button>
        </form>
      </div>

      {/* Candidate Search Modal */}
      {showSearchModal && (
        <SearchPage
          onSelectUser={handleSelectCandidate}
          onClose={() => setShowSearchModal(false)}
        />
      )}
    </div>
  );
};

export default CreateInterviewPage;