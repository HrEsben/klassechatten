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
    <div className="min-h-screen bg-base-300 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {/* Modern Berlin Edgy Login Card */}
        <div className="relative">
          {/* Accent border effect */}
          <div className="absolute -inset-0.5 bg-linear-to-r from-primary to-secondary opacity-20 blur-sm"></div>
          
          <div className="relative bg-base-100 shadow-xl">
            {/* Header with strong typography */}
            <div className="border-b-2 border-primary/20 px-10 py-8">
              <h1 className="text-4xl font-black tracking-tight text-base-content uppercase">
                {isSignUp ? 'Opret Konto' : 'Log Ind'}
              </h1>
              <div className="h-1 w-16 bg-primary mt-4"></div>
            </div>

            <div className="px-10 py-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {isSignUp && (
                  <div className="space-y-2">
                    <label htmlFor="displayName" className="block text-xs font-bold uppercase tracking-widest text-base-content/70">
                      Visningsnavn
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required={isSignUp}
                      placeholder="Indtast dit navn"
                      minLength={2}
                      className="input w-full px-6 bg-base-200 focus:bg-base-100 border-0 focus:ring-2 focus:ring-primary focus:outline-none h-14 text-base font-medium transition-all"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-base-content/70">
                    Email Adresse
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="din@email.dk"
                    className="input w-full px-6 bg-base-200 focus:bg-base-100 border-0 focus:ring-2 focus:ring-primary focus:outline-none h-14 text-base font-medium transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-base-content/70">
                    Adgangskode
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Indtast adgangskode"
                    minLength={6}
                    className="input w-full px-6 bg-base-200 focus:bg-base-100 border-0 focus:ring-2 focus:ring-primary focus:outline-none h-14 text-base font-medium transition-all"
                  />
                  <p className="text-xs text-base-content/50 font-mono tracking-wide">
                    MIN. 6 TEGN
                  </p>
                </div>

                {error && (
                  <div className="bg-error/10 border-l-4 border-error px-6 py-4">
                    <p className="text-error text-sm font-bold uppercase tracking-wide">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn w-full h-14 bg-primary hover:bg-primary/90 text-primary-content border-0 font-black text-base uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-md"></span>
                  ) : (
                    <span>{isSignUp ? 'Opret Konto' : 'Få Adgang'}</span>
                  )}
                </button>
              </form>

              {/* Divider with geometric style */}
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-base-content/10"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-base-content/40">Eller</span>
                <div className="flex-1 h-px bg-base-content/10"></div>
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
                className="w-full text-center px-8 py-4 text-sm font-bold uppercase tracking-wider text-base-content/60 hover:text-primary transition-colors border-2 border-base-content/10 hover:border-primary/50"
              >
                {isSignUp ? 'Log Ind I Stedet' : 'Opret Ny Konto'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
