import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function RubberDuck() {
  return (
    <svg
      className="w-44 h-36 animate-duck-bob drop-shadow-2xl"
      viewBox="0 0 180 130"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Body */}
      <ellipse cx="82" cy="102" rx="68" ry="28" fill="#FFD700" />
      {/* Body shading */}
      <ellipse cx="82" cy="110" rx="56" ry="17" fill="#FFBA00" />
      {/* Wing */}
      <ellipse cx="55" cy="97" rx="32" ry="18" fill="#FFC200" transform="rotate(-8 55 97)" />
      {/* Wing highlight */}
      <ellipse cx="48" cy="92" rx="18" ry="10" fill="#FFD700" transform="rotate(-8 48 92)" />
      {/* Neck */}
      <ellipse cx="126" cy="82" rx="20" ry="26" fill="#FFD700" />
      {/* Head */}
      <circle cx="126" cy="52" r="34" fill="#FFD700" />
      {/* Head highlight */}
      <circle cx="112" cy="38" r="12" fill="#FFE566" opacity="0.45" />
      {/* Bill */}
      <path d="M156 49 L178 43 L178 58 Z" fill="#FF8C00" />
      {/* Bill nostril */}
      <ellipse cx="171" cy="47" rx="4" ry="2.5" fill="#CC5500" opacity="0.7" />
      {/* Eye */}
      <circle cx="138" cy="41" r="9" fill="#1A1A2E" />
      <circle cx="140" cy="39" r="3.2" fill="white" />
      {/* Tail */}
      <path d="M16 87 Q5 70 18 60" stroke="#FFD700" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M20 96 Q7 82 19 71" stroke="#FFBA00" strokeWidth="7" fill="none" strokeLinecap="round" />
      {/* Water line */}
      <path d="M10 118 Q35 113 62 118 Q89 123 116 118 Q143 113 168 118" stroke="#93C5FD" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M16 124 Q42 119 70 124 Q98 129 126 124 Q150 119 168 124" stroke="#93C5FD" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

function DecorativeDuck({ className }) {
  return (
    <svg className={className} viewBox="0 0 50 38" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="22" cy="30" rx="19" ry="8" fill="#FFD700" opacity="0.3" />
      <circle cx="34" cy="16" r="10" fill="#FFD700" opacity="0.3" />
      <path d="M42 13 L49 11 L49 18 Z" fill="#FF8C00" opacity="0.3" />
      <circle cx="38" cy="12" r="2.5" fill="#1A1A2E" opacity="0.2" />
    </svg>
  );
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = isLogin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (authError) throw authError;
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pond-bg flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background ducks */}
      <DecorativeDuck className="absolute top-8 left-6 w-24 rotate-12" />
      <DecorativeDuck className="absolute top-24 right-12 w-16 -rotate-6" />
      <DecorativeDuck className="absolute bottom-16 left-1/4 w-20 rotate-6" />
      <DecorativeDuck className="absolute bottom-28 right-8 w-14 -rotate-12" />

      {/* Floating ripple circles */}
      <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden pointer-events-none">
        <svg className="w-full" viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 30 Q180 10 360 30 Q540 50 720 30 Q900 10 1080 30 Q1260 50 1440 30 L1440 60 L0 60 Z" fill="rgba(147,197,253,0.15)" />
          <path d="M0 40 Q160 20 320 40 Q480 60 640 40 Q800 20 960 40 Q1120 60 1280 40 Q1360 30 1440 40 L1440 60 L0 60 Z" fill="rgba(147,197,253,0.1)" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Duck hero + branding */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <RubberDuck />
          </div>
          <h1 className="text-4xl font-extrabold text-yellow-400 tracking-tight drop-shadow-lg">
            QuackYourFuture
          </h1>
          <p className="text-blue-200 text-sm mt-2 font-medium">
            {isLogin ? 'Welcome back, little duck! 🌊' : 'Ready to hatch your career? 🥚'}
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-yellow-400">
          {/* Toggle tabs */}
          <div className="flex rounded-xl bg-blue-50 p-1 mb-6 border border-blue-100">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                isLogin
                  ? 'bg-yellow-400 text-blue-900 shadow-sm'
                  : 'text-blue-400 hover:text-blue-700'
              }`}
            >
              🦆 Log In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                !isLogin
                  ? 'bg-yellow-400 text-blue-900 shadow-sm'
                  : 'text-blue-400 hover:text-blue-700'
              }`}
            >
              🐣 Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-blue-900 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="duck@pond.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition bg-blue-50/50"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-blue-900 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition bg-blue-50/50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 disabled:bg-yellow-200 disabled:cursor-not-allowed text-blue-900 font-extrabold py-3 rounded-xl text-sm transition-all mt-2 shadow-lg hover:shadow-yellow-400/30"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-blue-900" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {isLogin ? 'Quacking in...' : 'Joining the pond...'}
                </>
              ) : (
                isLogin ? '🦆 Quack In' : '🐣 Join the Pond'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-blue-400 mt-6">
            {isLogin ? "New to the pond?" : 'Already a duck?'}{' '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-blue-700 font-bold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
