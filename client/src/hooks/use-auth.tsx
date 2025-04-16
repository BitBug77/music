"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getAuthenticatedUser, isAuthenticated, logout as authLogout } from "@/lib/auth"

interface User {
  id: string
  username: string
  [key: string]: any
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isLoggedIn: boolean
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoggedIn: false,
  logout: () => {},
  refreshUser: async () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const refreshUser = async () => {
    try {
      const loggedIn = await isAuthenticated()
      setIsLoggedIn(loggedIn)

      if (loggedIn) {
        const userData = await getAuthenticatedUser()
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Error refreshing user:", error)
      setUser(null)
      setIsLoggedIn(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const logout = () => {
    authLogout()
    setUser(null)
    setIsLoggedIn(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isLoggedIn, logout, refreshUser }}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export default useAuth
