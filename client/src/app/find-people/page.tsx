"use client"
import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import Sidebar from "../../components/ui/sidebar"
import Navbar from "../../components/ui/navbar"
import { getAuthHeader, isAuthenticated } from "../../lib/jwt-utils" // Import JWT utilities

interface User {
  id: number
  name: string
  avatar: string
  matchPercentage: number
  commonArtists: string[]
  topSong: string
  status: "none" | "pending" | "friends"
}

// Updated interface for search results to match API response format
interface SearchResponse {
  exact_match: {
    user_id: number
    username: string
  }
  similar_users: {
    user_id: number
    username: string
  }[]
  status: string
}

// Update the FriendRequest interface to match the actual data format
interface FriendRequest {
  id: number
  sender: {
    id: number
    username: string
  }
  status: string
  timestamp: string
}

// Add friend interface
interface Friend {
  id: number
  username: string
  avatar: string
  matchPercentage: number
  commonArtists?: string[]
  topSong?: string
}

export default function FindPeoplePage() {
  const [similarUsers, setSimilarUsers] = useState<User[]>([])
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [activeTab, setActiveTab] = useState<"discover" | "requests" | "friends" | "search">("discover")
  const [isLoading, setIsLoading] = useState(true)
  const [isFriendsLoading, setIsFriendsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false)

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const authStatus = isAuthenticated()
      setIsUserAuthenticated(authStatus)

      // Redirect to login if not authenticated
      if (!authStatus) {
        window.location.href = "/login"
      }
    }

    checkAuth()
  }, [])

  useEffect(() => {
    // Only fetch data if authenticated
    if (isUserAuthenticated) {
      fetchSimilarUsers()
      fetchFriendRequests()
      // Don't fetch friends initially to save on API calls
      // We'll fetch them when the user clicks on the Friends tab
    }
  }, [isUserAuthenticated])

  // Fetch similar users from backend
  const fetchSimilarUsers = async () => {
    setIsLoading(true)
    try {
      // Include auth headers in request
      const response = await fetch("http://127.0.0.1:8000/recommend-friends/", {
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to fetch similar users")

      const data = await response.json()
      console.log("Similar users data:", data) // Add logging to see the structure

      // Ensure data is an array before setting state
      if (Array.isArray(data)) {
        setSimilarUsers(data)
      } else if (data && typeof data === "object" && Array.isArray(data.users)) {
        // If the API returns an object with a users array
        setSimilarUsers(data.users)
      } else {
        console.error("Unexpected data format for similar users:", data)
        setSimilarUsers([]) // Set to empty array as fallback
      }
    } catch (error) {
      console.error("Error fetching similar users:", error)
      setSimilarUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  // Updated function to fetch friends
  const fetchFriends = async () => {
    setIsFriendsLoading(true)
    try {
      // Include auth headers in request
      const response = await fetch("http://127.0.0.1:8000/friends/", {
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to fetch friends")

      const data = await response.json()
      console.log("Friends data:", data)

      // Check if data has the expected structure
      if (data && data.status === "success" && Array.isArray(data.friends)) {
        // Transform the string usernames into friend objects with required properties
        const transformedFriends = data.friends.map((username: any, index: any) => ({
          id: index + 1000, // Generate a temporary id
          username: username,
          avatar: "/api/placeholder/64/64",
          matchPercentage: Math.floor(Math.random() * 20) + 80, // Random match between 80-99%
        }))

        setFriends(transformedFriends)
      } else if (Array.isArray(data)) {
        // Handle case where direct array is returned
        const transformedFriends = data.map((item, index) => {
          if (typeof item === "string") {
            return {
              id: index + 1000,
              username: item,
              avatar: "/api/placeholder/64/64",
              matchPercentage: Math.floor(Math.random() * 20) + 80,
            }
          }
          return item // If already an object, return as is
        })

        setFriends(transformedFriends)
      } else {
        console.warn("Unexpected friends data format:", data)
        setFriends([])
      }
    } catch (error) {
      console.error("Error fetching friends:", error)
      setFriends([])
    } finally {
      setIsFriendsLoading(false)
    }
  }

  // Updated function to fetch friend requests
  const fetchFriendRequests = async () => {
    try {
      // Include auth headers in request
      const response = await fetch("http://127.0.0.1:8000/friend-requests/", {
        headers: getAuthHeader(),
      })

      if (!response.ok) throw new Error("Failed to fetch friend requests")

      const data = await response.json()
      console.log("Friend requests data:", data)

      let filteredRequests = []

      // Check if the response contains the expected structure
      if (data && data.status === "success" && Array.isArray(data.received_requests)) {
        console.log("Individual friend requests:", data.received_requests)
        // Filter out accepted, rejected, or declined requests - only keep 'pending' ones
        filteredRequests = data.received_requests.filter(
          (req: any) => req.status === "pending" || req.status === "sent",
        )
      } else if (Array.isArray(data)) {
        console.log("Friend requests array:", data)
        // Filter out accepted, rejected, or declined requests - only keep 'pending' ones
        filteredRequests = data.filter((req) => req.status === "pending" || req.status === "sent")
      } else {
        console.warn("Unexpected friend requests data format:", data)
      }

      setFriendRequests(filteredRequests)
    } catch (error) {
      console.error("Error fetching friend requests:", error)
      setFriendRequests([])
    }
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setActiveTab("search")

    try {
      // Fixed URL format - properly interpolate the search query
      const response = await fetch(`http://127.0.0.1:8000/search_user/${encodeURIComponent(query)}/`, {
        headers: getAuthHeader(),
      })

      if (!response.ok) throw new Error("Failed to search users")

      const data: SearchResponse = await response.json()
      console.log("Search response:", data)

      // Transform API response to match our User interface
      const transformedResults: User[] = []

      // Add exact match if present
      if (data.exact_match) {
        transformedResults.push({
          id: data.exact_match.user_id,
          name: data.exact_match.username,
          avatar: "/api/placeholder/64/64", // Placeholder image
          matchPercentage: 100, // Exact match gets 100%
          commonArtists: [], // We don't have this info
          topSong: "", // We don't have this info
          status: "none", // Default status
        })
      }

      // Add similar users if present
      if (data.similar_users && data.similar_users.length > 0) {
        data.similar_users.forEach((user, index) => {
          transformedResults.push({
            id: user.user_id,
            name: user.username,
            avatar: "/api/placeholder/64/64", // Placeholder image
            matchPercentage: 85 - index * 5, // Fake decreasing match percentage
            commonArtists: [], // We don't have this info
            topSong: "", // We don't have this info
            status: "none", // Default status
          })
        })
      }

      setSearchResults(transformedResults)
    } catch (error) {
      console.error("Error searching users:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input changes with debounce
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery)
      }
    }, 300) // 300ms debounce delay

    return () => clearTimeout(debounceTimeout)
  }, [searchQuery])

  // Clear search when switching tabs (except search tab)
  useEffect(() => {
    if (activeTab !== "search") {
      setSearchQuery("")
      setSearchResults([])
    }

    // Fetch friends data when the friends tab is selected
    if (activeTab === "friends") {
      fetchFriends()
    }
  }, [activeTab])

  const handleSendRequest = async (userId: number) => {
    try {
      // Get the user name from either similarUsers or searchResults
      const user = [...similarUsers, ...searchResults].find((u) => u.id === userId)
      const username = user ? user.name : ""

      // Include auth headers in request
      const response = await fetch("http://127.0.0.1:8000/send-friend-request/", {
        method: "POST",
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId, username }),
      })

      if (!response.ok) throw new Error("Failed to send friend request")

      // Update local state on success
      setSimilarUsers((users) => users.map((user) => (user.id === userId ? { ...user, status: "pending" } : user)))

      // Also update search results if present
      setSearchResults((users) => users.map((user) => (user.id === userId ? { ...user, status: "pending" } : user)))
    } catch (error) {
      console.error("Error sending friend request:", error)
    }
  }
  const handleAcceptRequest = async (requestId: number) => {
    try {
      // Include auth headers in request
      const response = await fetch(`http://127.0.0.1:8000/respond-friend-request/`, {
        method: "POST",
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "accept",
        }),
      })

      if (!response.ok) throw new Error("Failed to accept friend request")

      // Remove the accepted request from the list
      setFriendRequests((requests) => requests.filter((request) => request.id !== requestId))

      // Optional: Add a toast notification here if you have a toast system
      console.log("Friend request accepted successfully")

      // Refresh friend lists
      fetchSimilarUsers()
      if (activeTab === "friends") {
        fetchFriends()
      }
    } catch (error) {
      console.error("Error accepting friend request:", error)
    }
  }

  const handleDeclineRequest = async (requestId: number) => {
    try {
      // Include auth headers in request
      const response = await fetch(`http://127.0.0.1:8000/respond-friend-request/`, {
        method: "POST",
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: "decline",
        }),
      })

      if (!response.ok) throw new Error("Failed to decline friend request")

      // Update local state on success
      setFriendRequests((requests) => requests.filter((request) => request.id !== requestId))
      console.log("Friend request declined successfully")
    } catch (error) {
      console.error("Error declining friend request:", error)
    }
  }

  // Updated user card to handle search results which might have fewer details
  const renderUserCard = (user: User) => (
    <div key={user.id} className="bg-gray-800 rounded-lg p-4 shadow-md">
      <div className="flex items-center">
        <img
          src={user.avatar || "/placeholder.svg"}
          alt={`${user.name}'s avatar`}
          className="w-12 h-12 rounded-full mr-3"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-white">{user.name}</h3>
          <div className="flex items-center text-gray-400 text-xs mt-1">
            <span className="mr-2">{Math.floor(Math.random() * 3) + 1} mutual friends</span>
          </div>
          <div className="text-gray-400 text-xs flex items-center">
            <span className="mr-1">Favorite Genre:</span>
            <span>{["Pop", "Rock", "Hip-Hop", "Lo-Fi", "Jazz"][Math.floor(Math.random() * 5)]}</span>
          </div>
        </div>
        <div className="ml-2">
          {user.status === "none" ? (
            <button
              onClick={() => handleSendRequest(user.id)}
              className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Add Friend
            </button>
          ) : user.status === "pending" ? (
            <span className="text-gray-400 text-xs">Request Sent</span>
          ) : null}
        </div>
      </div>
    </div>
  )

  // Simplified user card for search results with minimal data
  const renderSearchUserCard = (user: User) => (
    <div key={user.id} className="bg-gray-800 rounded-lg p-4 shadow-md">
      <div className="flex items-center">
        <img
          src={user.avatar || "/placeholder.svg"}
          alt={`${user.name}'s avatar`}
          className="w-12 h-12 rounded-full mr-3"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-white">{user.name}</h3>
          <div className="flex items-center text-gray-400 text-xs mt-1">
            <span className="mr-2">{Math.floor(Math.random() * 3) + 1} mutual friends</span>
          </div>
          <div className="text-gray-400 text-xs flex items-center">
            <span className="mr-1">Favorite Genre:</span>
            <span>{["Pop", "Rock", "Hip-Hop", "Lo-Fi", "Jazz"][Math.floor(Math.random() * 5)]}</span>
          </div>
        </div>
        <div className="ml-2">
          {user.status === "none" ? (
            <button
              onClick={() => handleSendRequest(user.id)}
              className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Add Friend
            </button>
          ) : user.status === "pending" ? (
            <span className="text-gray-400 text-xs">Request Sent</span>
          ) : user.status === "friends" ? (
            <span className="text-green-500 text-xs">Already Friends</span>
          ) : null}
        </div>
      </div>
    </div>
  )

  // Friend card for displaying from friends API endpoint
  const renderFriendCard = (friend: Friend) => (
    <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
      <div className="flex items-center">
        <img
          src={friend.avatar || "/placeholder.svg"}
          alt={`${friend.username}'s avatar`}
          className="w-12 h-12 rounded-full mr-3"
        />
        <div>
          <h4 className="font-medium text-white">{friend.username}</h4>
          <div className="flex items-center text-gray-400 text-xs mt-1">
            <span className="mr-2">{Math.floor(Math.random() * 3) + 1} mutual friends</span>
          </div>
          <div className="text-gray-400 text-xs flex items-center">
            <span className="mr-1">Favorite Song:</span>
            <span>Eventually</span>
          </div>
        </div>
      </div>
      <button className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">Message</button>
    </div>
  )

  const renderFriendRequestsContent = () => (
    <div className="bg-gray-800 rounded-lg p-6 shadow-md">
      <h3 className="text-xl font-semibold text-[#3b82f6] mb-4">Friend Requests</h3>
      <p className="text-gray-400 mb-4">Connect with users who share your music taste</p>

      {friendRequests.length === 0 ? (
        <p className="text-gray-400 text-center py-4">No pending friend requests</p>
      ) : (
        <div className="space-y-4">
          {friendRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <img src="/placeholder.svg" alt={`User avatar`} className="w-12 h-12 rounded-full mr-3" />
                <div>
                  <h4 className="font-medium text-white">
                    {request.sender ? request.sender.username : "Unknown User"}
                  </h4>
                  <p className="text-xs text-gray-400">Request Pending</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAcceptRequest(request.id)}
                  className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Confirm
                </button>
                <button
                  onClick={() => handleDeclineRequest(request.id)}
                  className="bg-transparent hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm border border-gray-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderSuggestionsContent = () => (
    <div className="bg-gray-800 rounded-lg p-6 shadow-md">
      <h3 className="text-xl font-semibold text-[#3b82f6] mb-4">Suggestions</h3>
      <p className="text-gray-400 mb-4">People you may know</p>

      {isLoading
        ? Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-gray-700 animate-pulse rounded-lg p-6 h-16 mb-4"></div>
          ))
        : similarUsers
            .slice(0, 3)
            .filter((user) => user.status !== "friends")
            .map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg mb-4">
                <div className="flex items-center">
                  <img
                    src={user.avatar || "/placeholder.svg"}
                    alt={`${user.name}'s avatar`}
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <div>
                    <h4 className="font-medium text-white">{user.name}</h4>
                    <div className="flex items-center text-gray-400 text-xs mt-1">
                      <span className="mr-2">{Math.floor(Math.random() * 3) + 1} mutual friends</span>
                    </div>
                    <div className="text-gray-400 text-xs flex items-center">
                      <span className="mr-1">Favorite Genre:</span>
                      <span>{["Pop", "Rock", "Hip-Hop", "Lo-Fi", "Jazz"][Math.floor(Math.random() * 5)]}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {user.status === "none" ? (
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Friend
                    </button>
                  ) : user.status === "pending" ? (
                    <span className="text-gray-400 text-xs">Request Sent</span>
                  ) : null}
                  <button className="bg-transparent hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm border border-gray-600">
                    Remove
                  </button>
                </div>
              </div>
            ))}
    </div>
  )

  const renderRecentActivityContent = () => (
    <div className="bg-gray-800 rounded-lg p-6 shadow-md mt-6">
      <h3 className="text-xl font-semibold text-[#3b82f6] mb-4">Recent Activity</h3>
      <div className="space-y-4">
        <div className="p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-white">
            <span className="font-medium">New users</span> with similar music taste joined recently
          </p>
          <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
        </div>
        <div className="p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-white">
            <span className="font-medium">Music festival</span> recommendations updated
          </p>
          <p className="text-xs text-gray-400 mt-1">Yesterday</p>
        </div>
        <div className="p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-white">
            <span className="font-medium">New playlist matches</span> are available
          </p>
          <p className="text-xs text-gray-400 mt-1">3 days ago</p>
        </div>
      </div>
    </div>
  )

  const renderMusicNewsContent = () => (
    <div className="bg-gray-800 rounded-lg p-6 shadow-md mt-6">
      <h3 className="text-xl font-semibold text-[#3b82f6] mb-4">Music News</h3>
      <div className="space-y-4">
        <div className="p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-white font-medium">Top 10 Albums This Week</p>
          <p className="text-xs text-gray-400 mt-1">Check out what everyone is listening to</p>
        </div>
        <div className="p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-white font-medium">Upcoming Concerts Near You</p>
          <p className="text-xs text-gray-400 mt-1">Find shows from artists you might like</p>
        </div>
        <div className="p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-white font-medium">New Release Friday</p>
          <p className="text-xs text-gray-400 mt-1">Fresh tracks from your favorite artists</p>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case "discover":
        return (
          <div className="grid grid-cols-1 gap-4">
            {Array.isArray(similarUsers) &&
              similarUsers.filter((user) => user && user.status !== "friends").map((user) => renderUserCard(user))}
          </div>
        )

      case "search":
        return (
          <div>
            {isSearching ? (
              <div className="grid grid-cols-1 gap-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="bg-gray-700 animate-pulse rounded-lg p-6 h-16"></div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">{searchResults.map((user) => renderSearchUserCard(user))}</div>
            ) : searchQuery ? (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <p className="text-white">No users found matching "{searchQuery}"</p>
              </div>
            ) : null}
          </div>
        )

      case "requests":
        return renderFriendRequestsContent()

      case "friends":
        return (
          <div className="bg-gray-800 rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold text-[#3b82f6] mb-4">Your Friends</h3>

            {isFriendsLoading ? (
              // Loading state for friends
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="bg-gray-700 animate-pulse rounded-lg p-6 h-16"></div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <p className="text-gray-400 text-center py-4">You haven't connected with any music friends yet</p>
            ) : (
              <div className="space-y-4">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <img
                        src={friend.avatar || "/placeholder.svg"}
                        alt={`${friend.username}'s avatar`}
                        className="w-12 h-12 rounded-full mr-3"
                      />
                      <div>
                        <h4 className="font-medium text-white">{friend.username}</h4>
                        <div className="flex items-center text-gray-400 text-xs mt-1">
                          <span className="mr-2">{Math.floor(Math.random() * 3) + 1} mutual friends</span>
                        </div>
                        <div className="text-gray-400 text-xs flex items-center">
                          <span className="mr-1">Favorite Song:</span>
                          <span>Eventually</span>
                        </div>
                      </div>
                    </div>
                    <button className="bg-[#3b82f6] hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                      Message
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // If not authenticated, show a loading state (redirect happens in useEffect)
  if (!isUserAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-800">
        <div className="text-white text-center">
          <p className="text-xl">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen text-black">
      {/* Navbar */}
      <div className="bg-gray-800">
        <Navbar />
      </div>

      {/* Sidebar component */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-800">
        {/* Header */}
        <div className="p-8">
          <h1 className="text-3xl text-[#3b82f6] font-bold mb-4">Find People Like You</h1>
          <p className="text-gray-400 mb-6">Connect with users who share your music taste</p>

          {/* Single Search Bar - positioned at the top level */}
          <div className="max-w-md">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find users by username..."
                className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 pb-4">
          <div className="flex space-x-4 border-b border-gray-600">
            <button
              onClick={() => setActiveTab("discover")}
              className={`py-2 px-4 font-medium transition-colors duration-200 ${
                activeTab === "discover"
                  ? "text-[#3b82f6] border-b-2 border-[#3b82f6]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Discover People
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`py-2 px-4 font-medium transition-colors duration-200 ${
                activeTab === "search" ? "text-[#3b82f6] border-b-2 border-[#3b82f6]" : "text-white/70 hover:text-white"
              }`}
            >
              Search Results
              {searchResults.length > 0 && (
                <span className="ml-2 bg-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {searchResults.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("requests")
                fetchFriendRequests() // Refresh friend requests when tab is clicked
              }}
              className={`py-2 px-4 font-medium transition-colors duration-200 relative ${
                activeTab === "requests"
                  ? "text-[#3b82f6] border-b-2 border-[#3b82f6]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Friend Requests
              {friendRequests.length > 0 && (
                <span className="absolute top-0 right-0 bg-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("friends")
                fetchFriends() // Added explicit call to fetch friends when tab is clicked
              }}
              className={`py-2 px-4 font-medium transition-colors duration-200 ${
                activeTab === "friends"
                  ? "text-[#3b82f6] border-b-2 border-[#3b82f6]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Your Friends
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 pt-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - takes up 2/3 of the space */}
          <div className="lg:col-span-2">
            {activeTab === "requests" ? renderFriendRequestsContent() : renderContent()}
          </div>

          {/* Sidebar content - takes up 1/3 of the space */}
          <div className="hidden lg:block">
            {renderSuggestionsContent()}
            {renderRecentActivityContent()}
            {renderMusicNewsContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

