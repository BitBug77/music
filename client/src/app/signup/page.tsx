"use client"
import { useState, type FormEvent, useEffect } from "react"
import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FaSpotify, FaUser, FaIdCard, FaLock, FaCheck } from "react-icons/fa"
import { motion, AnimatePresence } from "framer-motion"

interface SignupResponse {
  status: string
  message?: string
  access?: string
  refresh?: string
}

interface FormData {
  username: string
  email: string
  password: string
  password_confirmation: string
  name: string
  pronoun: string
  gender: string
  bio: string
}

export default function MultiStepSignup() {
  const [step, setStep] = useState<number>(1)
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    password_confirmation: "",
    name: "",
    pronoun: "",
    gender: "",
    bio: "",
  })

  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [passwordsMatch, setPasswordsMatch] = useState<boolean>(true)
  const router = useRouter()

  // Check if passwords match when either password field changes
  useEffect(() => {
    if (formData.password && formData.password_confirmation) {
      setPasswordsMatch(formData.password === formData.password_confirmation)
    }
  }, [formData.password, formData.password_confirmation])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const nextStep = () => {
    if (step === 2 && !passwordsMatch) {
      setError("Passwords do not match")
      return
    }
    setError("")
    setStep((prev) => prev + 1)
  }

  const prevStep = () => {
    setError("")
    setStep((prev) => prev - 1)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("http://127.0.0.1:8000/signup/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include", // Ensure cookies are sent & received
      })

      const data: SignupResponse = await response.json()

      if (response.ok && data.access && data.refresh) {
        // Store tokens securely using the auth utility
        import("@/lib/auth").then(({ storeTokens }) => {
          storeTokens(data.access, data.refresh)
          // Move to success step
          setStep(4)
        })
      } else {
        setError(data.message || "Signup failed")
        // Go back to the appropriate step based on the error
        if (data.message?.includes("Username")) setStep(1)
        else if (data.message?.includes("Password")) setStep(2)
      }
    } catch (err) {
      console.error("Signup error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSpotifyLogin = () => {
    setIsLoading(true)
    // Your server is likely set up to handle the redirect directly
    // So we'll navigate directly to the endpoint
    window.location.href = "http://127.0.0.1:8000/spotify-login"
  }

  const validateStep = () => {
    switch (step) {
      case 1:
        return !!formData.username
      case 2:
        return !!formData.password && !!formData.password_confirmation && passwordsMatch
      case 3:
        return true // Profile info is optional
      default:
        return false
    }
  }

  // Progress indicator
  const renderProgress = () => {
    return (
      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-1/2 h-0.5 bg-gray-600 w-full -z-10 transform -translate-y-1/2"></div>
        {[1, 2, 3].map((stepNumber) => (
          <div
            key={stepNumber}
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              stepNumber <= step ? "bg-[#74686e]" : "bg-gray-800"
            } text-white transition-colors duration-300`}
          >
            {stepNumber < step ? <FaCheck /> : stepNumber}
          </div>
        ))}
      </div>
    )
  }

  // Step 1: Account Information
  const renderAccountStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl text-white font-medium">Account Information</h2>
        <p className="text-gray-300 text-sm mt-1">Step 1 of 3</p>
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1 ml-1">
          Username*
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
            value={formData.username}
            onChange={handleChange}
            className="block w-full pl-10 px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#74686e] focus:border-[#74686e] transition-colors duration-200"
            placeholder="Enter your username"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1 ml-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className="block w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#74686e] focus:border-[#74686e] transition-colors duration-200"
          placeholder="Enter your email"
        />
      </div>

      <div className="pt-6 flex justify-end">
        <button
          type="button"
          onClick={nextStep}
          disabled={!formData.username}
          className={`py-3 px-6 rounded-md shadow-sm text-base font-medium text-white ${
            formData.username ? "bg-[#74686e] hover:bg-[#635a60]" : "bg-gray-700 cursor-not-allowed"
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#74686e] transition-colors duration-200`}
        >
          Next
        </button>
      </div>
    </div>
  )

  // Step 2: Security
  const renderSecurityStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl text-white font-medium">Security</h2>
        <p className="text-gray-300 text-sm mt-1">Step 2 of 3</p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1 ml-1">
          Password*
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
            value={formData.password}
            onChange={handleChange}
            className="block w-full pl-10 px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#74686e] focus:border-[#74686e] transition-colors duration-200"
            placeholder="Enter your password"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-300 mb-1 ml-1">
          Confirm Password*
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FaLock className="h-4 w-4" />
          </span>
          <input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            required
            value={formData.password_confirmation}
            onChange={handleChange}
            className={`block w-full pl-10 px-4 py-3 bg-gray-800 border ${
              formData.password_confirmation && !passwordsMatch ? "border-red-600" : "border-gray-700"
            } rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#74686e] focus:border-[#74686e] transition-colors duration-200`}
            placeholder="Confirm your password"
          />
        </div>
        {formData.password_confirmation && !passwordsMatch && (
          <p className="mt-1 text-red-400 text-sm">Passwords do not match</p>
        )}
      </div>

      <div className="pt-6 flex justify-between">
        <button
          type="button"
          onClick={prevStep}
          className="py-3 px-6 border border-gray-700 rounded-md shadow-sm text-base font-medium text-gray-300 bg-transparent hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#74686e] transition-colors duration-200"
        >
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          disabled={!validateStep()}
          className={`py-3 px-6 rounded-md shadow-sm text-base font-medium text-white ${
            validateStep() ? "bg-[#74686e] hover:bg-[#635a60]" : "bg-gray-700 cursor-not-allowed"
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#74686e] transition-colors duration-200`}
        >
          Next
        </button>
      </div>
    </div>
  )

  // Step 3: Profile Information
  const renderProfileStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl text-white font-medium">Profile Information</h2>
        <p className="text-gray-300 text-sm mt-1">Step 3 of 3</p>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1 ml-1">
          Name
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FaIdCard className="h-4 w-4" />
          </span>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className="block w-full pl-10 px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#74686e] focus:border-[#74686e] transition-colors duration-200"
            placeholder="Your display name"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="pronoun" className="block text-sm font-medium text-gray-300 mb-1 ml-1">
            Pronoun
          </label>
          <input
            id="pronoun"
            name="pronoun"
            type="text"
            value={formData.pronoun}
            onChange={handleChange}
            className="block w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#74686e] focus:border-[#74686e] transition-colors duration-200"
            placeholder="Your pronouns"
          />
        </div>
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-300 mb-1 ml-1">
            Gender
          </label>
          <input
            id="gender"
            name="gender"
            type="text"
            value={formData.gender}
            onChange={handleChange}
            className="block w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#74686e] focus:border-[#74686e] transition-colors duration-200"
            placeholder="Your gender"
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1 ml-1">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          value={formData.bio}
          onChange={handleChange}
          className="block w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#74686e] focus:border-[#74686e] transition-colors duration-200"
          placeholder="Tell us about yourself..."
        />
      </div>

      <div className="pt-6 flex justify-between">
        <button
          type="button"
          onClick={prevStep}
          className="py-3 px-6 border border-gray-700 rounded-md shadow-sm text-base font-medium text-gray-300 bg-transparent hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#74686e] transition-colors duration-200"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="py-3 px-6 rounded-md shadow-sm text-base font-medium text-white bg-[#74686e] hover:bg-[#635a60] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#74686e] transition-colors duration-200"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </div>
    </div>
  )

  // Step 4: Success
  const renderSuccessStep = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-[#74686e] rounded-full flex items-center justify-center mx-auto mb-6">
        <FaCheck className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
      <p className="text-gray-300 mb-8">Your account has been successfully created.</p>
      <button
        onClick={() => router.push("/login")}
        className="py-3 px-6 rounded-md shadow-sm text-base font-medium text-white bg-[#74686e] hover:bg-[#635a60] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#74686e] transition-colors duration-200"
      >
        Go to Login
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#74686e] flex items-center justify-center px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 overflow-hidden opacity-10"></div>

      <div className="w-full max-w-md z-10">
        <div className="bg-gray-800 bg-opacity-95 backdrop-filter backdrop-blur-sm p-8 rounded-xl shadow-xl border border-gray-700">
          <div className="text-center mb-6">
            <h1 className="text-3xl text-white">Sign Up</h1>
          </div>

          {step < 4 && renderProgress()}

          {error && (
            <div className="mb-6 p-3 bg-red-900/40 border-l-2 border-red-700 rounded-r-md text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 1 && renderAccountStep()}
                {step === 2 && renderSecurityStep()}
                {step === 3 && renderProfileStep()}
                {step === 4 && renderSuccessStep()}
              </motion.div>
            </AnimatePresence>
          </form>

          {step === 1 && (
            <>
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
                    Sign up with Spotify
                  </button>
                </div>
              </div>

              <p className="mt-8 text-center text-sm text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-[#a799a1] hover:text-white transition-colors duration-200"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
