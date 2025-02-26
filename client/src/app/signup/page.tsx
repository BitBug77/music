"use client";
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { FaSpotify } from 'react-icons/fa';

interface SignupResponse {
  status: string;
  message?: string;
}

export default function Signup() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirmation, setPasswordConfirmation] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:8000/signup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password,
          password_confirmation: passwordConfirmation 
        }),
      });

      const data: SignupResponse = await response.json();

      if (response.ok) {
        router.push('/home');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpotifySignup = () => {
    // Redirect to your Spotify auth endpoint
    window.location.href = '/api/auth/spotify';
  };

  return (
    <>
      <Head>
        <title>Sign Up</title>
        <meta name="description" content="Create your account" />
      </Head>

      <div className="min-h-screen bg-gradient-to-r from-gray-800 via-neutral-900 to-gray-700 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 overflow-hidden opacity-10">
        </div>

        <div className="w-full max-w-md z-10">
          <div className="bg-slate-900 bg-opacity-80 backdrop-filter backdrop-blur-sm p-8 rounded-xl shadow-xl border border-amber-900/20">
            <div className="text-center mb-8">
              <h1 className="text-3xl text-amber-100">
                Sign Up
              </h1>
              <p className="mt-2 text-amber-200/70 font-light">Join the musical journey</p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-rose-950/40 border-l-2 border-rose-700 rounded-r-md text-rose-200 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-amber-200/80 mb-1 ml-1">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-800/70 border border-amber-900/30 rounded-md text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-700/50 focus:border-amber-700/50 transition-colors duration-200"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-amber-200/80 mb-1 ml-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-800/70 border border-amber-900/30 rounded-md text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-700/50 focus:border-amber-700/50 transition-colors duration-200"
                  placeholder="Enter your password"
                />
              </div>

              <div>
                <label htmlFor="passwordConfirmation" className="block text-sm font-medium text-amber-200/80 mb-1 ml-1">
                  Confirm Password
                </label>
                <input
                  id="passwordConfirmation"
                  name="passwordConfirmation"
                  type="password"
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-800/70 border border-amber-900/30 rounded-md text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-700/50 focus:border-amber-700/50 transition-colors duration-200"
                  placeholder="Confirm your password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-amber-50 bg-gradient-to-r from-amber-800 to-rose-800 hover:from-amber-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-700 transition-colors duration-200"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-amber-900/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-900 text-amber-200/60">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleSpotifySignup}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-green-900/30 rounded-md shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-700 transition-colors duration-200"
                >
                  <FaSpotify className="h-5 w-5" />
                  Sign up with Spotify
                </button>
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-amber-200/60">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="font-medium text-amber-400 hover:text-amber-300 transition-colors duration-200"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}