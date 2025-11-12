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
    <div className="min-h-screen bg-linear-to-br from-primary/10 via-secondary/5 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="card bg-base-100 shadow-2xl">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-2xl font-semibold mb-6">
                  {isSignUp ? 'Create Account' : 'Login'}
                </legend>

                {isSignUp && (
                  <>
                    <label htmlFor="displayName" className="label">
                      Display Name
                    </label>
                    <label className="input validator mb-4">
                      <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
                      />
                    </label>
                  </>
                )}

                <label htmlFor="email" className="label">
                  Email
                </label>
                <label className="input validator mb-4">
                  <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
                  />
                </label>

                <label htmlFor="password" className="label">
                  Password
                </label>
                <label className="input validator mb-2">
                  <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
                  />
                </label>
                <p className="validator-hint mb-4">
                  Must be at least 6 characters
                </p>

                {error && (
                  <div className="alert alert-error mb-4">
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full mt-4"
                >
                  {loading ? (
                    <span className="loading loading-ball loading-md text-primary-content"></span>
                  ) : (
                    <span>{isSignUp ? 'Sign Up' : 'Login'}</span>
                  )}
                </button>
              </fieldset>
            </form>

            <div className="divider">or</div>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setDisplayName('');
                setEmail('');
                setPassword('');
              }}
              className="btn btn-ghost w-full"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
