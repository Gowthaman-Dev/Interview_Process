import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import NavBar from '../components/NavBar';
import toast from 'react-hot-toast';
import { User, Mail, Code, FileText, Trash2, Upload, AlertTriangle, Loader2, Save, Download } from 'lucide-react';

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState('');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setSkills(user.skills?.join(', ') || '');
    }
  }, [user]);

  // ✅ Fix Cloudinary PDF URL: replace /image/upload/ → /raw/upload/
  // fl_attachment=1 forces download, filename sets the downloaded file name
  const getResumeUrl = (url) => {
    if (!url) return '';
    let fixed = url.replace('/image/upload/', '/raw/upload/');
    const separator = fixed.includes('?') ? '&' : '?';
    fixed += separator + 'fl_attachment=1&filename=resume.pdf';
    return fixed;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
      const { data } = await api.put('/users/profile', { name, skills: skillsArray });
      setUser(data.user);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);
    setUploading(true);
    try {
      const { data } = await api.post('/users/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Resume uploaded successfully');
      setUser({ ...user, resumeUrl: data.resumeUrl });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to delete your resume?')) return;
    setLoading(true);
    try {
      await api.delete('/users/resume');
      setUser({ ...user, resumeUrl: null });
      toast.success('Resume deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await api.delete('/users/account');
      toast.success('Account deleted');
      localStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#06B6D4] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavBar />
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 animate-fade-in">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Account Settings</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your personal information, skills, and resume.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center gap-2">
                <User size={20} className="text-[#06B6D4]" /> Personal Information
              </h2>
              
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400 group-focus-within:text-[#06B6D4] transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] focus:bg-white transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="block w-full pl-11 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Email cannot be changed once registered.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Skills & Expertise</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Code className="h-5 w-5 text-slate-400 group-focus-within:text-[#06B6D4] transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="e.g., React, Node.js, Python, System Design"
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Separate each skill with a comma.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 py-3 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#0F172A] hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-all hover-lift"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {loading ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Resume & Danger Zone */}
          <div className="space-y-6">
            
            {/* Resume Card */}
            <div className="glass-panel rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <FileText size={20} className="text-indigo-500" /> Resume / CV
              </h2>
              
              <div className="space-y-4">
                {user.resumeUrl ? (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-600">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">Resume.pdf</p>
                        <p className="text-xs font-medium text-slate-500">Uploaded</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2 border-t border-indigo-100/50">
                      <a
                        href={getResumeUrl(user.resumeUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 bg-white text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
                      >
                        <Download size={14} /> Download
                      </a>
                      <button
                        onClick={handleDeleteResume}
                        disabled={loading}
                        className="flex-1 flex justify-center items-center gap-1.5 py-2 px-3 bg-white text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-50 transition-colors shadow-sm"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 mb-1">No resume found</p>
                    <p className="text-xs text-slate-500 font-medium mb-4">Upload your PDF resume to share with HR.</p>
                  </div>
                )}

                <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer bg-white border border-slate-200 hover:border-[#06B6D4] hover:bg-slate-50 rounded-xl px-4 py-4 transition-all shadow-sm ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {uploading ? (
                    <Loader2 size={24} className="text-[#06B6D4] animate-spin mb-1" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 mb-1">
                      <Upload size={18} />
                    </div>
                  )}
                  <span className="text-sm font-bold text-slate-700">
                    {uploading ? 'Uploading...' : 'Upload New Resume'}
                  </span>
                  <span className="text-xs font-medium text-slate-400">PDF format, max 2MB</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleResumeUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="glass-panel rounded-3xl p-6 border-t-4 border-t-rose-500 shadow-sm">
              <h2 className="text-xl font-bold text-[#0F172A] mb-2 flex items-center gap-2">
                Danger Zone
              </h2>
              <p className="text-sm font-medium text-slate-500 mb-5">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 py-3 rounded-xl font-bold hover:bg-rose-50 transition-all shadow-sm"
              >
                <Trash2 size={18} /> Delete Account
              </button>
            </div>
            
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-5 mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-[#0F172A] mb-2">Delete Account</h3>
            <p className="text-center text-slate-500 font-medium mb-8">Are you absolutely sure? All your data, interviews, and resume will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={loading} className="flex-1 px-4 py-2.5 font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;