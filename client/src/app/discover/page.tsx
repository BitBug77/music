"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import type React from "react"
import {
  Clock,
  Plus,
  Headphones,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Play,
  Pause,
} from "lucide-react"
import Navbar from "../navbar/page"
import Sidebar from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { AddToPlaylistModal, CreatePlaylistModal, PlaylistModalStyles } from "@/components/ui/playlist-modals"
import FeaturedPlaylistsSection from "@/components/ui/featured-playlist-section"
import SoundSpectrum from "@/components/ui/sound-spectrum"

// Define TypeScript interfaces for our data structures
interface ApiResponse {
  songs?: any[]
  data?: any[]
  items?: any[]
  results?: any[]
  // Add other possible root properties
}

interface ProcessedSong {
  id: number
  title: string
  artist: string
  popularity: number
  spotifyUrl: string
  spotifyTrackId: string
  coverUrl: string
}

interface SongCardProps {
  song: ProcessedSong
}

interface Playlist {
  id: number
  title: string
  created_at: string
}

interface Position {
  x: number
  y: number
}

// SongCard Component
const SongCard: React.FC<SongCardProps> = ({ song }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-lg shadow-lg">
        <img
          src={song.coverUrl || "/placeholder.svg"}
          alt={song.title}
          className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-80"></div>
        <div className="absolute bottom-0 left-0 p-3">
          <h3 className="text-white font-medium truncate">{song.title}</h3>
          <p className="text-gray-300 text-sm truncate">{song.artist}</p>
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
            }}
            className="bg-gray-500 rounded-full p-1.5 shadow-lg hover:bg-gray-400 transition-colors"
          >
            <Plus size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DiscoverPage() {
  // State for hovered song
  const [hoveredSong, setHoveredSong] = useState<ProcessedSong | null>(null)
  const [popularSongs, setPopularSongs] = useState<ProcessedSong[]>([])
  const [trendingSongs, setTrendingSongs] = useState<ProcessedSong[]>([])
  const [isPopularLoading, setIsPopularLoading] = useState<boolean>(true)
  const [isTrendingLoading, setIsTrendingLoading] = useState<boolean>(true)
  const [popularError, setPopularError] = useState<string | null>(null)
  const [trendingError, setTrendingError] = useState<string | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null)
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false)
  const [currentSong, setCurrentSong] = useState<ProcessedSong | null>(null)
  const router = useRouter()
  const [previewingSong, setPreviewingSong] = useState<string | null>(null)
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<number | null>(null)
  const [addedToPlaylistId, setAddedToPlaylistId] = useState<number | null>(null)
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [pendingHoveredSong, setPendingHoveredSong] = useState<ProcessedSong | null>(null)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  // States for draggable player
  const [playerPosition, setPlayerPosition] = useState<Position>({
    x: window.innerWidth - 400,
    y: window.innerHeight - 120,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const playerRef = useRef<HTMLDivElement>(null)

  // Refs for scrollable containers
  const artistsContainerRef = useRef<HTMLDivElement>(null)
  const popularContainerRef = useRef<HTMLDivElement>(null)
  const recentContainerRef = useRef<HTMLDivElement>(null)

  // States for CD player and slideshow
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [rotationDegree, setRotationDegree] = useState(0)
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recentSongs = useRef<ProcessedSong[]>([])

  const handlePreview = (trackId: string | null) => {
    setPreviewingSong(trackId)
  }

  // Helper function to process song data from API
  const processSongsData = (songsArray: any[]): ProcessedSong[] => {
    return songsArray.map((song, index) => {
      // Get artist name handling various possible structures
      let artistName = "Unknown Artist"

      if (song.artist) {
        // Direct artist name as string
        artistName = song.artist
      } else if (song.artists) {
        if (Array.isArray(song.artists) && song.artists.length > 0) {
          // Array of artist objects with name property
          if (typeof song.artists[0] === "object" && song.artists[0].name) {
            artistName = song.artists[0].name
          } else if (typeof song.artists[0] === "string") {
            // Array of artist names as strings
            artistName = song.artists[0]
          }
        } else if (typeof song.artists === "string") {
          // Single artist name as string
          artistName = song.artists
        } else if (typeof song.artists === "object" && song.artists !== null) {
          // Single artist object
          artistName = song.artists.name || "Unknown Artist"
        }
      }

      // Look for spotifyTrackId directly in the API response
      let spotifyTrackId = ""

      // Check if spotifyTrackId is directly available
      if (song.spotifyTrackId) {
        spotifyTrackId = song.spotifyTrackId
      } else if (song.spotify_id) {
        spotifyTrackId = song.spotify_id
      } else if (song.track_id) {
        spotifyTrackId = song.track_id
      }

      // Handle external URLs for Spotify
      let spotifyUrl = "#"
      if (song.external_urls && song.external_urls.spotify) {
        spotifyUrl = song.external_urls.spotify
      } else if (song.spotifyUrl) {
        spotifyUrl = song.spotifyUrl
      } else if (song.spotify_url) {
        spotifyUrl = song.spotify_url
      } else if (song.url) {
        spotifyUrl = song.url
      }

      // If we still don't have a track ID, try to extract it from URL
      if (!spotifyTrackId && spotifyUrl !== "#") {
        // Look for /track/ in the URL
        if (spotifyUrl.includes("/track/")) {
          const urlParts = spotifyUrl.split("/track/")
          if (urlParts.length > 1) {
            spotifyTrackId = urlParts[1].split("?")[0]
          }
        }
      }

      return {
        id: index + 1,
        title: song.name || song.title || "Unknown Title",
        artist: artistName,
        popularity: song.popularity || 50,
        spotifyUrl: spotifyUrl,
        spotifyTrackId: spotifyTrackId,
        // Use a fallback if album_cover is not available
        coverUrl: song.album_cover || song.cover || song.image || "",
      }
    })
  }

  // Helper function to extract songs array from API response
  const extractSongsArray = (responseData: any): any[] => {
    let songsArray: any[] = []

    if (Array.isArray(responseData)) {
      // Direct array response
      songsArray = responseData
    } else if (typeof responseData === "object" && responseData !== null) {
      // Object response with possible array properties
      const apiResponse = responseData as ApiResponse
      // Try to find the array in the response
      songsArray = apiResponse.songs || apiResponse.data || apiResponse.items || apiResponse.results || []

      // If still not found, look for any array property
      if (songsArray.length === 0) {
        for (const key in apiResponse) {
          if (Array.isArray(apiResponse[key as keyof ApiResponse])) {
            songsArray = apiResponse[key as keyof ApiResponse] as unknown as any[]
            break
          }
        }
      }
    }

    return songsArray
  }

  const handleSongHover = useCallback((song: ProcessedSong | null) => {
    // Clear any existing timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }

    if (song === null) {
      // If we're leaving a song, set pending to null but don't immediately clear the displayed song
      setPendingHoveredSong(null)
      return
    }

    // Set the pending song immediately
    setPendingHoveredSong(song)

    // Set a timer to update the actual hovered song after delay
    hoverTimerRef.current = setTimeout(() => {
      setHoveredSong(song)
    }, 2000) // 2 second delay for better UX
  }, [])

  // Draggable player functions
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (playerRef.current && !e.defaultPrevented) {
      const rect = playerRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
    }
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && playerRef.current) {
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - playerRef.current.offsetWidth))
        const newY = Math.max(
          0,
          Math.min(e.clientY - dragOffset.y, window.innerHeight - playerRef.current.offsetHeight),
        )

        setPlayerPosition({ x: newX, y: newY })
      }
    },
    [isDragging, dragOffset],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // CD Player and Slideshow functions
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const nextSlide = useCallback(() => {
    if (recentSongs.current.length === 0) return

    setCurrentSlideIndex((prevIndex) => (prevIndex === recentSongs.current.length - 1 ? 0 : prevIndex + 1))
  }, [])

  const prevSlide = useCallback(() => {
    if (recentSongs.current.length === 0) return

    setCurrentSlideIndex((prevIndex) => (prevIndex === 0 ? recentSongs.current.length - 1 : prevIndex - 1))
  }, [])

  // Add and remove event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Effect for CD rotation animation
  useEffect(() => {
    // Always rotate the CD at a slow speed
    rotationIntervalRef.current = setInterval(() => {
      setRotationDegree((prev) => (prev + (isPlaying ? 1 : 0.2)) % 360)
    }, 50)

    // Always run slideshow, regardless of play state
    slideshowIntervalRef.current = setInterval(() => {
      nextSlide()
    }, 5000) // Changed from 3000 to 5000 for slower slideshow

    return () => {
      if (rotationIntervalRef.current) clearInterval(rotationIntervalRef.current)
      if (slideshowIntervalRef.current) clearInterval(slideshowIntervalRef.current)
    }
  }, [nextSlide])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Fetch popular songs from your API
    const fetchPopularSongs = async () => {
      try {
        setIsPopularLoading(true)

        // Retrieve the access token from localStorage
        const accessToken = localStorage.getItem("access_token")

        if (!accessToken) {
          throw new Error("Access token is missing. Please log in again.")
        }

        // Set up the request headers with the Authorization header
        const response = await fetch("http://127.0.0.1:8000/popularity/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // Attach access token here
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch popular songs")
        }

        const responseData = await response.json()
        console.log("Popular Songs API Response:", responseData) // Log the API response for debugging

        const songsArray = extractSongsArray(responseData)

        if (songsArray.length === 0) {
          throw new Error("No songs found in API response")
        }

        // Process the songs array
        const processedSongs = processSongsData(songsArray)

        // Sort by popularity (highest first)
        processedSongs.sort((a, b) => b.popularity - a.popularity)

        // Filter out duplicate artists, keeping only the most popular song from each artist
        const uniqueArtistSongs = processedSongs.reduce<ProcessedSong[]>((acc, song) => {
          // Check if we already have a song from this artist
          const artistExists = acc.some((s) => s.artist.toLowerCase() === song.artist.toLowerCase())

          // If this artist doesn't exist in our filtered list yet, add the song
          if (!artistExists) {
            acc.push(song)
          }

          return acc
        }, [])

        setPopularSongs(uniqueArtistSongs)
      } catch (err) {
        setPopularError(err instanceof Error ? err.message : "An unknown error occurred")
        console.error("Error fetching popular songs:", err)

        // Fallback to mock data in case of API error
        setPopularSongs([
          {
            id: 1,
            title: "Blinding Lights",
            artist: "The Weeknd",
            popularity: 95,
            spotifyUrl: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
            spotifyTrackId: "0VjIjW4GlUZAMYd2vXMi3b",
            coverUrl: "",
          },
          {
            id: 2,
            title: "As It Was",
            artist: "Harry Styles",
            popularity: 92,
            spotifyUrl: "https://open.spotify.com/track/4Dvkj6JhhA12EX05fT7y2e",
            spotifyTrackId: "4Dvkj6JhhA12EX05fT7y2e",
            coverUrl: "",
          },
          // More fallback songs could be added here
        ])
      } finally {
        setIsPopularLoading(false)
      }
    }

    // Fetch trending songs from API
    const fetchTrendingSongs = async () => {
      try {
        setIsTrendingLoading(true)

        // Retrieve the access token from localStorage
        const accessToken = localStorage.getItem("access_token")

        if (!accessToken) {
          throw new Error("Access token is missing. Please log in again.")
        }

        // Set up the request headers with the Authorization header
        const response = await fetch("http://127.0.0.1:8000/api/recommendations/trending/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // Attach access token here
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch trending songs")
        }

        const responseData = await response.json()
        console.log("Trending Songs API Response:", responseData) // Log the API response for debugging

        const songsArray = extractSongsArray(responseData)

        if (songsArray.length === 0) {
          throw new Error("No trending songs found in API response")
        }

        // Process the songs array
        const processedSongs = processSongsData(songsArray)

        // Sort by popularity (highest first) if available
        processedSongs.sort((a, b) => b.popularity - a.popularity)

        setTrendingSongs(processedSongs)
      } catch (err) {
        setTrendingError(err instanceof Error ? err.message : "An unknown error occurred")
        console.error("Error fetching trending songs:", err)

        // Fallback to mock data in case of API error
        setTrendingSongs([
          {
            id: 1,
            title: "Flowers",
            artist: "Miley Cyrus",
            popularity: 98,
            spotifyUrl: "https://open.spotify.com/track/0V3wPSX9ygBnCm8psDIegu",
            spotifyTrackId: "0V3wPSX9ygBnCm8psDIegu",
            coverUrl: "",
          },
          {
            id: 2,
            title: "Kill Bill",
            artist: "SZA",
            popularity: 96,
            spotifyUrl: "https://open.spotify.com/track/1Qrg8KqiBpW07V7PNxwwwL",
            spotifyTrackId: "1Qrg8KqiBpW07V7PNxwwwL",
            coverUrl: "",
          },
          // More fallback songs could be added here
        ])
      } finally {
        setIsTrendingLoading(false)
      }
    }

    // Fetch playlists
    fetchPlaylists()

    // Fetch actual API data
    fetchPopularSongs()
    fetchTrendingSongs()
  }, [])

  // Update recentSongs ref when popularSongs or trendingSongs change
  useEffect(() => {
    if (!isPopularLoading && !isTrendingLoading) {
      const combinedSongs = [...popularSongs.slice(4), ...trendingSongs.slice(4)].filter((song) => song.coverUrl)

      recentSongs.current = combinedSongs

      // Reset current slide index if needed
      if (currentSlideIndex >= combinedSongs.length) {
        setCurrentSlideIndex(0)
      }
    }
  }, [popularSongs, trendingSongs, isPopularLoading, isTrendingLoading, currentSlideIndex])

  const addSongToPlaylist = async (playlistId: number, spotifyTrackId: string) => {
    try {
      setAddingToPlaylistId(playlistId)
      setAddedToPlaylistId(null) // Reset success state

      const token = localStorage.getItem("access_token") || ""

      const response = await fetch(`http://127.0.0.1:8000/playlists/${playlistId}/songs/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spotify_track_id: spotifyTrackId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to add song: ${response.status}`)
      }

      const data = await response.json()
      if (data.status === "success") {
        setAddingToPlaylistId(null) // Clear loading state first
        setAddedToPlaylistId(playlistId) // Then set success state

        setTimeout(() => {
          setIsPlaylistModalOpen(false)
          // Reset states after modal closes
          setTimeout(() => {
            setAddedToPlaylistId(null)
          }, 300)
        }, 1500)
        return true
      } else {
        throw new Error("Failed to add song to playlist")
      }
    } catch (error) {
      console.error("Error adding song:", error)
      setAddingToPlaylistId(null)
      throw error
    }
  }

  const createNewPlaylist = async (title: string) => {
    if (!title.trim()) return

    try {
      setIsCreatingPlaylist(true)
      const token = localStorage.getItem("access_token") || ""

      const response = await fetch("http://127.0.0.1:8000/playlists/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create playlist: ${response.status}`)
      }

      const data = await response.json()
      console.log("New playlist:", data)

      if (data.status === "success") {
        // Refresh playlists
        await fetchPlaylists()

        // Close the create playlist modal
        setIsCreatePlaylistModalOpen(false)

        // If we have a current song, automatically select the new playlist
        if (currentSong && data.playlist && data.playlist.id) {
          setSelectedPlaylist(data.playlist.id)
        }
      }
    } catch (error) {
      console.error("Error creating playlist:", error)
      alert(error instanceof Error ? error.message : "Failed to create playlist")
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  const fetchPlaylists = async () => {
    try {
      const token = localStorage.getItem("access_token") || ""
      const response = await fetch("http://127.0.0.1:8000/playlists/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch playlists: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === "success" && Array.isArray(data.playlists)) {
        setPlaylists(data.playlists)
      }
    } catch (error) {
      console.error("Error fetching playlists:", error)
    }
  }

  const openAddToPlaylistModal = (song: ProcessedSong) => {
    // Reset states when opening modal
    setAddingToPlaylistId(null)
    setAddedToPlaylistId(null)
    setCurrentSong(song)
    setIsPlaylistModalOpen(true)
  }

  const closePlaylistModal = () => {
    setIsPlaylistModalOpen(false)
    // Reset states after modal closes
    setTimeout(() => {
      setAddingToPlaylistId(null)
      setAddedToPlaylistId(null)
    }, 300)
  }

  const openCreatePlaylistModal = () => {
    setIsCreatePlaylistModalOpen(true)
  }

  const closeCreatePlaylistModal = () => {
    setIsCreatePlaylistModalOpen(false)
  }

  // Scroll functions for carousel navigation
  const scrollContainer = (containerRef: React.RefObject<HTMLDivElement>, direction: "left" | "right") => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scrollAmount = direction === "left" ? -container.clientWidth * 0.8 : container.clientWidth * 0.8

    container.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    })
  }

  const renderScrollableSection = (
    title: string,
    icon: React.ReactNode,
    items: React.ReactNode[],
    containerRef: React.RefObject<HTMLDivElement>,
    isLoading: boolean,
    error: string | null,
    emptyMessage: string,
  ) => {
    return (
      <section className="mb-16 relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center text-blue-700">
            {icon}
            {title}
          </h2>
          <a href="#" className="text-sm text-gray-400 hover:underline">
            See All
          </a>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-400"></div>
          </div>
        ) : error ? (
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-gray-600">Error: {error}</p>
            <p className="text-blue-600 mt-2">Showing mock data as fallback</p>
          </div>
        ) : items.length > 0 ? (
          <div className="relative group">
            {/* Left scroll button */}
            <button
              onClick={() => scrollContainer(containerRef, "left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg -ml-3"
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Scrollable container */}
            <div
              ref={containerRef}
              className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {items}
            </div>

            {/* Right scroll button */}
            <button
              onClick={() => scrollContainer(containerRef, "right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg -mr-3"
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>

            {/* Gradient fades for edges */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#151b27] to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#151b27] to-transparent pointer-events-none"></div>
          </div>
        ) : (
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-gray-600">{emptyMessage}</p>
          </div>
        )}
      </section>
    )
  }

  // Render the Vinyl Record Player for Recently Added section
  const renderVinylPlayer = () => {
    const currentSong = recentSongs.current[currentSlideIndex]

    if (!currentSong) return null

    return (
      <section className="mb-16 relative w-1/2 group/player mr-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center text-blue-700">
            <Clock size={20} className="mr-2 text-gray-400" />
            Recently Added
          </h2>
          <a href="#" className="text-sm text-gray-400 hover:underline">
            See All
          </a>
        </div>

        {isPopularLoading || isTrendingLoading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-400"></div>
          </div>
        ) : popularError && trendingError ? (
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-gray-600">Error: Failed to load recent tracks</p>
            <p className="text-blue-600 mt-2">Showing mock data as fallback</p>
          </div>
        ) : recentSongs.current.length > 0 ? (
          <div className="relative rounded-xl overflow-hidden shadow-2xl">
            {/* Dynamic background based on current album */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${currentSong.coverUrl || "/placeholder.svg"})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(20px) brightness(0.7)",
                transform: "scale(1.1)",
              }}
            ></div>

            {/* Overlay to make content readable */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/40 to-purple-500/40 backdrop-blur-sm"></div>

            {/* Left navigation arrow - only visible on hover */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/30 backdrop-blur-sm hover:bg-white/50 text-white rounded-full p-3 transition-colors shadow-lg opacity-0 group-hover/player:opacity-100"
              aria-label="Previous track"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Right navigation arrow - only visible on hover */}
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/30 backdrop-blur-sm hover:bg-white/50 text-white rounded-full p-3 transition-colors shadow-lg opacity-0 group-hover/player:opacity-100"
              aria-label="Next track"
            >
              <ChevronRight size={24} />
            </button>

            <div className="relative z-10 p-8">
              <div className="flex flex-col items-center justify-center">
                {/* Combined Album Cover and Vinyl Record - moved down with padding-top */}
                <div className="relative w-full max-w-3xl mx-auto pt-12">
                  {/* Album Cover - Tilted to the left */}
                  <div
                    className="relative w-[70%] max-w-md aspect-square shadow-2xl rounded-lg overflow-hidden z-10 mx-auto md:mx-0"
                    style={{
                      transform: "rotate(-5deg)",
                      transformOrigin: "center",
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    <img
                      src={currentSong.coverUrl || "/placeholder.svg"}
                      alt={currentSong.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Album title overlay */}
                    <div className="absolute top-4 left-4 text-2xl font-bold text-white drop-shadow-lg">
                      {currentSong.title}
                    </div>

                    {/* Play/Pause button */}
                    <div className="absolute bottom-4 right-4">
                      <button
                        onClick={togglePlayPause}
                        className="bg-white/30 backdrop-blur-sm hover:bg-white/50 text-white rounded-full p-3 transition-colors shadow-lg"
                        aria-label={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                      </button>
                    </div>
                  </div>

                  {/* Vinyl Record - Smaller and positioned more to the right */}
                  <div className="absolute top-[5%] right-[15%] w-[55%] aspect-square z-20">
                    {/* Black vinyl record with subtle color/texture */}
                    <div
                      className="absolute inset-0 rounded-full z-10 flex items-center justify-center"
                      style={{
                        transform: `rotate(${rotationDegree}deg)`,
                        transition: "transform 0.05s linear",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                        background: "radial-gradient(circle at center, #333 0%, #222 40%, #111 70%, #000 100%)",
                        overflow: "hidden",
                      }}
                    >
                      {/* Vinyl grooves as circles with varying light/dark areas */}
                      <div className="absolute inset-[8%] rounded-full border border-gray-800 opacity-40"></div>
                      <div className="absolute inset-[16%] rounded-full border border-gray-700 opacity-30"></div>
                      <div className="absolute inset-[24%] rounded-full border border-gray-800 opacity-40"></div>
                      <div className="absolute inset-[32%] rounded-full border border-gray-700 opacity-30"></div>
                      <div className="absolute inset-[40%] rounded-full border border-gray-800 opacity-40"></div>
                      <div className="absolute inset-[48%] rounded-full border border-gray-700 opacity-30"></div>
                      <div className="absolute inset-[56%] rounded-full border border-gray-800 opacity-40"></div>
                      <div className="absolute inset-[64%] rounded-full border border-gray-700 opacity-30"></div>
                      <div className="absolute inset-[72%] rounded-full border border-gray-800 opacity-40"></div>
                      <div className="absolute inset-[80%] rounded-full border border-gray-700 opacity-30"></div>

                      {/* Light reflections to create realistic vinyl look */}
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%)",
                          filter: "blur(5px)",
                        }}
                      ></div>

                      <div
                        className="absolute inset-0 opacity-15"
                        style={{
                          background:
                            "radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 60%)",
                        }}
                      ></div>

                      <div
                        className="absolute inset-0 opacity-10"
                        style={{
                          background:
                            "radial-gradient(ellipse at 70% 60%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)",
                        }}
                      ></div>

                      {/* Center label - styled to match album cover vibe */}
                      <div
                        className="absolute inset-0 m-[25%] rounded-full overflow-hidden flex items-center justify-center shadow-inner border-4 border-black"
                        style={{
                          backgroundImage: `url(${currentSong.coverUrl || "/placeholder.svg"})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          filter: "blur(1px) brightness(0.7)",
                        }}
                      >
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
                        <div className="relative text-center p-2 z-10">
                          <div className="text-sm font-bold text-white uppercase truncate">{currentSong.artist}</div>
                          <div className="text-xs text-white/80 truncate">{currentSong.title}</div>
                        </div>
                      </div>

                      {/* Center hole - grey border with transparent inside */}
                      <div className="absolute inset-0 m-[48%] rounded-full bg-transparent border-2 border-gray-500"></div>
                    </div>
                  </div>
                </div>

                {/* Track info */}
                <div className="mt-16 text-center">
                  <h3 className="text-2xl font-bold text-white">{currentSong.title}</h3>
                  <p className="text-white/80 text-lg">{currentSong.artist}</p>
                  <div className="text-white/60 text-sm mt-2">
                    Track {currentSlideIndex + 1} of {recentSongs.current.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-gray-600">No recent tracks available at the moment.</p>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="flex flex-col min-h-screen text-black">
      {/* Navbar */}
      <div className="bg-[#74686e]">
        <Navbar />
      </div>

      {/* Sidebar component */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-[#151b27] px-4 md:px-8 lg:px-12">
        {/* Header */}
        <div className="pt-8 pb-4">
          <h1 className="text-3xl text-white font-bold mb-2">Discover</h1>
          <p className="text-gray-400">Explore new music based on what's trending</p>
        </div>

        {/* Content */}
        <div className="py-8">
          {/* Featured Track Section with all trending songs */}
          <section className="mb-20 overflow-hidden relative">
            {isTrendingLoading ? (
              <div className="h-64 bg-gray-800/50 rounded-xl animate-pulse"></div>
            ) : trendingSongs.length > 0 ? (
              <div className="relative rounded-xl overflow-hidden">
                {/* Background watermark with fade effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#1e293b]/80 to-transparent z-0">
                  <img
                    src={trendingSongs[0]?.coverUrl || "/placeholder.svg"}
                    alt="Background"
                    className="w-full h-full object-cover opacity-10 scale-110"
                  />
                </div>

                {/* Gradient overlay that fades into the main background */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#151b27]/70 to-[#151b27] z-0"></div>

                {/* Content */}
                <div className="relative z-10 pt-8 pb-16">
                  <div className="container mx-auto px-6">
                    <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Featured Tracks</div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-3xl font-bold text-white">Top Trending</h2>
                      <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                        See All
                      </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Featured track (larger) */}
                      {trendingSongs.length > 0 && (
                        <div className="md:col-span-1 md:row-span-2 group cursor-pointer">
                          <div className="relative overflow-hidden rounded-lg shadow-lg h-full">
                            <img
                              src={trendingSongs[0]?.coverUrl || "/placeholder.svg"}
                              alt={trendingSongs[0]?.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-80"></div>
                            <div className="absolute bottom-0 left-0 p-4">
                              <div className="text-xs uppercase tracking-wider text-gray-300 mb-1">Featured Track</div>
                              <h3 className="text-white text-xl font-bold truncate">{trendingSongs[0]?.title}</h3>
                              <p className="text-gray-300 text-sm truncate">{trendingSongs[0]?.artist}</p>

                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    trendingSongs[0] && openAddToPlaylistModal(trendingSongs[0])
                                  }}
                                  className="bg-gray-500 rounded-full p-1.5 shadow-lg hover:bg-gray-400 transition-colors"
                                >
                                  <Plus size={16} className="text-white" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    trendingSongs[0] &&
                                      window.open(
                                        `https://open.spotify.com/track/${trendingSongs[0].spotifyTrackId}`,
                                        "_blank",
                                      )
                                  }}
                                  className="bg-white/10 backdrop-blur-sm rounded-full p-1.5 shadow-lg hover:bg-white/20 transition-colors"
                                >
                                  <ExternalLink size={16} className="text-white" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3x2 grid for other trending tracks */}
                      <div className="md:col-span-2 grid grid-cols-3 gap-6">
                        {trendingSongs.slice(1, 7).map((song) => (
                          <div
                            key={song.id}
                            className="group cursor-pointer"
                            onClick={() => song && openAddToPlaylistModal(song)}
                          >
                            <div className="relative overflow-hidden rounded-lg shadow-lg">
                              <img
                                src={song.coverUrl || "/placeholder.svg"}
                                alt={song.title}
                                className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-80"></div>
                              <div className="absolute bottom-0 left-0 p-3">
                                <h3 className="text-white font-medium truncate">{song.title}</h3>
                                <p className="text-gray-300 text-sm truncate">{song.artist}</p>
                              </div>
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openAddToPlaylistModal(song)
                                  }}
                                  className="bg-gray-500 rounded-full p-1.5 shadow-lg hover:bg-gray-400 transition-colors"
                                >
                                  <Plus size={16} className="text-white" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 bg-gray-800 rounded-xl flex items-center justify-center">
                <p className="text-gray-400">No featured tracks available</p>
              </div>
            )}
          </section>

          {/* Loading Skeleton */}
          {isTrendingLoading && isPopularLoading ? (
            <div className="space-y-8">
              {/* Popular Tracks Skeleton */}
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-8 w-48 bg-gray-300 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-300 rounded-md p-4 animate-pulse">
                      <div className="w-full aspect-square rounded-md bg-gray-400 mb-4"></div>
                      <div className="h-5 bg-gray-400 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-400 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <>
              {/* Popular Tracks Section */}
              {renderScrollableSection(
                "Popular Tracks",
                <Headphones size={24} className="mr-2 text-gray-400" />,
                popularSongs
                  .filter((song) => song.coverUrl)
                  .map((song) => (
                    <div key={song.id} className="flex-shrink-0 w-[20%] min-w-[180px]">
                      <SongCard
                        song={song}
                        onAddToPlaylist={() => openAddToPlaylistModal(song)}
                        onPreview={handlePreview}
                        setHoveredSong={handleSongHover}
                        handleSongHover={handleSongHover}
                      />
                    </div>
                  )),
                popularContainerRef,
                isPopularLoading,
                popularError,
                "No popular tracks available at the moment.",
              )}

              {/* Popular Artists Section */}
              <section className="mb-16 relative">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Artists You Might Like</h2>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                    View All
                  </a>
                </div>

                <div className="relative group">
                  {/* Left scroll button */}
                  <button
                    onClick={() => scrollContainer(artistsContainerRef, "left")}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg -ml-3"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {/* Scrollable container */}
                  <div
                    ref={artistsContainerRef}
                    className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 scroll-smooth"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {isPopularLoading
                      ? Array(7)
                          .fill(0)
                          .map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-[14.285%] min-w-[90px] flex flex-col items-center">
                              <div className="w-full aspect-square bg-gray-800 rounded-md animate-pulse mb-2"></div>
                              <div className="h-3 w-3/4 bg-gray-800 rounded animate-pulse"></div>
                            </div>
                          ))
                      : popularSongs.map((song, index) => (
                          <div
                            key={`artist-${index}`}
                            className="flex-shrink-0 w-[14.285%] min-w-[90px] flex flex-col items-center group cursor-pointer"
                          >
                            <div className="w-full aspect-square bg-gray-800 rounded-full overflow-hidden mb-1 relative">
                              <img
                                src={song.coverUrl || "/placeholder.svg"}
                                alt={song.artist}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity rounded-full"></div>
                            </div>
                            <span className="text-gray-300 text-xs truncate w-full text-center group-hover:text-white transition-colors">
                              {song.artist}
                            </span>
                          </div>
                        ))}
                  </div>

                  {/* Right scroll button */}
                  <button
                    onClick={() => scrollContainer(artistsContainerRef, "right")}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg -mr-3"
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* Gradient fades for edges */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#151b27] to-transparent pointer-events-none"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#151b27] to-transparent pointer-events-none"></div>
                </div>
              </section>

              {/* Recently Added Section - Vinyl Record Player with Slideshow */}
              <div className="flex flex-col md:flex-row gap-6">
                {renderVinylPlayer()}
                <section className="mb-16 relative w-full md:w-1/2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center text-blue-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 text-gray-400"
                      >
                        <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"></path>
                        <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2"></path>
                        <path d="M19 11h2m-1 -1v2"></path>
                      </svg>
                      Sound Spectrum
                    </h2>
                    <a href="#" className="text-sm text-gray-400 hover:underline">
                      Shuffle
                    </a>
                  </div>

                  {isPopularLoading || isTrendingLoading ? (
                    <div className="flex justify-center p-10">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-400"></div>
                    </div>
                  ) : (
                    <SoundSpectrum
                      isLoading={isPopularLoading || isTrendingLoading}
                      songs={recentSongs.current}
                      onExplore={nextSlide}
                    />
                  )}
                </section>
              </div>
            </>
          )}
        </div>

        {/* Featured Playlists Section */}
        <FeaturedPlaylistsSection />
      </div>

      {/* Playlist Modals */}
      <AddToPlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={closePlaylistModal}
        song={currentSong}
        playlists={playlists}
        onAddToPlaylist={addSongToPlaylist}
        onCreatePlaylistClick={openCreatePlaylistModal}
        addingToPlaylistId={addingToPlaylistId}
        addedToPlaylistId={addedToPlaylistId}
      />

      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={closeCreatePlaylistModal}
        onCreatePlaylist={createNewPlaylist}
        isCreating={isCreatingPlaylist}
      />

      {/* Global styles for modals */}
      <PlaylistModalStyles />

      {/* Draggable Spotify Player */}
      {hoveredSong && (
        <div
          ref={playerRef}
          className={`fixed z-50 shadow-2xl rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{
            left: `${playerPosition.x}px`,
            top: `${playerPosition.y}px`,
            touchAction: "none",
          }}
        >
          <div
            className="bg-black/80 backdrop-blur-md p-2 rounded-t-lg flex items-center justify-between"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal size={16} className="text-white/50" />
              <div className="text-white text-sm truncate max-w-[200px]">
                {hoveredSong.title} - {hoveredSong.artist}
              </div>
            </div>
            <button
              onClick={() => setHoveredSong(null)}
              className="text-white/70 hover:text-white"
              aria-label="Close player"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <iframe
            src={`https://open.spotify.com/embed/track/${hoveredSong.spotifyTrackId}?utm_source=generator&theme=0`}
            width="350"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          ></iframe>
        </div>
      )}

      {/* Hover Indicator */}
      {pendingHoveredSong && !hoveredSong && (
        <div className="fixed bottom-4 right-4 z-50 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
          Keep hovering to play...
        </div>
      )}
    </div>
  )
}
