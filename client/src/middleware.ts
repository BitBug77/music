import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const isPublicPath = path === "/login" || path === "/signup" || path.startsWith("/api/")

  // Check if user is authenticated by looking for the token in cookies
  // Note: In a real production environment, you should validate the token
  const token = request.cookies.get("access_token")?.value || ""

  // If the path requires authentication and user is not authenticated, redirect to login
  if (!isPublicPath && !token) {
    // Create a URL for the login page
    const loginUrl = new URL("/login", request.url)
    // Add the current URL as a parameter to redirect back after login
    loginUrl.searchParams.set("callbackUrl", encodeURI(request.url))
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated and trying to access login/signup, redirect to home
  if (token && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/discover", request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
