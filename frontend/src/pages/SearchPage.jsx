import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, X, User, Mail, Code, Loader2, Users } from 'lucide-react';

const SearchPage = ({ onSelectUser, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('name');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const params = searchType === 'name' ? { name: searchTerm } : { skill: searchTerm };
      const { data } = await api.get('/users/search', { params });
      setResults(data.users);
    } catch (error) {
      toast.error('Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user) => {
    if (onSelectUser) {
      onSelectUser(user);
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0F172A]" />
            <h2 className="text-xl font-bold text-[#0F172A]">Search Users</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent transition-all"
            >
              <option value="name">By Name</option>
              <option value="skill">By Skill</option>
            </select>
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchType === 'name' ? 'Enter name...' : 'Enter skill...'}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-[#0F172A] text-white px-5 py-2.5 rounded-xl hover:bg-[#1E293B] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-96 space-y-2">
            {loading && (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin text-[#06B6D4]" />
              </div>
            )}

            {!loading && searched && results.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users size={40} className="mx-auto mb-2 text-gray-300" />
                <p>No users found</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-2">
                {results.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleSelect(user)}
                    className="bg-gray-50/50 hover:bg-gray-100 rounded-xl p-3 cursor-pointer transition-all duration-200 border border-transparent hover:border-[#06B6D4]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-[#0F172A]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-[#0F172A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#0F172A]">{user.name}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                          <Mail size={12} />
                          <span className="truncate">{user.email}</span>
                        </div>
                        {user.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {user.skills.slice(0, 3).map((skill, idx) => (
                              <span key={idx} className="inline-flex items-center gap-0.5 text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                                <Code size={10} /> {skill}
                              </span>
                            ))}
                            {user.skills.length > 3 && (
                              <span className="text-xs text-gray-400">+{user.skills.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/30">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SearchPage;