import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SearchPage from './SearchPage';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';
import { Calendar, Clock, Briefcase, UserPlus } from 'lucide-react';

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
      await api.post('/interviews', payload);
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

  if (user?.role !== 'HR') {
    return (
      <div>
        <NavBar />
        <div className="max-w-md mx-auto p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">Only HR users can create interviews.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavBar />
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Schedule New Interview</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Candidate Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Candidate <span className="text-red-500">*</span>
              </label>
              {selectedCandidate ? (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div>
                    <p className="font-medium text-[#0F172A]">{selectedCandidate.name}</p>
                    <p className="text-sm text-gray-500">{selectedCandidate.email}</p>
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
                  className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-xl py-3 hover:bg-gray-100 transition-colors"
                >
                  <UserPlus size={18} />
                  Select Candidate
                </button>
              )}
              {errors.candidate && <p className="text-red-500 text-xs mt-1">{errors.candidate}</p>}
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent transition-all"
                  placeholder="e.g., Frontend Developer"
                />
              </div>
              {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent"
                  />
                </div>
                {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="15"
                max="180"
                step="15"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent"
              />
              {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F172A] text-white py-2.5 rounded-xl font-medium hover:bg-[#1E293B] hover:shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Schedule Interview'}
            </button>
          </form>
        </div>
      </div>

      {/* Candidate Search Modal */}
      {showSearchModal && (
        <SearchPage onSelectUser={handleSelectCandidate} onClose={() => setShowSearchModal(false)} />
      )}
    </div>
  );
};

export default CreateInterviewPage;