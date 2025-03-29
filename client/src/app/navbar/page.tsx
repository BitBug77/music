"use client"
import type React from "react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  UserCircle,
  Search,
  LogOut,
  User,
  ChevronDown,
  AlertTriangle,
  Settings,
  HelpCircle,
  Moon,
  MessageSquare,
  Pencil,
  ChevronRight,
  Bell,
  UserPlus,
} from "lucide-react"
import { getAccessToken, clearTokens, getAuthHeader, withTokenRefresh } from "../../lib/jwt-utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

// Define TypeScript interfaces for our data structures
interface Song {
  track_id: string
  name: string
  artist: string
  album_cover?: string
  spotify_url: string
}

interface UserProfile {
  username: string
  email: string
  bio: string
  profile_picture: string | null
  joined_date: string
}

// Update the Notification interface to include a link field
interface Notification {
  id: string
  message: string
  timestamp: string
  read: boolean
  type: string
  sender: string
  link?: string // Optional link to navigate to when clicked
  notification_type: string
}

const Navbar: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [query, setQuery] = useState<string>("")
  const [searchResults, setSearchResults] = useState<Song[]>([])
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSearchActive, setIsSearchActive] = useState<boolean>(true)
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1)
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false)
  const [userProfile, setUserProfile]=useState<UserProfile | null>(null)
  useState<UserProfile | null>(null)
  const [tokenError, setTokenError] = useState<boolean>(false)
  const [profileLoading, setProfileLoading] = useState<boolean>(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotificationDropdown, setShowNotificationDropdown] = useState<boolean>(false)
  const [notificationsLoading, setNotificationsLoading] = useState<boolean>(false)
  const [isOverProfileDropdown, setIsOverProfileDropdown] = useState<boolean>(false)
  const [isOverNotificationDropdown, setIsOverNotificationDropdown] = useState<boolean>(false)
  const [lastNotificationFetchTime, setLastNotificationFetchTime] = useState<number | null>(null)

  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const notificationDropdownRef = useRef<HTMLDivElement>(null)

  // Debounce function to limit API calls
  const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
    let timer: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timer)
      timer = setTimeout(() => func(...args), delay)
    }
  }

  // Get user profile information
  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true)

      // Check if user profile exists in localStorage
      const cachedProfile = localStorage.getItem("userProfile")
      if (cachedProfile) {
        const parsedProfile = JSON.parse(cachedProfile)
        setUserProfile(parsedProfile)
        setProfileLoading(false)
        setTokenError(false)
        return
      }

      await withTokenRefresh(async () => {
        const accessToken = getAccessToken()

        if (!accessToken) {
          setTokenError(true)
          return
        }

        const response = await fetch("http://127.0.0.1:8000/profile/", {
          method: "GET",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          throw new Error("Failed to fetch user profile")
        }

        const profileData = await response.json()
        console.log("User Profile:", profileData)
        // Extract the profile data from the nested structure
        let userData
        if (profileData.profile && profileData.status === "success") {
          userData = profileData.profile
        } else {
          userData = profileData // Fallback to the original behavior
        }

        // Store the profile in localStorage
        localStorage.setItem("userProfile", JSON.stringify(userData))

        setUserProfile(userData)
        setTokenError(false)
      })
    } catch (error) {
      console.error("Error fetching user profile:", error)
    } finally {
      setProfileLoading(false)
    }
  }

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true)
      await withTokenRefresh(async () => {
        const accessToken = getAccessToken()

        if (!accessToken) {
          return
        }

        const response = await fetch("http://127.0.0.1:8000/notifications/", {
          method: "GET",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          throw new Error("Failed to fetch notifications")
        }

        const data = await response.json()
        // Update to match the API response format from your Django endpoint
        const formattedNotifications = data.notifications.map((notification: any) => ({
          id: notification.id,
          message: notification.message,
          timestamp: notification.created_at,
          read: notification.is_read,
          type: notification.type,
          sender: notification.sender,
          link: getNotificationLink(notification.type, notification), // Add link based on notification type
          notification_type: notification.notification_type,
        }))
        setNotifications(formattedNotifications || [])
        setLastNotificationFetchTime(Date.now())
      })
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setNotificationsLoading(false)
    }
  }

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: any) => {
    try {
      await withTokenRefresh(async () => {
        const response = await fetch(`http://127.0.0.1:8000/notifications/${notificationId}/read/`, {
          method: "POST",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          throw new Error("Failed to mark notification as read")
        }

        // Update local state to reflect the change
        setNotifications((prevNotifications) =>
          prevNotifications.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          ),
        )
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await withTokenRefresh(async () => {
        // You would need to implement this endpoint in your Django backend
        const response = await fetch("http://127.0.0.1:8000/notifications/mark-all-read/", {
          method: "POST",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          throw new Error("Failed to mark all notifications as read")
        }

        // Update local state to reflect all notifications as read
        setNotifications((prevNotifications) =>
          prevNotifications.map((notification) => ({ ...notification, read: true })),
        )
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await withTokenRefresh(async () => {
        const accessToken = getAccessToken()
        console.log("Access Token:", accessToken)

        if (!accessToken) {
          setTokenError(true)
          return
        }

        const response = await fetch("http://127.0.0.1:8000/logout/", {
          method: "POST",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          throw new Error("Logout failed")
        }

        // Clear local storage
        clearTokens()
        localStorage.removeItem("userProfile")

        // Reset user profile state
        setUserProfile(null)

        // Close dropdown
        setShowProfileDropdown(false)

        // Redirect to login page
        router.push("/login")
      })
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  // Handle redirecting to login
  const handleRedirectToLogin = () => {
    setShowProfileDropdown(false)
    router.push("/login")
  }

  // Handle profile dropdown hover
  const handleProfileMouseEnter = () => {
    setShowProfileDropdown(true)
    fetchUserProfile()
  }

  const handleProfileMouseLeave = () => {
    // Only close if mouse is not over dropdown content
    if (!isOverProfileDropdown) {
      setTimeout(() => {
        setShowProfileDropdown(false)
      }, 300)
    }
  }

  // Replace the handleNotificationMouseEnter function with this version
  const handleNotificationMouseEnter = () => {
    setShowNotificationDropdown(true)

    // Only fetch notifications if they haven't been loaded yet or it's been more than 2 minutes
    const shouldFetchNotifications =
      notifications.length === 0 ||
      (notificationsLoading === false &&
        (!lastNotificationFetchTime || Date.now() - lastNotificationFetchTime > 120000))

    if (shouldFetchNotifications) {
      fetchNotifications()
    }
  }

  const handleNotificationMouseLeave = () => {
    // Only close if mouse is not over dropdown content
    if (!isOverNotificationDropdown) {
      setTimeout(() => {
        setShowNotificationDropdown(false)
      }, 300)
    }
  }

  // Get initials for avatar fallback
  const getInitials = (name: string | undefined | null) => {
    if (!name) return "" // Return empty string if name is undefined or null

    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }

  // Fetch search results with debounce
  const fetchSearchResults = debounce(async (searchQuery: string) => {
    if (searchQuery.trim() === "") {
      setSearchResults([])
      setShowSuggestions(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      await withTokenRefresh(async () => {
        // Make the GET request to search songs
        const response = await fetch(`http://127.0.0.1:8000/search-songs/?q=${encodeURIComponent(searchQuery)}`, {
          method: "GET",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          throw new Error("Network response was not ok")
        }

        const data: { songs: Song[] } = await response.json()
        const songs: Song[] = data.songs

        setSearchResults(songs.slice(0, 10)) // Limit to 10 suggestions for better UX
        setShowSuggestions(true)
      })
    } catch (error) {
      console.error("Error during fetch:", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, 300) // 300ms debounce delay

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const searchQuery = e.target.value
    setQuery(searchQuery)
    fetchSearchResults(searchQuery)
  }

  const handleSuggestionClick = (suggestion: Song): void => {
    setQuery(suggestion.name)
    setShowSuggestions(false)

    // Navigate to the song page with the track_id
    router.push(`/song/${suggestion.track_id}`)

    // Log this interaction to the database
    logUserInteraction(suggestion.track_id, "song_click")
  }

  // Function to log user interactions
  const logUserInteraction = async (trackId: string, interactionType: string) => {
    try {
      await fetch("http://127.0.0.1:8000/log-interaction/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          track_id: trackId,
          interaction_type: interactionType,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error("Error logging interaction:", error)
    }
  }

  const handleClickOutside = (event: MouseEvent): void => {
    if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
      setShowSuggestions(false)
      setIsSearchActive(false)
    }

    if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
      setShowProfileDropdown(false)
    }

    if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
      setShowNotificationDropdown(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Escape") {
      setShowSuggestions(false)
      setIsSearchActive(false)
    } else if (e.key === "ArrowDown" && searchResults.length > 0) {
      setActiveSuggestion((prev) => (prev + 1) % searchResults.length)
    } else if (e.key === "ArrowUp" && searchResults.length > 0) {
      setActiveSuggestion((prev) => (prev - 1 + searchResults.length) % searchResults.length)
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      handleSuggestionClick(searchResults[activeSuggestion])
    }
  }

  // Focus on input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }

    // Check if user is logged in and fetch profile data
    const accessToken = getAccessToken()
    if (!accessToken) {
      setTokenError(true)
    } else {
      fetchUserProfile()
    }
  }, [])

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Add this useEffect to periodically check for new notifications
  useEffect(() => {
    // Fetch notifications initially
    if (getAccessToken()) {
      fetchNotifications()
    }

    // Set up interval to check for new notifications every minute
    const intervalId = setInterval(() => {
      if (getAccessToken()) {
        fetchNotifications()
      }
    }, 60000) // 60 seconds

    return () => clearInterval(intervalId)
  }, [])

  // Add this helper function to determine the link for each notification type
  const getNotificationLink = (type: string, notification: any): string => {
    switch (type) {
      case "like":
        return `/post/${notification.post_id}`
      case "comment":
        return `/post/${notification.post_id}#comment-${notification.comment_id}`
      case "follow":
        return `/profile/${notification.sender.username}`
      case "message":
        return `/messages/${notification.sender.id}`
      default:
        return "#"
    }
  }

  // Add this function to handle notification clicks
  const handleNotificationClick = async (notification: Notification) => {
    // Only mark as read if it's not already read
    if (!notification.read) {
      await markNotificationAsRead(notification.id)
    }

    // Navigate to the relevant content if there's a link
    if (notification.link && notification.link !== "#") {
      router.push(notification.link)
    }

    // Close the dropdown
    setShowNotificationDropdown(false)
  }

  // Add these helper functions for the Instagram-style notifications
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return <UserPlus size={16} className="text-white" />
      case "request_accepted":
        return <UserPlus size={16} className="text-white" />
      case "request_rejected":
        return <UserPlus size={16} className="text-white" />
      default:
        return <Bell size={16} className="text-white" />
    }
  }

  const getNotificationText = (type: string) => {
    switch (type) {
      case "friend_request":
        return "sent you a friend request"
      case "request_accepted":
        return "accepted your friend request"
      case "request_rejected":
        return "rejected your friend request"
      default:
        return "interacted with your profile"
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const notificationTime = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - notificationTime.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return "just now"
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}d ago`
    } else {
      return notificationTime.toLocaleDateString()
    }
  }

  return (
    <nav className="text-white shadow-lg z-9999 w-full bg-[#74686e]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 pl-0">
            <Link href="/">
              <span className="font-bold px-10 text-xl cursor-pointer">Musicapp</span>
            </Link>
          </div>
          <div className="hidden md:block flex-grow mx-8">
            <div className="relative w-full z-[9999]" ref={searchRef}>
              <div
                className={`relative w-2/4 transition-all duration-300 ${isSearchActive ? "w-3/4 scale-105" : "w-2/4"}`}
              >
                <input
                  ref={inputRef}
                  className={`bg-blue-100 text-blue-800 rounded-full pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 ${isSearchActive ? "ring-2 ring-pink-500 shadow-lg" : "focus:ring-pink-500"}`}
                  type="text"
                  placeholder="Search for songs, artists, or albums..."
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setIsSearchActive(true)
                    if (query.trim() !== "") setShowSuggestions(true)
                  }}
                  value={query}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className={`${isSearchActive ? "text-pink-600" : "text-blue-600"}`} />
                </div>
                {isLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {showSuggestions && (
                  <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg z-[10000] overflow-hidden">
                    {searchResults.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto py-1 text-sm">
                        {searchResults.map((result, index) => (
                          <li
                            key={result.track_id}
                            className={`px-4 py-2 cursor-pointer flex items-center text-gray-800 ${index === activeSuggestion ? "bg-gray-200" : ""}`}
                            onClick={() => handleSuggestionClick(result)}
                            onMouseEnter={() => setActiveSuggestion(index)}
                          >
                            {result.album_cover && (
                              <img
                                src={result.album_cover || "/placeholder.svg"}
                                alt=""
                                className="w-8 h-8 mr-3 rounded"
                              />
                            )}
                            <div>
                              <p className="font-medium">{result.name}</p>
                              <p className="text-xs text-gray-500">{result.artist}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-700">No results found for "{query}"</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center pr-0 space-x-4">
            <Link
              href="/for-you"
              className={`${pathname === "/for-you" ? "bg-blue-700" : "hover:bg-blue-700"} px-3 py-2 rounded-md text-sm font-medium`}
            >
              For You
            </Link>
            <Link
              href="/discover"
              className={`${pathname === "/discover" ? "bg-blue-700" : "hover:bg-blue-700"} px-3 py-2 rounded-md text-sm font-medium`}
            >
              Discover
            </Link>
            <Link
              href="/artists"
              className={`${pathname === "/artists" ? "bg-blue-700" : "hover:bg-blue-700"} px-3 py-2 rounded-md text-sm font-medium`}
            >
              Artists
            </Link>

            {/* Notifications dropdown */}
            <div
              className="relative"
              ref={notificationDropdownRef}
              onMouseEnter={handleNotificationMouseEnter}
              onMouseLeave={handleNotificationMouseLeave}
            >
              <button className="ml-2 p-2 rounded-full text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-white">
                <Bell size={24} />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-gray-600 rounded-lg shadow-lg z-20"
                  onMouseEnter={() => setIsOverNotificationDropdown(true)}
                  onMouseLeave={() => {
                    setIsOverNotificationDropdown(false)
                    handleNotificationMouseLeave()
                  }}
                >
                  <div className="bg-gray-600 rounded-lg shadow-md border border-gray-700">
                    <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                      <h3 className="font-medium text-white">Notifications</h3>
                      <button
                        className="text-xs text-blue-400 hover:text-blue-300"
                        onClick={markAllNotificationsAsRead}
                      >
                        Mark all as read
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="p-4 text-center">
                          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
                        </div>
                      ) : notifications.length > 0 ? (
                        <div>
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors duration-200 ${!notification.read ? "bg-gray-700" : ""}`}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex items-start">
                                <div className="mr-3">
                                  <div
                                    className={`h-8 w-8 rounded-full flex items-center justify-center ${!notification.read ? "bg-blue-600" : "bg-gray-500"}`}
                                  >
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-white">
                                    <span className="font-semibold">{notification.sender.username || "Someone"}</span>{" "}
                                    {notification.message || getNotificationText(notification.notification_type)}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notification.timestamp)}</p>
                                </div>
                                {!notification.read && (
                                  <div className="h-2 w-2 rounded-full bg-blue-500 self-center"></div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-400">
                          <p>No notifications</p>
                        </div>
                      )}
                    </div>

                    <div className="p-2 border-t border-gray-700">
                      <button className="w-full text-center text-sm text-blue-400 hover:text-blue-300 py-1">
                        View all notifications
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div
              className="relative"
              ref={profileDropdownRef}
              onMouseEnter={handleProfileMouseEnter}
              onMouseLeave={handleProfileMouseLeave}
            >
              <button className="ml-2 p-2 rounded-full text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-white flex items-center">
                <UserCircle size={24} />
                <ChevronDown
                  size={16}
                  className={`ml-1 transition-transform duration-200 ${showProfileDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showProfileDropdown && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-gray-600 rounded-lg shadow-lg z-20"
                  onMouseEnter={() => setIsOverProfileDropdown(true)}
                  onMouseLeave={() => {
                    setIsOverProfileDropdown(false)
                    handleProfileMouseLeave()
                  }}
                >
                  {tokenError ? (
                    <div className="px-4 py-3 text-white">
                      <div className="flex items-center text-amber-400 mb-2">
                        <AlertTriangle size={16} className="mr-2" />
                        <p className="text-sm font-medium">Access Token Not Found</p>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">Please log in to access your profile</p>
                      <button
                        onClick={handleRedirectToLogin}
                        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-sm"
                      >
                        Go to Login
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-600 rounded-lg shadow-md border border-gray-700">
                      {/* User Profile Section */}
                      <div className="p-4 border-b border-gray-700">
                        {profileLoading ? (
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                            <div className="h-5 w-32 bg-gray-200 animate-pulse"></div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 bg-gray-200">
                              <AvatarImage src="" alt={`${userProfile?.username}'s avatar`} />
                              <AvatarFallback className="bg-gray-300 text-gray-600">
                                {userProfile ? getInitials(userProfile.username) : "MK"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-white">{userProfile?.username || "User"}</span>
                          </div>
                        )}
                      </div>

                      {/* Edit profile button */}
                      <div className="p-2">
                        <Link href="/profile">
                          <Button
                            variant="secondary"
                            className="w-full justify-center bg-gray-700 hover:bg-gray-600 text-white font-medium"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit profile
                          </Button>
                        </Link>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        <ul className="space-y-1">
                          <li>
                            <Button variant="ghost" className="w-full justify-between font-normal text-gray-200">
                              <div className="flex items-center">
                                <Settings className="h-5 w-5 mr-3" />
                                Settings & privacy
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </Button>
                          </li>
                          <li>
                            <Button variant="ghost" className="w-full justify-between font-normal text-gray-200">
                              <div className="flex items-center">
                                <HelpCircle className="h-5 w-5 mr-3" />
                                Help & support
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </Button>
                          </li>
                          <li>
                            <Button variant="ghost" className="w-full justify-between font-normal text-gray-200">
                              <div className="flex items-center">
                                <Moon className="h-5 w-5 mr-3" />
                                Display & accessibility
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </Button>
                          </li>
                          <li>
                            <Button variant="ghost" className="w-full justify-between font-normal text-gray-200">
                              <div className="flex items-center">
                                <MessageSquare className="h-5 w-5 mr-3" />
                                Give feedback
                              </div>
                              <span className="text-xs text-gray-500">CTRL B</span>
                            </Button>
                          </li>
                          <li>
                            <Button
                              variant="ghost"
                              className="w-full justify-start font-normal text-gray-200"
                              onClick={handleLogout}
                            >
                              <LogOut className="h-5 w-5 mr-3" />
                              Log out
                            </Button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-white"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/for-you"
              className={`${pathname === "/for-you" ? "bg-blue-700" : "hover:bg-blue-700"} block px-3 py-2 rounded-md text-base font-medium`}
            >
              For You
            </Link>
            <Link
              href="/discover"
              className={`${pathname === "/discover" ? "bg-blue-700" : "hover:bg-blue-700"} block px-3 py-2 rounded-md text-base font-medium`}
            >
              Discover
            </Link>
            <Link
              href="/artists"
              className={`${pathname === "/artists" ? "bg-blue-700" : "hover:bg-blue-700"} block px-3 py-2 rounded-md text-base font-medium`}
            >
              Artists
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-blue-700">
            <div className="px-5 relative" ref={searchRef}>
              <div className="relative">
                <input
                  className={`bg-blue-100 text-blue-800 rounded-full pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 ${isSearchActive ? "ring-2 ring-pink-500 shadow-lg" : "focus:ring-pink-500"}`}
                  type="text"
                  placeholder="Search for songs, artists, or albums..."
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setIsSearchActive(true)
                    if (query.trim() !== "") setShowSuggestions(true)
                  }}
                  value={query}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className={`${isSearchActive ? "text-pink-600" : "text-blue-600"}`} />
                </div>
                {isLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {showSuggestions && (
                  <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg z-50 overflow-hidden">
                    {searchResults.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto py-1 text-sm">
                        {searchResults.map((result, index) => (
                          <li
                            key={result.track_id}
                            className={`px-4 py-2 cursor-pointer flex items-center text-gray-800 ${index === activeSuggestion ? "bg-gray-200" : ""}`}
                            onClick={() => handleSuggestionClick(result)}
                            onMouseEnter={() => setActiveSuggestion(index)}
                          >
                            {result.album_cover && (
                              <img
                                src={result.album_cover || "/placeholder.svg"}
                                alt=""
                                className="w-8 h-8 mr-3 rounded"
                              />
                            )}
                            <div>
                              <p className="font-medium">{result.name}</p>
                              <p className="text-xs text-gray-500">{result.artist}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-700">No results found for "{query}"</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile profile section */}
            <div className="mt-3 px-5">
              {tokenError ? (
                <div className="bg-amber-100 text-amber-800 rounded-md p-3 mb-3">
                  <div className="flex items-center mb-2">
                    <AlertTriangle size={16} className="mr-2" />
                    <p className="font-medium">Access Token Not Found</p>
                  </div>
                  <p className="text-xs mb-2">Please log in to access your profile</p>
                  <button
                    onClick={handleRedirectToLogin}
                    className="mt-1 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
                  >
                    Go to Login
                  </button>
                </div>
              ) : (
                <>
                  {userProfile && (
                    <div className="bg-blue-800 rounded-md p-3 mb-3">
                      <p className="text-sm font-medium">{userProfile.username}</p>
                      <p className="text-xs text-blue-200 mt-1 truncate">{userProfile.email}</p>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <Link
                      href="/profile"
                      className="flex items-center py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 transition duration-150"
                    >
                      <User size={20} className="mr-2" />
                      <span>My Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center py-2 px-4 rounded-md bg-red-600 hover:bg-red-700 transition duration-150 text-white"
                    >
                      <LogOut size={20} className="mr-2" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar

