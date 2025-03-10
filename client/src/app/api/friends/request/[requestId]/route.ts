import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    // Get the authentication token from headers
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ status: "error", message: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]

    // Call your Django API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/request/${userId}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Error sending friend request:", error)
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json()

    // Get the authentication token from headers
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ status: "error", message: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]

    // Call your Django API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/request/${userId}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Error cancelling friend request:", error)
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 })
  }
}