import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const SearchPage = ({ onSelectUser, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('name'); // 'name' or 'skill'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Search Users</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex space-x-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="name">By Name</option>
              <option value="skill">By Skill</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchType === 'name' ? 'Enter name...' : 'Enter skill...'}
              className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="overflow-y-auto max-h-96">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {!loading && searched && results.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No users found</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <ul className="divide-y">
                {results.map((user) => (
                  <li
                    key={user._id}
                    onClick={() => handleSelect(user)}
                    className="py-3 px-2 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    {user.skills?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Skills: {user.skills.join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;