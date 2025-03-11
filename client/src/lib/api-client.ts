/**
 * Centralized API client for making authenticated requests to the backend
 */

// Base URL for the API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// Types for API responses
type ApiResponse<T> = {
  data?: T
  error?: string
  status: "success" | "error"
  message?: string
}

// Options for API requests
type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: Record<string, any>
  params?: Record<string, string>
  headers?: Record<string, string>
  requiresAuth?: boolean
}

/**
 * Makes an authenticated request to the API
 */
export async function apiRequest<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = "GET", body, params, headers = {}, requiresAuth = true } = options

  // Build the URL with query parameters if provided
  const url = new URL(endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }

  // Prepare request headers
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  }

  // Add authorization header if required
  if (requiresAuth) {
    // Get JWT token from localStorage (client-side only)
    const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null

    if (!token) {
      return {
        status: "error",
        error: "Authentication required",
      }
    }

    requestHeaders["Authorization"] = `Bearer ${token}`
  }

  try {
    // Make the request
    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    // Parse the response
    const data = await response.json()

    if (!response.ok) {
      return {
        status: "error",
        error: data.message || "An error occurred",
        message: data.message,
      }
    }

    return {
      status: "success",
      data,
    }
  } catch (error) {
    console.error("API request failed:", error)
    return {
      status: "error",
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

/**
 * API endpoints organized by resource
 */
export const api = {
  auth: {
    login: (credentials: { username: string; password: string }) =>
      apiRequest("/api/auth/login", {
        method: "POST",
        body: credentials,
        requiresAuth: false,
      }),
    register: (userData: { username: string; email: string; password: string }) =>
      apiRequest("/api/auth/register", {
        method: "POST",
        body: userData,
        requiresAuth: false,
      }),
    refreshToken: () => apiRequest("/api/auth/refresh", { method: "POST" }),
  },
  users: {
    getSimilar: () => apiRequest("/api/users/similar"),
    search: (username: string) =>
      apiRequest("/api/users/search", {
        params: { username },
      }),
    getProfile: (userId: number) => apiRequest(`/api/users/${userId}`),
  },
  friends: {
    getRequests: () => apiRequest("/api/friends/requests"),
    sendRequest: (userId: number) =>
      apiRequest("/api/friends/request", {
        method: "POST",
        body: { userId },
      }),
    acceptRequest: (requestId: number) =>
      apiRequest(`/api/friends/request/${requestId}/accept`, {
        method: "POST",
      }),
    declineRequest: (requestId: number) =>
      apiRequest(`/api/friends/request/${requestId}/decline`, {
        method: "POST",
      }),
    getFriends: () => apiRequest("/api/friends"),
  },
}

