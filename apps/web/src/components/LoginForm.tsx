'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        console.log('Attempting sign up...');
        const { error } = await signUp(email, password, { display_name: displayName });
        if (error) {
          console.error('Sign up error:', error);
          setError(error.message);
          setLoading(false);
        } else {
          console.log('Sign up successful, redirecting...');
          // Small delay to let auth state propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          window.location.href = '/';
        }
      } else {
        console.log('Attempting sign in...');
        const { error } = await signIn(email, password);
        if (error) {
          console.error('Sign in error:', error);
          setError(error.message);
          setLoading(false);
        } else {
          console.log('Sign in successful, redirecting...');
          // Small delay to let auth state propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          window.location.href = '/';
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 via-secondary/5 to-accent/10 flex items-center justify-center p-6 md:p-8">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="card bg-base-100 shadow-2xl">
          <div className="card-body p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset className="fieldset space-y-5">
                <legend className="fieldset-legend text-2xl font-semibold mb-8">
                  {isSignUp ? 'Create Account' : 'Login'}
                </legend>

                {isSignUp && (
                  <div className="space-y-2">
                    <label htmlFor="displayName" className="label text-sm font-medium">
                      Display Name
                    </label>
                    <label className="input input-bordered flex items-center gap-3 h-12">
                      <svg className="h-5 w-5 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </g>
                      </svg>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required={isSignUp}
                        placeholder="Your name"
                        minLength={2}
                        className="grow"
                      />
                    </label>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="label text-sm font-medium">
                    Email
                  </label>
                  <label className="input input-bordered flex items-center gap-3 h-12">
                    <svg className="h-5 w-5 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                        <path d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </g>
                    </svg>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="email@example.com"
                      className="grow"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="label text-sm font-medium">
                    Password
                  </label>
                  <label className="input input-bordered flex items-center gap-3 h-12">
                    <svg className="h-5 w-5 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                        <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path>
                        <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>
                      </g>
                    </svg>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Password"
                      minLength={6}
                      className="grow"
                    />
                  </label>
                  <p className="text-xs text-base-content/60 mt-1 ml-1">
                    Must be at least 6 characters
                  </p>
                </div>

                {error && (
                  <div className="alert alert-error mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full mt-6 h-12"
                >
                  {loading ? (
                    <span className="loading loading-ball loading-md text-primary-content"></span>
                  ) : (
                    <span>{isSignUp ? 'Sign Up' : 'Login'}</span>
                  )}
                </button>
              </fieldset>
            </form>

            <div className="divider my-6">or</div>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setDisplayName('');
                setEmail('');
                setPassword('');
              }}
              className="btn btn-ghost w-full h-12"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
