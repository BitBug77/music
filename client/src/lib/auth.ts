// lib/auth.ts
import { jwtDecode } from "jwt-decode"

interface DecodedToken {
  exp: number
  user_id: string
  username: string
  [key: string]: any
}

// Store tokens securely
export const storeTokens = (accessToken: string, refreshToken: string) => {
  // Use HttpOnly cookies in production
  localStorage.setItem("access_token", accessToken)
  localStorage.setItem("refresh_token", refreshToken)
}

// Get the access token
export const getAccessToken = async (): Promise<string | null> => {
  const accessToken = localStorage.getItem("access_token")

  if (!accessToken) {
    return null
  }

  // Check if token is expired
  if (isTokenExpired(accessToken)) {
    // Try to refresh the token
    const newToken = await refreshAccessToken()
    return newToken
  }

  return accessToken
}

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<DecodedToken>(token)
    const currentTime = Date.now() / 1000

    // Add a buffer of 30 seconds to prevent edge cases
    return decoded.exp < currentTime + 30
  } catch (error) {
    console.error("Error decoding token:", error)
    return true
  }
}

// Refresh the access token
export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem("refresh_token")

  if (!refreshToken) {
    return null
  }

  try {
    const response = await fetch("http://127.0.0.1:8000/token/refresh/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (!response.ok) {
      throw new Error("Failed to refresh token")
    }

    const data = await response.json()

    if (data.access) {
      localStorage.setItem("access_token", data.access)
      return data.access
    }

    return null
  } catch (error) {
    console.error("Error refreshing token:", error)
    // Clear tokens on refresh failure
    logout()
    return null
  }
}

// Get the authenticated user
export const getAuthenticatedUser = async () => {
  const token = await getAccessToken()

  if (!token) {
    return null
  }

  try {
    const decoded = jwtDecode<DecodedToken>(token)
    return {
      id: decoded.user_id,
      username: decoded.username,
      // Add other user properties as needed
    }
  } catch (error) {
    console.error("Error decoding user from token:", error)
    return null
  }
}

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAccessToken()
  return !!token
}

// Logout user
export const logout = () => {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  // Redirect to login page or perform other logout actions
  window.location.href = "/login"
}

// Add authorization header to requests
export const authHeader = async (): Promise<HeadersInit> => {
  const token = await getAccessToken()

  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    }
  }

  return {}
}

// Fetch with authentication
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = await authHeader()

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...headers,
    },
  })

  // Handle 401 Unauthorized errors
  if (response.status === 401) {
    // Try to refresh the token
    const newToken = await refreshAccessToken()

    if (newToken) {
      // Retry the request with the new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      })
    } else {
      // If refresh fails, logout
      logout()
    }
  }

  return response
}
