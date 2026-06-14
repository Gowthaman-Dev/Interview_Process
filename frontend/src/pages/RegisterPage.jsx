import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Eye, EyeOff, Briefcase, Video, Users } from 'lucide-react';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Candidate');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  // Typing animation
  const [typingText, setTypingText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const phrases = [
    "Connect. Interview. Hire.",
    "Find the Right Talent Faster.",
    "Schedule Interviews Seamlessly.",
    "Built for Modern Recruitment."
  ];

  useEffect(() => {
    const currentPhrase = phrases[textIndex];
    if (isDeleting) {
      if (charIndex > 0) {
        const timeout = setTimeout(() => {
          setTypingText(currentPhrase.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        }, 40);
        return () => clearTimeout(timeout);
      } else {
        setIsDeleting(false);
        setTextIndex((prev) => (prev + 1) % phrases.length);
      }
    } else {
      if (charIndex < currentPhrase.length) {
        const timeout = setTimeout(() => {
          setTypingText(currentPhrase.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 80);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => setIsDeleting(true), 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [charIndex, isDeleting, textIndex]);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.includes('@')) newErrors.email = 'Valid email required';
    if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const success = await register(name, email, password, role);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
      {/* Floating cyan glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#06B6D4]/15 rounded-full filter blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#06B6D4]/10 rounded-full filter blur-2xl -z-10"></div>

      {/* Card */}
      <div className="w-full max-w-md mx-4 animate-fadeInUp">
        <div className="bg-white/90 backdrop-blur-sm border border-white/40 rounded-2xl shadow-2xl p-8 transition-all duration-500">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center">
                <Video className="w-5 h-5 text-[#06B6D4]" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Create Your Account
            </h1>
            <div className="h-10 mt-2">
              <p className="text-gray-500 text-sm font-medium">
                {typingText}
                <span className="inline-block w-[2px] h-4 bg-[#06B6D4] ml-0.5 animate-pulse"></span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="group">
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#06B6D4] transition-colors duration-200" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent transition-all duration-200 text-[#0F172A] placeholder:text-gray-400"
                  placeholder="Full name"
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="group">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#06B6D4] transition-colors duration-200" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent transition-all duration-200 text-[#0F172A] placeholder:text-gray-400"
                  placeholder="Email address"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>}
            </div>

            {/* Role segmented control */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#0F172A]/80">I am joining as</label>
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole('Candidate')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                    role === 'Candidate'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-gray-600 hover:text-[#0F172A]'
                  }`}
                >
                  <Users size={14} />
                  Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setRole('HR')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                    role === 'HR'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-gray-600 hover:text-[#0F172A]'
                  }`}
                >
                  <Briefcase size={14} />
                  HR
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="group">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#06B6D4] transition-colors duration-200" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent transition-all duration-200 text-[#0F172A] placeholder:text-gray-400"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#06B6D4] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="group">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#06B6D4] transition-colors duration-200" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:border-transparent transition-all duration-200 text-[#0F172A] placeholder:text-gray-400"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#06B6D4] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 ml-1">{errors.confirmPassword}</p>}
            </div>

            {/* CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F172A] text-white py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#06B6D4]/25 active:scale-95 disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating account...
                </div>
              ) : (
                'Get Started'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#0F172A] font-medium hover:text-[#06B6D4] transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-[#06B6D4] after:transition-all hover:after:w-full"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-pulse {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;