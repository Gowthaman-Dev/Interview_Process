import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Eye, EyeOff, Briefcase, Users, Video, ChevronRight, CheckCircle2 } from 'lucide-react';

const TypingEffect = ({ words }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWordIndex];
    let timeoutId;

    if (isDeleting) {
      if (currentText === '') {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
        timeoutId = setTimeout(() => {}, 500);
      } else {
        timeoutId = setTimeout(() => setCurrentText(word.substring(0, currentText.length - 1)), 50);
      }
    } else {
      if (currentText === word) {
        timeoutId = setTimeout(() => setIsDeleting(true), 2000);
      } else {
        timeoutId = setTimeout(() => setCurrentText(word.substring(0, currentText.length + 1)), 100);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [currentText, isDeleting, currentWordIndex, words]);

  return (
    <span className="inline-flex items-center min-h-[40px]">
      <span className="text-[#06B6D4] font-semibold">{currentText}</span>
      <span className="ml-1 w-[3px] h-[30px] bg-slate-400 animate-pulse rounded-full"></span>
    </span>
  );
};

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
    <div className="flex min-h-screen bg-slate-50">
      
      {/* Left Panel - Registration Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 bg-white relative shadow-2xl z-10">
        <div className="w-full max-w-md mx-auto animate-fade-in py-12">
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-md">
              <Video className="w-5 h-5 text-[#06B6D4]" />
            </div>
            <span className="text-xl font-bold text-[#0F172A] tracking-tight">InterviewMeet</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight mb-2">Create an account</h2>
            <p className="text-slate-500 font-medium h-8">
              <TypingEffect words={["Join the future of hiring.", "Accelerate your career.", "Conduct better interviews.", "Built for modern recruitment."]} />
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-[#06B6D4] transition-colors" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] focus:bg-white transition-all shadow-sm"
                  placeholder="Jane Doe"
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs font-medium ml-1">{errors.name}</p>}
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-[#06B6D4] transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] focus:bg-white transition-all shadow-sm"
                  placeholder="jane@company.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs font-medium ml-1">{errors.email}</p>}
            </div>

            {/* Role Segmented Control */}
            <div className="space-y-1.5 pb-1">
              <label className="block text-sm font-semibold text-slate-700">I am joining as a</label>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole('Candidate')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    role === 'Candidate'
                      ? 'bg-white text-[#0F172A] shadow border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Users size={16} className={role === 'Candidate' ? 'text-[#06B6D4]' : ''} />
                  Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setRole('HR')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    role === 'HR'
                      ? 'bg-white text-[#0F172A] shadow border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Briefcase size={16} className={role === 'HR' ? 'text-[#06B6D4]' : ''} />
                  HR Professional
                </button>
              </div>
            </div>

            {/* Passwords - Grid for desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#06B6D4] transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] focus:bg-white transition-all shadow-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#06B6D4] transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs font-medium ml-1">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#06B6D4] transition-colors" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] focus:bg-white transition-all shadow-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#06B6D4] transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs font-medium ml-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#0F172A] hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover-lift"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating account...
                </>
              ) : (
                <>
                  Get Started <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#0F172A] hover:text-[#06B6D4] transition-colors">
              Sign in to dashboard
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Value Prop (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-col justify-center w-[45%] xl:w-1/2 bg-slate-50 p-12 relative overflow-hidden">
        <div className="max-w-md mx-auto relative z-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.05)] border border-slate-100">
            <h3 className="text-xl font-bold text-[#0F172A] mb-6 tracking-tight">Why enterprise teams choose us</h3>
            
            <div className="space-y-6">
              {[
                { title: "Collaborative Coding", desc: "Real-time editor with syntax highlighting and instant execution." },
                { title: "Crystal Clear Video", desc: "Low-latency WebRTC infrastructure for uninterrupted communication." },
                { title: "Structured Feedback", desc: "Standardized evaluation forms for unbiased hiring decisions." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="mt-1 bg-slate-100 p-2 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-[#06B6D4]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{item.title}</h4>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`w-10 h-10 rounded-full border-2 border-white bg-slate-${200 + i*100} flex items-center justify-center text-xs font-medium text-slate-700`}>
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm font-medium text-slate-600">
                  Join <strong className="text-slate-900">10,000+</strong> recruiters
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-[#06B6D4]/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[20%] left-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
      </div>
    </div>
  );
};

export default RegisterPage;