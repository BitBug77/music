"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { api } from "@/lib/api-client"

type User = {
  id: number
  username: string
  email: string
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  getToken: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem("jwt_token")
    if (token) {
      // Fetch user data or validate token
      fetchUserProfile()
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUserProfile = async () => {
    setIsLoading(true)
    try {
      const response = await api.users.getProfile(0) // 0 means "me" or current user
      if (response.status === "success" && response.data) {
        setUser(response.data)
      } else {
        // Token might be invalid, clear it
        localStorage.removeItem("jwt_token")
        setUser(null)
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
      localStorage.removeItem("jwt_token")
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await api.auth.login({ username, password })

      if (response.status === "success" && response.data?.token) {
        localStorage.setItem("jwt_token", response.data.token)

        // Fetch user profile after successful login
        await fetchUserProfile()
        return true
      }
      return false
    } catch (error) {
      console.error("Login failed:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("jwt_token")
    setUser(null)
  }

  const getToken = () => {
    return localStorage.getItem("jwt_token")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

