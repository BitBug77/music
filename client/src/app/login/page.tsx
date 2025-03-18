"use client"
import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Head from "next/head"
import { FaSpotify, FaUser, FaLock } from "react-icons/fa"

interface LoginResponse {
  status: string
  message?: string
  redirect_url?: string
  access?: string
  refresh?: string
}

export default function Login() {
  const [username, setUsername] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("http://127.0.0.1:8000/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include", // Ensure cookies are sent & received
      })

      const data = await response.json()
      console.log("Login response:", data)

      if (response.ok && data.access && data.refresh) {
        // Store access and refresh tokens in localStorage
        localStorage.setItem("access_token", data.access)
        localStorage.setItem("refresh_token", data.refresh)

        // Debug: Checking the access token and refresh token in localStorage
        console.log("Access Token in LocalStorage:", localStorage.getItem("access_token"))
        console.log("Refresh Token in LocalStorage:", localStorage.getItem("refresh_token"))

        // Redirect the user after successful login
        router.push("/discover")
      } else {
        setError(data.message || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSpotifyLogin = () => {
    window.location.href = "http://localhost:8000/spotify-login/"
  }

  return (
    <>
      <Head>
        <title>Login</title>
        <meta name="description" content="Login to your music journey" />
      </Head>
      <div className="min-h-screen bg-[#74686e] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10"></div>

        <div className="w-full max-w-md z-10">
          <div className="bg-gray-800 bg-opacity-95 backdrop-filter backdrop-blur-sm p-8 rounded-xl shadow-xl border border-gray-700">
            <div className="text-center mb-8">
              <h1 className="text-3xl text-white">Log In</h1>
              <p className="mt-2 text-gray-300 font-light">Discover your personal soundtrack</p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-900/40 border-l-2 border-red-700 rounded-r-md text-red-200 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1 ml-1">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <FaUser className="h-4 w-4" />
                  </span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#74686e] focus:border-[#74686e] transition-colors duration-200"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1 ml-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <FaLock className="h-4 w-4" />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#74686e] focus:border-[#74686e] transition-colors duration-200"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#74686e] hover:bg-[#635a60] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#74686e] transition-colors duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
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

            <p className="mt-8 text-center text-sm text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-[#a799a1] hover:text-white transition-colors duration-200"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

