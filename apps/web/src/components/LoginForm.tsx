'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, { display_name: displayName });
        if (error) {
          setError(error.message);
        } else {
          router.push('/');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          router.push('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 via-secondary/5 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-light tracking-wide text-primary mb-2">
            KC
          </h1>
          <div className="w-12 h-0.5 bg-primary/60 mx-auto"></div>
        </div>

        {/* Main Card */}
        <div className="bg-base-100/80 backdrop-blur-sm border border-primary/10 rounded-none shadow-2xl">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">{/* Removed form header */}
              {isSignUp && (
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={isSignUp}
                    className="input bg-base-200/50 border-0 border-b-2 border-base-300 focus:border-primary rounded-none pl-12 w-full transition-all duration-300 focus:bg-base-200"
                    placeholder=""
                  />
                </div>
              )}

              <div className="relative">
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input bg-base-200/50 border-0 border-b-2 border-base-300 focus:border-primary rounded-none pl-12 w-full transition-all duration-300 focus:bg-base-200"
                  placeholder=""
                />
              </div>

              <div className="relative">
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input bg-base-200/50 border-0 border-b-2 border-base-300 focus:border-primary rounded-none pl-12 w-full transition-all duration-300 focus:bg-base-200"
                  placeholder=""
                />
              </div>

              {error && (
                <div className="bg-error/10 border border-error/20 px-4 py-3 text-error text-sm font-mono">
                  {error}
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn bg-primary/90 hover:bg-primary text-primary-content border-0 rounded-none w-full h-14 text-base font-light tracking-wide transition-all duration-300 hover:tracking-wider"
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <span className="uppercase">
                      {isSignUp ? 'Join' : 'Enter'}
                    </span>
                  )}
                </button>
              </div>
            </form>

            <div className="flex items-center justify-center mt-8">
              <div className="w-full h-px bg-base-300"></div>
              <span className="px-4 text-xs text-base-content/40 font-mono">or</span>
              <div className="w-full h-px bg-base-300"></div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setDisplayName('');
                setEmail('');
                setPassword('');
              }}
              className="btn btn-ghost border-0 rounded-none w-full h-12 text-sm font-light tracking-wide text-base-content/60 hover:text-base-content transition-all duration-300 mt-4"
            >
              <span className="uppercase">
                {isSignUp ? 'Sign In Instead' : 'Create Account'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
