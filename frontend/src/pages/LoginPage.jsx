import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ChevronRight, Video } from 'lucide-react';

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
      <span className="text-white font-semibold">{currentText}</span>
      <span className="ml-1 w-[3px] h-[30px] bg-[#06B6D4] animate-pulse rounded-full"></span>
    </span>
  );
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) navigate('/dashboard');
    else setError('Invalid email or password');
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Panel - Hero Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#0F172A] p-12 relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#06B6D4]/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Logo area */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-[#06B6D4]" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">InterviewMeet</span>
        </div>

        {/* Main Value Prop */}
        <div className="relative z-10 max-w-lg mt-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            The platform for <br />
            <TypingEffect words={['world-class hiring.', 'seamless interviews.', 'top engineering teams.', 'technical assessments.']} />
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            Join thousands of modern enterprises that trust InterviewMeet to conduct highly reliable, secure, and collaborative technical interviews at scale.
          </p>

          <div className="space-y-4">
            {[
              "Real-time synchronized coding environments",
              "Integrated HD video & audio communication",
              "Comprehensive candidate feedback management"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <CheckCircle2 className="w-5 h-5 text-[#06B6D4] flex-shrink-0" />
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof / Stats */}
        <div className="relative z-10 grid grid-cols-2 gap-8 mt-16 pt-8 border-t border-slate-700/50">
          <div>
            <div className="text-3xl font-bold text-white mb-1">99.99%</div>
            <div className="text-sm font-medium text-slate-400">Platform Uptime</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1">2M+</div>
            <div className="text-sm font-medium text-slate-400">Interviews Hosted</div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 bg-slate-50 relative">
        <div className="w-full max-w-md mx-auto animate-fade-in">
          
          {/* Mobile Logo (Visible only on small screens) */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-md">
              <Video className="w-5 h-5 text-[#06B6D4]" />
            </div>
            <span className="text-xl font-bold text-[#0F172A] tracking-tight">InterviewMeet</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight mb-2">Welcome back</h2>
            <p className="text-slate-500 font-medium">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-600 text-sm font-medium rounded-xl p-4 flex items-center justify-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-[#06B6D4] transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] transition-all shadow-sm"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <Link to="/forgot-password" className="text-sm font-semibold text-[#06B6D4] hover:text-[#0891B2] transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#06B6D4] transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/20 focus:border-[#06B6D4] transition-all shadow-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#06B6D4] transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#0F172A] hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover-lift"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to dashboard <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#0F172A] hover:text-[#06B6D4] transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;