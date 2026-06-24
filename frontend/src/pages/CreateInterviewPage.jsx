import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SearchPage from './SearchPage';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';
import { Calendar, Clock, Briefcase, UserPlus, Timer, ChevronRight, X, ShieldAlert, Loader2 } from 'lucide-react';

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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavBar />
        <div className="max-w-md w-full mx-auto p-8 mt-20 text-center glass-panel rounded-3xl animate-fade-in">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Access Restricted</h1>
          <p className="text-slate-500 font-medium mb-6">You must be logged in as an HR representative to schedule interviews.</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 bg-[#0F172A] text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavBar />
      <div className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2">
            <span className="hover:text-[#0F172A] cursor-pointer" onClick={() => navigate('/dashboard')}>Interviews</span>
            <ChevronRight size={14} />
            <span className="text-[#06B6D4]">Schedule New</span>
          </div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Schedule Interview</h1>
          <p className="text-slate-500 font-medium mt-1">Set up a new interview session with a candidate.</p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-7">
            
            {/* Candidate Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Select Candidate <span className="text-rose-500">*</span>
              </label>
              {selectedCandidate ? (
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                      {selectedCandidate.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#0F172A] text-sm">{selectedCandidate.name}</p>
                      <p className="text-xs font-medium text-slate-500">{selectedCandidate.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove Candidate"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSearchModal(true)}
                  className={`w-full flex flex-col items-center justify-center gap-2 bg-slate-50/50 border-2 border-dashed ${errors.candidate ? 'border-rose-300 bg-rose-50/50 text-rose-600' : 'border-slate-200 text-slate-500'} rounded-2xl py-8 hover:bg-slate-50 hover:border-slate-300 hover:text-[#0F172A] transition-all group`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${errors.candidate ? 'bg-rose-100' : 'bg-slate-100 group-hover:bg-[#06B6D4]/10 group-hover:text-[#06B6D4]'} transition-colors mb-1`}>
                    <UserPlus size={24} />
                  </div>
                  <span className="font-semibold text-sm">Browse Candidates</span>
                  <span className="text-xs font-medium opacity-70">Search from the talent pool</span>
                </button>
              )}
              {errors.candidate && <p className="text-rose-500 text-xs font-semibold mt-1.5">{errors.candidate}</p>}
            </div>

            <div className="h-px bg-slate-100 w-full"></div>

            {/* Position */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Interview Role / Position <span className="text-rose-500">*</span></label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Briefcase className={`h-5 w-5 transition-colors ${errors.position ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-[#06B6D4]'}`} />
                </div>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className={`block w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-sm ${errors.position ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400' : 'border-slate-200 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4]'}`}
                  placeholder="e.g., Senior Frontend Developer"
                />
              </div>
              {errors.position && <p className="text-rose-500 text-xs font-semibold mt-1.5">{errors.position}</p>}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Date <span className="text-rose-500">*</span></label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Calendar className={`h-5 w-5 transition-colors ${errors.date ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-[#06B6D4]'}`} />
                  </div>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={`block w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-sm ${errors.date ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400' : 'border-slate-200 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4]'}`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {errors.date && <p className="text-rose-500 text-xs font-semibold mt-1.5">{errors.date}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Time <span className="text-rose-500">*</span></label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Clock className={`h-5 w-5 transition-colors ${errors.time ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-[#06B6D4]'}`} />
                  </div>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className={`block w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-sm ${errors.time ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400' : 'border-slate-200 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4]'}`}
                  />
                </div>
                {errors.time && <p className="text-rose-500 text-xs font-semibold mt-1.5">{errors.time}</p>}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Duration (Minutes)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Timer className={`h-5 w-5 transition-colors ${errors.duration ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-[#06B6D4]'}`} />
                </div>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="15"
                  max="180"
                  step="15"
                  className={`block w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-sm ${errors.duration ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400' : 'border-slate-200 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4]'}`}
                />
              </div>
              {errors.duration && <p className="text-rose-500 text-xs font-semibold mt-1.5">{errors.duration}</p>}
              <p className="text-xs font-medium text-slate-500">Standard interview duration is typically 45-60 minutes.</p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#0F172A] hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover-lift"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Confirm & Schedule Interview'
                )}
              </button>
            </div>
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