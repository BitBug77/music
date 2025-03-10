/**
 * JWT token utilities
 */

// Function to check if a token is expired
export function isTokenExpired(token: string): boolean {
    try {
      // Get the expiration time from the token
      const payload = JSON.parse(atob(token.split(".")[1]))
      const exp = payload.exp * 1000 // Convert to milliseconds
  
      // Check if the token is expired
      return Date.now() >= exp
    } catch (error) {
      console.error("Error checking token expiration:", error)
      return true // Assume expired if there's an error
    }
  }
  
  // Function to get the user ID from the token
  export function getUserIdFromToken(token: string): number | null {
    try {
      // Get the user ID from the token
      const payload = JSON.parse(atob(token.split(".")[1]))
      return payload.user_id || null
    } catch (error) {
      console.error("Error getting user ID from token:", error)
      return null
    }
  }
  
  // Function to get the username from the token
  export function getUsernameFromToken(token: string): string | null {
    try {
      // Get the username from the token
      const payload = JSON.parse(atob(token.split(".")[1]))
      return payload.username || null
    } catch (error) {
      console.error("Error getting username from token:", error)
      return null
    }
  }
  
    // Function to get the expiration time from the token
    export function getTokenExpiration(token: string): number | null {
      try {
        // Get the expiration time from the token
        const payload = JSON.parse(atob(token.split(".")[1]))
        return payload.exp || null
      } catch (error) {
        console.error("Error getting token expiration:", error)
        return null
      }
    }
      