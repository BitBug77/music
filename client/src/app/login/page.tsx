"use client";
// pages/login.tsx
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { FaSpotify } from 'react-icons/fa';

interface LoginResponse {
  status: string;
  message?: string;
  redirect_url?: string;
}

export default function Login() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:8000/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',  // Ensure cookies are sent & received
      });
    
      const data = await response.json();
      console.log('Login response:', data);
    
      if (response.ok && data.access && data.refresh) {
        // Store access and refresh tokens in localStorage
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
    
        // Debug: Checking the access token and refresh token in localStorage
        console.log('Access Token in LocalStorage:', localStorage.getItem('access_token'));
        console.log('Refresh Token in LocalStorage:', localStorage.getItem('refresh_token'));
    
        // Redirect the user after successful login
        router.push('/discover');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpotifyLogin = () => {
    window.location.href = 'http://localhost:8000/spotify-login/';
  };

  return (
    <>
      <Head>
        <title>Login</title>
        <meta name="description" content="Login to your music journey" />
      </Head>
      <div className="min-h-screen bg-gradient-to-r from-gray-800 via-neutral-900 to-gray-700 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Subtle warm background pattern */}
        <div className="absolute inset-0 opacity-10" >
        </div>

        <div className="w-full max-w-md z-10">
          <div className="bg-slate-900 bg-opacity-80 backdrop-filter backdrop-blur-sm p-8 rounded-xl shadow-xl border border-amber-900/20">
            <div className="text-center mb-8">
              
              <h1 className="text-3xl text-amber-100">
                LogIn
              </h1>
              <p className="mt-2 text-amber-200/70 font-light">Discover your personal soundtrack</p>
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-amber-50 bg-gradient-to-r from-amber-800 to-rose-800 hover:from-amber-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-700 transition-colors duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
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
                  onClick={handleSpotifyLogin}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-green-900/30 rounded-md shadow-sm text-sm font-medium text-white bg-green-800 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-700 transition-colors duration-200"
                >
                  <FaSpotify className="h-5 w-5" />
                  Continue with Spotify
                </button>
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-amber-200/60">
              Don't have an account?{' '}
              <Link 
                href="/signup" 
                className="font-medium text-amber-400 hover:text-amber-300 transition-colors duration-200"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}