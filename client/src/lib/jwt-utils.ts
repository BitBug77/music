/**
 * JWT Token Utilities: Handle access token retrieval and automatic refresh
 */

// Retrieve access token from localStorage
export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

// Set access token in localStorage
export function setAccessToken(token: string): void {
  localStorage.setItem('access_token', token);
}

// Remove access and refresh tokens from localStorage
export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  return !!token && !isTokenExpired(token);
}

// Get authentication header for API requests
export function getAuthHeader(): Record<string, string> {
  const token = getAccessToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Function to check if a token is expired
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000;
    return Date.now() >= exp;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
}

// Refresh access token using refresh token
export async function refreshToken(): Promise<boolean> {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    const response = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) throw new Error(`Failed to refresh token: ${response.status}`);

    const data = await response.json();
    if (data.access) {
      setAccessToken(data.access);
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
      return true;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
  }
  clearTokens();
  return false;
}

// Automatically refresh token when making API calls
export async function withTokenRefresh<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error: any) {
    if (error.status === 401 || error.message?.includes('unauthorized')) {
      const refreshed = await refreshToken();
      if (refreshed) return await apiCall();
      throw new Error('Session expired. Please log in again.');
    }
    throw error;
  }
}