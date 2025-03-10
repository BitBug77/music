import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: { requestId: string } }) {
  try {
    const requestId = params.requestId

    // Get the authentication token from cookies or headers
    const token = request.headers.get("Authorization")?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ status: "error", message: "Authentication required" }, { status: 401 })
    }

    // Call your Django API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/request/${requestId}/decline/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: data.message || "Failed to decline friend request" },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error declining friend request:", error)
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 })
  }
}

