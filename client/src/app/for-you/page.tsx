"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { Sparkles, Plus, ExternalLink, Music, Users, History } from "lucide-react"
import Navbar from "../navbar/page"
import Sidebar from "../../components/ui/sidebar"
import { useRouter } from "next/navigation"
import { AddToPlaylistModal, CreatePlaylistModal, PlaylistModalStyles } from "../../components/ui/playlist-modals"
import Footer from "@/components/ui/footer"
// Define TypeScript interfaces for our data structures
interface ApiResponse {
  songs?: any[]
  data?: any[]
  items?: any[]
  results?: any[]
  recommendations?: any[]
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

export default function ForYouPage() {
  const [personalizedSongs, setPersonalizedSongs] = useState<ProcessedSong[]>([])
  const [recentlyPlayedSongs, setRecentlyPlayedSongs] = useState<ProcessedSong[]>([])
  const [friendRecommendations, setFriendRecommendations] = useState<ProcessedSong[]>([])
  const [mostPlayedSongs, setMostPlayedSongs] = useState<ProcessedSong[]>([])
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<ProcessedSong[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
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

  const handlePreview = (trackId: string | null) => {
    setPreviewingSong(trackId)
  }

  const fetchPersonalizedSongs = async () => {
    try {
      setIsLoading(true)

      // Retrieve the access token from localStorage
      const accessToken = localStorage.getItem("access_token")

      if (!accessToken) {
        throw new Error("Access token is missing. Please log in again.")
      }

      // Create an array of fetch promises
      const fetchPromises = [
        // For You recommendations
        fetch("http://127.0.0.1:8000/api/recommendations/matrix/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then(async (response) => {
            if (!response.ok) {
              console.error("Failed to fetch personalized recommendations")
              return null
            }
            const data = await response.json()
            console.log("API Response (For You):", data)
            const processedSongs = processApiResponse(data)
            setPersonalizedSongs(processedSongs)
            return processedSongs
          })
          .catch((err) => {
            console.error("Error fetching personalized songs:", err)
            return null
          }),

        // Recently played
        fetch("http://127.0.0.1:8000/history/recent/?limit=4", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then(async (response) => {
            if (!response.ok) {
              console.error("Failed to fetch recently played songs")
              return null
            }
            const data = await response.json()
            console.log("API Response (Recently Played):", data)
            const processedSongs = processApiResponse(data)
            setRecentlyPlayedSongs(processedSongs)
            return processedSongs
          })
          .catch((err) => {
            console.error("Error fetching recently played songs:", err)
            return null
          }),

        // Friend recommendations
        fetch("http://127.0.0.1:8000/recommendations/friends/?limit=16", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then(async (response) => {
            if (!response.ok) {
              console.error("Failed to fetch friend recommendations")
              return null
            }
            const data = await response.json()
            console.log("API Response (Friend Recommendations):", data)
            const processedSongs = processApiResponse(data)
            setFriendRecommendations(processedSongs)
            return processedSongs
          })
          .catch((err) => {
            console.error("Error fetching friend recommendations:", err)
            return null
          }),

        // Most played songs - new endpoint
        fetch("http://127.0.0.1:8000/history/most-played/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then(async (response) => {
            if (!response.ok) {
              console.error("Failed to fetch most played songs")
              return null
            }
            const data = await response.json()
            console.log("API Response (Most Played):", data)
            const processedSongs = processApiResponse(data)
            setMostPlayedSongs(processedSongs)
            return processedSongs
          })
          .catch((err) => {
            console.error("Error fetching most played songs:", err)
            return null
          }),
        // Personalized recommendations - new endpoint
        fetch("http://127.0.0.1:8000/recommendations/personalized/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then(async (response) => {
            if (!response.ok) {
              console.error("Failed to fetch personalized recommendations")
              return null
            }
            const data = await response.json()
            console.log("API Response (Personalized Recommendations):", data)
            const processedSongs = processApiResponse(data)
            setPersonalizedRecommendations(processedSongs)
            return processedSongs
          })
          .catch((err) => {
            console.error("Error fetching personalized recommendations:", err)
            return null
          }),
      ]

      // Execute all promises in parallel
      Promise.allSettled(fetchPromises).then((results) => {
        // Check if all requests failed
        const allFailed = results.every(
          (result) => result.status === "rejected" || (result.status === "fulfilled" && result.value === null),
        )

        if (allFailed) {
          setError("Failed to fetch any recommendations")

          // Fallback to mock data in case all API requests fail
          setPersonalizedSongs([
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
        }

        setIsLoading(false)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      console.error("Error setting up API requests:", err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Fetch playlists
    fetchPlaylists()

    // Fetch actual API data
    fetchPersonalizedSongs()
  }, [])

  const processApiResponse = (responseData: any): ProcessedSong[] => {
    // Determine where the song array is in the response
    let songsArray: any[] = []

    if (Array.isArray(responseData)) {
      // Direct array response
      songsArray = responseData
    } else if (typeof responseData === "object" && responseData !== null) {
      // Object response with possible array properties
      const apiResponse = responseData as ApiResponse
      // Try to find the array in the response
      songsArray =
        apiResponse.recommendations ||
        apiResponse.songs ||
        apiResponse.data ||
        apiResponse.items ||
        apiResponse.results ||
        []

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

    if (songsArray.length === 0) {
      return []
    }

    // Process the songs array
    const processedSongs: ProcessedSong[] = songsArray.map((song, index) => {
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
        id: song.id || index + 1,
        title: song.name || song.title || "Unknown Title",
        artist: artistName,
        popularity: song.popularity || 50,
        spotifyUrl: spotifyUrl,
        spotifyTrackId: spotifyTrackId,
        // Use a fallback if album_cover is not available
        coverUrl: song.album_cover || song.cover || song.image || "",
      }
    })

    // Filter out songs with missing data
    return processedSongs.filter((song) => song.spotifyTrackId && song.coverUrl)
  }

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

  const renderSongSection = (
    title: string,
    icon: React.ReactNode,
    songs: ProcessedSong[],
    isLoading: boolean,
    error: string | null,
    emptyMessage: string,
  ) => {
    // Filter out songs with null/empty coverUrl
    const filteredSongs = songs.filter((song) => song.coverUrl)

    return (
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center text-blue-700">
            {icon}
            {title}
          </h2>
          <a href="#" className="text-sm text-pink-500 hover:underline">
            See All
          </a>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pink-500"></div>
          </div>
        ) : error ? (
          <div className="bg-pink-100 p-4 rounded-md">
            <p className="text-pink-600">Error: {error}</p>
            <p className="text-blue-600 mt-2">Showing mock data as fallback</p>
          </div>
        ) : filteredSongs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onAddToPlaylist={() => openAddToPlaylistModal(song)}
                onPreview={handlePreview}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-gray-600">{emptyMessage}</p>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="flex flex-col h-screen text-black">
      {/* Navbar */}
      <div className="bg-[#74686e]">
        <Navbar />
      </div>

      {/* Sidebar component */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-[#151b27]">
        {/* Header */}
        <div className="p-8">
          <div className="mb-4">
            <h1 className="text-3xl text-blue-700 font-bold">For You</h1>
          </div>
          <p className="text-pink-600">Personalized recommendations based on your listening habits</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="space-y-8">
              {/* Personalized Recommendations Skeleton */}
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

              {/* Recently Played Skeleton */}
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
              {/* Personalized Recommendations Section */}
              {renderSongSection(
                "Recommended For You",
                <Sparkles size={20} className="mr-2" />,
                personalizedSongs.slice(0, 20),
                isLoading,
                error,
                "No personalized recommendations available at the moment.",
              )}

              {/* Recently Played Section */}
              {renderSongSection(
                "Recently Played",
                <History size={20} className="mr-2" />,
                recentlyPlayedSongs,
                false,
                null,
                "No recently played tracks available.",
              )}

              {/* Friend Recommendations Section */}
              {renderSongSection(
                "From Friends",
                <Users size={20} className="mr-2" />,
                friendRecommendations,
                false,
                null,
                "No friend recommendations available at the moment.",
              )}

              {/* Most Played Section */}
              {renderSongSection(
                "Most Played",
                <Music size={20} className="mr-2" />,
                mostPlayedSongs,
                false,
                null,
                "No most played tracks available.",
              )}

              {/* Personalized Recommendations Section */}
              {renderSongSection(
                "Personalized For You",
                <Sparkles size={20} className="mr-2" />,
                personalizedRecommendations,
                false,
                null,
                "No personalized recommendations available at the moment.",
              )}

              {/* More Recommendations Section */}
              {renderSongSection(
                "More For You",
                <Music size={20} className="mr-2" />,
                personalizedSongs.slice(4),
                isLoading,
                error,
                "No additional recommendations available at the moment.",
              )}
            </>
          )}
        </div>
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
    </div>
  )
}

function SongCard({
  song,
  onAddToPlaylist,
  onPreview,
}: SongCardProps & {
  onAddToPlaylist: () => void
  onPreview: (trackId: string | null) => void
}) {
  const router = useRouter()
  const [isHovering, setIsHovering] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleSongClick = () => {
    router.push(`/song/${song.spotifyTrackId}`)
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)

    // Stop audio if playing
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
    }
  }

  // Play preview directly in the browser
  const handlePlayPreview = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation

    // If already playing, stop it
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
      return
    }

    // Try to play preview
    try {
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        // Use Spotify preview URL
        const previewUrl = `https://p.scdn.co/mp3-preview/${song.spotifyTrackId}`
        const audio = new Audio(previewUrl)
        audio.volume = 0.7

        audio.onended = () => {
          setIsPlaying(false)
        }

        audio.onerror = () => {
          console.error("Preview not available")
          setIsPlaying(false)

          // Fallback to opening Spotify
          window.open(`https://open.spotify.com/track/${song.spotifyTrackId}`, "_blank")
        }

        audioRef.current = audio
      }

      // Play the audio
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
          })
          .catch((error) => {
            console.error("Playback prevented:", error)

            // Fallback to opening Spotify
            window.open(`https://open.spotify.com/track/${song.spotifyTrackId}`, "_blank")
          })
      }
    } catch (error) {
      console.error("Error playing preview:", error)

      // Fallback to opening Spotify
      window.open(`https://open.spotify.com/track/${song.spotifyTrackId}`, "_blank")
    }
  }

  return (
    <div className="relative">
      <div
        className="bg-[#74686e] rounded-md p-4 hover:shadow-lg transition duration-200 cursor-pointer border border-transparent hover:border-pink-400 group"
        onClick={handleSongClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative mb-4">
          <img
            src={song.coverUrl || "/placeholder.svg"}
            alt={`${song.title} cover`}
            className="w-full aspect-square rounded-md relative z-0 transition-transform duration-300 group-hover:scale-105"
          />

          {/* Play button overlay */}
          {isHovering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md z-10">
              <div className="flex gap-2">
                {/* Add to playlist button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddToPlaylist()
                  }}
                  className="bg-blue-500 rounded-full p-3 shadow-lg hover:bg-blue-600 transition-colors"
                  title="Add to playlist"
                >
                  <Plus size={24} className="text-white" />
                </button>

                {/* View song details button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/song/${song.spotifyTrackId}`)
                  }}
                  className="bg-[#74686e] rounded-full p-3 shadow-lg hover:bg-[#5f575c] transition-colors"
                  title="View song details"
                >
                  <ExternalLink size={24} className="text-white" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="group-hover:translate-y-[-2px] transition-transform duration-300">
          <h3
            className={`font-medium truncate ${isHovering ? "text-pink-400" : "text-white"} transition-colors duration-200`}
          >
            {song.title}
          </h3>
          <p className="text-sm text-white/80 truncate">{song.artist}</p>
        </div>
      </div>
    </div>
  )
}

