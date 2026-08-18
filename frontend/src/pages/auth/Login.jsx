import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Gamepad2, Mail, Lock, Smartphone, KeyRound } from 'lucide-react';
import { login, requestOtp, verifyOtp, clearError, clearOtpState } from '../../store/slices/authSlice';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, otpSent, otpDevCode, isAuthenticated } = useSelector((state) => state.auth);

  const [mode, setMode] = useState('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) toast.error(error);
    dispatch(clearError());
  }, [error, dispatch]);

  useEffect(() => {
    dispatch(clearOtpState());
  }, [dispatch, mode]);

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Welcome back!');
      navigate(result.payload.user?.role === 'platform_admin' ? '/admin' : '/app', { replace: true });
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    await dispatch(requestOtp(mobile));
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const result = await dispatch(verifyOtp({ mobile, code }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Logged in!');
      navigate('/app', { replace: true });
    }
  };

  const inputClass =
    'w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">TurfBook</h1>
              <p className="text-sm text-slate-500">Sign in to your account</p>
            </div>
          </div>

          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('staff')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'staff' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500'}`}
            >
              Staff login
            </button>
            <button
              type="button"
              onClick={() => setMode('otp')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'otp' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500'}`}
            >
              Customer OTP
            </button>
          </div>

          {mode === 'staff' ? (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      pattern="01[3-9][0-9]{8}"
                      placeholder="Mobile number (e.g. 01712345678)"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
                  >
                    {loading ? 'Sending…' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  {otpDevCode && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Development mode — your OTP is <strong>{otpDevCode}</strong>
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
                  >
                    {loading ? 'Verifying…' : 'Verify & continue'}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch(clearOtpState())}
                    className="w-full text-sm text-slate-500 hover:text-slate-700"
                  >
                    Change number
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Own a facility?{' '}
              <Link to="/apply" className="text-primary-600 font-medium hover:underline">
                Apply to list it on TurfBook
              </Link>
            </p>
            <Link to="/" className="block mt-2 text-xs text-slate-400 hover:text-slate-600">
              ← Back to TurfBook
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;