"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Music, Play, Clock, Heart, TrendingUp, Plus, ExternalLink } from "lucide-react"
import Sidebar from "../../components/ui/sidebar"
import Navbar from "../../components/ui/navbar"
import { getAuthHeader, withTokenRefresh } from "../../lib/jwt-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddToPlaylistModal, CreatePlaylistModal, PlaylistModalStyles } from "../../components/ui/playlist-modals"

// Define TypeScript interfaces
interface Song {
  id?: number
  track_id: string
  name: string
  title?: string
  artist: string
  album: string
  album_cover?: string
  coverUrl?: string
  duration: number
  popularity: number
  spotifyUrl?: string
  spotifyTrackId?: string
}

// Define the ProcessedSong interface to match what AddToPlaylistModal expects
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
  song: Song
  onAddToPlaylist: () => void
  onPreview: (trackId: string | null) => void
}

interface Artist {
  id: string
  name: string
  image?: string
  genres: string[]
  popularity: number
}

interface Playlist {
  id: string | number
  name?: string
  title?: string
  description?: string
  cover_image?: string
  owner?: string
  song_count?: number
  created_at?: string
}

// Define the PlaylistForModal interface to match what AddToPlaylistModal expects
interface PlaylistForModal {
  id: number
  title: string
  created_at: string
}

interface RecommendationData {
  songs: Song[]
  artists: Artist[]
  playlists: Playlist[]
  recently_played: Song[]
}

export default function ForYouPage() {
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("songs")

  // Add these state variables
  const [forYouRecommendations, setForYouRecommendations] = useState<Song[]>([])
  const [isLoadingForYou, setIsLoadingForYou] = useState<boolean>(true)
  const [forYouError, setForYouError] = useState<string | null>(null)

  const [similarSongs, setSimilarSongs] = useState<Song[]>([])
  const [isLoadingSimilar, setIsLoadingSimilar] = useState<boolean>(true)
  const [similarError, setSimilarError] = useState<string | null>(null)

  const [friendRecommendations, setFriendRecommendations] = useState<Song[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState<boolean>(true)
  const [friendsError, setFriendsError] = useState<string | null>(null)

  // For playlist functionality
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null)
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState<boolean>(false)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [previewingSong, setPreviewingSong] = useState<string | null>(null)
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<number | null>(null)
  const [addedToPlaylistId, setAddedToPlaylistId] = useState<number | null>(null)
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState<boolean>(false)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState<boolean>(false)

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Fetch personalized recommendations
  const fetchRecommendations = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      await withTokenRefresh(async () => {
        const response = await fetch("http://127.0.0.1:8000/recommendations/", {
          method: "GET",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch recommendations: ${response.status}`)
        }

        const data = await response.json()
        console.log("Main recommendations data:", data) // Debug log
        setRecommendations(data)
      })
    } catch (error) {
      console.error("Error fetching recommendations:", error)
      setError("Failed to load personalized recommendations. Please try again later.")

      // Set fallback data when API fails
      setRecommendations({
        songs: [
          {
            id: 1,
            track_id: "fallback1",
            name: "Fallback Song 1",
            artist: "Fallback Artist 1",
            album: "Fallback Album 1",
            duration: 180,
            popularity: 75,
          },
          {
            id: 2,
            track_id: "fallback2",
            name: "Fallback Song 2",
            artist: "Fallback Artist 2",
            album: "Fallback Album 2",
            duration: 210,
            popularity: 80,
          },
        ],
        artists: [
          {
            id: "fallback1",
            name: "Fallback Artist 1",
            genres: ["Pop", "Rock"],
            popularity: 85,
          },
          {
            id: "fallback2",
            name: "Fallback Artist 2",
            genres: ["Hip Hop", "R&B"],
            popularity: 90,
          },
        ],
        playlists: [
          {
            id: 1,
            name: "Fallback Playlist 1",
            description: "A fallback playlist",
            owner: "System",
            song_count: 10,
          },
          {
            id: 2,
            name: "Fallback Playlist 2",
            description: "Another fallback playlist",
            owner: "System",
            song_count: 15,
          },
        ],
        recently_played: [
          {
            id: 1,
            track_id: "recent1",
            name: "Recent Song 1",
            artist: "Recent Artist 1",
            album: "Recent Album 1",
            duration: 195,
            popularity: 70,
          },
          {
            id: 2,
            track_id: "recent2",
            name: "Recent Song 2",
            artist: "Recent Artist 2",
            album: "Recent Album 2",
            duration: 225,
            popularity: 65,
          },
        ],
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Add these fetch functions
  const fetchForYouRecommendations = async (): Promise<void> => {
    try {
      setIsLoadingForYou(true)
      await withTokenRefresh(async () => {
        const response = await fetch("http://127.0.0.1:8000/recommendations/for-you/", {
          method: "GET",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          console.error(`API Error: ${response.status} - ${response.statusText}`)
          throw new Error("Failed to fetch 'For You' recommendations")
        }

        const data = await response.json()
        console.log("For You recommendations data:", data)
        setForYouRecommendations(data.songs || [])
      })
    } catch (err) {
      setForYouError(err instanceof Error ? err.message : "An unknown error occurred")
      console.error("Error fetching 'For You' recommendations:", err)
      // Set fallback data
      setForYouRecommendations([
        {
          id: 1,
          track_id: "mock1",
          name: "Mock Song 1",
          artist: "Mock Artist 1",
          album: "Mock Album 1",
          duration: 180,
          popularity: 75,
          spotifyTrackId: "mock1",
          coverUrl: "/placeholder.svg?height=40&width=40",
        },
        {
          id: 2,
          track_id: "mock2",
          name: "Mock Song 2",
          artist: "Mock Artist 2",
          album: "Mock Album 2",
          duration: 210,
          popularity: 80,
          spotifyTrackId: "mock2",
          coverUrl: "/placeholder.svg?height=40&width=40",
        },
      ])
    } finally {
      setIsLoadingForYou(false)
    }
  }

  const fetchSimilarSongs = async (): Promise<void> => {
    try {
      setIsLoadingSimilar(true)
      await withTokenRefresh(async () => {
        const response = await fetch("http://127.0.0.1:8000/recommendations/similar/", {
          method: "GET",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          console.error(`API Error: ${response.status} - ${response.statusText}`)
          throw new Error("Failed to fetch similar songs")
        }

        const data = await response.json()
        console.log("Similar songs data:", data) // Debug log
        setSimilarSongs(data.songs || [])
      })
    } catch (err) {
      setSimilarError(err instanceof Error ? err.message : "An unknown error occurred")
      console.error("Error fetching similar songs:", err)
      // Set fallback data
      setSimilarSongs([
        {
          id: 1,
          track_id: "similar1",
          name: "Similar Song 1",
          artist: "Similar Artist 1",
          album: "Similar Album 1",
          duration: 195,
          popularity: 72,
          spotifyTrackId: "similar1",
          coverUrl: "/placeholder.svg?height=40&width=40",
        },
        {
          id: 2,
          track_id: "similar2",
          name: "Similar Song 2",
          artist: "Similar Artist 2",
          album: "Similar Album 2",
          duration: 225,
          popularity: 68,
          spotifyTrackId: "similar2",
          coverUrl: "/placeholder.svg?height=40&width=40",
        },
      ])
    } finally {
      setIsLoadingSimilar(false)
    }
  }

  const fetchFriendRecommendations = async (): Promise<void> => {
    try {
      setIsLoadingFriends(true)
      await withTokenRefresh(async () => {
        const response = await fetch("http://127.0.0.1:8000/recommendations/friends/", {
          method: "GET",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          console.error(`API Error: ${response.status} - ${response.statusText}`)
          throw new Error("Failed to fetch friend recommendations")
        }

        const data = await response.json()
        console.log("Friend recommendations:", data)
        setFriendRecommendations(data.songs || [])
      })
    } catch (err) {
      setFriendsError(err instanceof Error ? err.message : "An unknown error occurred")
      console.error("Error fetching friend recommendations:", err)
      // Set fallback data
      setFriendRecommendations([
        {
          id: 1,
          track_id: "friend1",
          name: "Friend Song 1",
          artist: "Friend Artist 1",
          album: "Friend Album 1",
          duration: 210,
          popularity: 65,
          spotifyTrackId: "friend1",
          coverUrl: "/placeholder.svg?height=40&width=40",
        },
        {
          id: 2,
          track_id: "friend2",
          name: "Friend Song 2",
          artist: "Friend Artist 2",
          album: "Friend Album 2",
          duration: 180,
          popularity: 70,
          spotifyTrackId: "friend2",
          coverUrl: "/placeholder.svg?height=40&width=40",
        },
      ])
    } finally {
      setIsLoadingFriends(false)
    }
  }

  const fetchPlaylists = async (): Promise<void> => {
    try {
      await withTokenRefresh(async () => {
        const response = await fetch("http://127.0.0.1:8000/playlists/", {
          method: "GET",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch playlists: ${response.status}`)
        }

        const data = await response.json()
        console.log("Playlists data:", data) // Debug log
        if (data.status === "success" && Array.isArray(data.playlists)) {
          setPlaylists(data.playlists)
        } else {
          // Set fallback data if response format is unexpected
          setPlaylists([
            {
              id: 1,
              name: "My Favorites",
              description: "My favorite songs",
              owner: "Me",
              song_count: 12,
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              name: "Workout Mix",
              description: "Songs for working out",
              owner: "Me",
              song_count: 8,
              created_at: new Date().toISOString(),
            },
          ])
        }
      })
    } catch (error) {
      console.error("Error fetching playlists:", error)
      // Set fallback data on error
      setPlaylists([
        {
          id: 1,
          name: "My Favorites",
          description: "My favorite songs",
          owner: "Me",
          song_count: 12,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Workout Mix",
          description: "Songs for working out",
          owner: "Me",
          song_count: 8,
          created_at: new Date().toISOString(),
        },
      ])
    }
  }

  // Handle song play
  const handlePlaySong = async (trackId: string): Promise<void> => {
    try {
      await fetch("http://127.0.0.1:8000/log-interaction/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          track_id: trackId,
          interaction_type: "play",
          timestamp: new Date().toISOString(),
        }),
      })

      // Navigate to song page or trigger play functionality
      router.push(`/song/${trackId}`)
    } catch (error) {
      console.error("Error logging play interaction:", error)
    }
  }

  // Handle like/favorite
  const handleLikeSong = async (trackId: string): Promise<void> => {
    try {
      await fetch("http://127.0.0.1:8000/like-song/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          track_id: trackId,
        }),
      })

      // Refresh recommendations to reflect the like
      fetchRecommendations()
    } catch (error) {
      console.error("Error liking song:", error)
    }
  }

  const openAddToPlaylistModal = (song: Song): void => {
    setAddingToPlaylistId(null)
    setAddedToPlaylistId(null)
    setCurrentSong(song)
    setIsPlaylistModalOpen(true)
  }

  const closePlaylistModal = (): void => {
    setIsPlaylistModalOpen(false)
    setTimeout(() => {
      setAddingToPlaylistId(null)
      setAddedToPlaylistId(null)
    }, 300)
  }

  const openCreatePlaylistModal = (): void => {
    setIsCreatePlaylistModalOpen(true)
  }

  const closeCreatePlaylistModal = (): void => {
    setIsCreatePlaylistModalOpen(false)
  }

  const addSongToPlaylist = async (playlistId: number, spotifyTrackId: string): Promise<boolean> => {
    try {
      setAddingToPlaylistId(playlistId)
      setAddedToPlaylistId(null)

      await withTokenRefresh(async () => {
        const response = await fetch(`http://127.0.0.1:8000/playlists/${playlistId}/songs/`, {
          method: "POST",
          headers: {
            ...getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ spotify_track_id: spotifyTrackId }),
        })

        if (!response.ok) {
          throw new Error(`Failed to add song: ${response.status}`)
        }

        const data = await response.json()
        if (data.status === "success") {
          setAddingToPlaylistId(null)
          setAddedToPlaylistId(playlistId)

          setTimeout(() => {
            setIsPlaylistModalOpen(false)
            setTimeout(() => {
              setAddedToPlaylistId(null)
            }, 300)
          }, 1500)
          return true
        } else {
          throw new Error("Failed to add song to playlist")
        }
      })
      return true
    } catch (error) {
      console.error("Error adding song:", error)
      setAddingToPlaylistId(null)
      return false
    }
  }

  const createNewPlaylist = async (title: string): Promise<void> => {
    if (!title.trim()) return

    try {
      setIsCreatingPlaylist(true)
      await withTokenRefresh(async () => {
        const response = await fetch("http://127.0.0.1:8000/playlists/", {
          method: "POST",
          headers: {
            ...getAuthHeader(),
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
          await fetchPlaylists()
          setIsCreatePlaylistModalOpen(false)
          if (currentSong && data.playlist && data.playlist.id) {
            setSelectedPlaylist(
              typeof data.playlist.id === "string" ? Number.parseInt(data.playlist.id, 10) : data.playlist.id,
            )
          }
        }
      })
    } catch (error) {
      console.error("Error creating playlist:", error)
      alert(error instanceof Error ? error.message : "Failed to create playlist")
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  const handlePreview = (trackId: string | null): void => {
    setPreviewingSong(trackId)
  }

  useEffect(() => {
    fetchRecommendations()
    fetchForYouRecommendations()
    fetchSimilarSongs()
    fetchFriendRecommendations()
    fetchPlaylists()
  }, [])

  // Convert a Song to a ProcessedSong for the AddToPlaylistModal
  const convertToProcessedSong = (song: Song): ProcessedSong => {
    return {
      id: song.id || 0,
      title: song.title || song.name,
      artist: song.artist,
      popularity: song.popularity || 0,
      spotifyUrl: song.spotifyUrl || `https://open.spotify.com/track/${song.spotifyTrackId || song.track_id}`,
      spotifyTrackId: song.spotifyTrackId || song.track_id,
      coverUrl: song.coverUrl || song.album_cover || "/placeholder.svg",
    }
  }

  // Convert a Playlist to a PlaylistForModal for the AddToPlaylistModal
  const convertToPlaylistForModal = (playlist: Playlist): PlaylistForModal => {
    return {
      id: typeof playlist.id === "string" ? Number.parseInt(playlist.id, 10) || 0 : Number(playlist.id),
      title: playlist.title || playlist.name || "Untitled Playlist",
      created_at: playlist.created_at || new Date().toISOString(),
    }
  }

  const renderSongSection = (
    title: string,
    icon: React.ReactNode,
    songs: Song[],
    isLoading: boolean,
    error: string | null,
    emptyMessage: string,
  ): React.ReactNode => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-700 rounded-md p-4 animate-pulse">
              <div className="w-full aspect-square rounded-md bg-gray-600 mb-4"></div>
              <div className="h-5 bg-gray-600 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-600 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-pink-100 p-4 rounded-md">
          <p className="text-pink-600">Error: {error}</p>
          <p className="text-blue-600 mt-2">Showing mock data as fallback</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : songs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {songs.map((song) => (
            <SongCard
              key={song.id || song.track_id}
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

  return (
    <div className="flex h-screen bg-gray-800 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-blue-900 dark:text-white">For You</h1>
              <button
                onClick={() => {
                  fetchRecommendations()
                  fetchForYouRecommendations()
                  fetchSimilarSongs()
                  fetchFriendRecommendations()
                  fetchPlaylists()
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Refresh
              </button>
            </div>
            <p className="text-gray-400 dark:text-gray-400 mb-8">
              Personalized recommendations based on your listening history and preferences.
            </p>

            <Tabs defaultValue="recommendations" className="mb-8" onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="songs">Songs</TabsTrigger>
                <TabsTrigger value="artists">Artists</TabsTrigger>
                <TabsTrigger value="playlists">Playlists</TabsTrigger>
                <TabsTrigger value="recent">Recently Played</TabsTrigger>
              </TabsList>

              <TabsContent value="recommendations" className="space-y-8">
                {/* For You Section */}
                {renderSongSection(
                  "For You",
                  <TrendingUp size={20} className="mr-2" />,
                  forYouRecommendations,
                  isLoadingForYou,
                  forYouError,
                  "We're still learning your music taste. Like some songs to get personalized recommendations!",
                )}

                {/* Similar to What You Like Section */}
                {renderSongSection(
                  "You Might Also Enjoy",
                  <Clock size={20} className="mr-2" />,
                  similarSongs,
                  isLoadingSimilar,
                  similarError,
                  "Like some songs to get similar recommendations!",
                )}

                {/* Friends' Recommendations Section */}
                {renderSongSection(
                  "From Friends with Similar Taste",
                  <Clock size={20} className="mr-2" />,
                  friendRecommendations,
                  isLoadingFriends,
                  friendsError,
                  "Connect with friends to see what they're listening to!",
                )}
              </TabsContent>

              <TabsContent value="songs" className="space-y-4">
                {/* Original songs tab content */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  {isLoading ? (
                    <div className="p-6 space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <div className="h-10 w-10 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                          </div>
                          <div className="h-8 w-20 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : recommendations?.songs && recommendations.songs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm">#</th>
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm">Title</th>
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm">Artist</th>
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm">Album</th>
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm">
                              <Clock className="h-4 w-4" />
                            </th>
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {recommendations.songs.map((song, index) => (
                            <tr
                              key={song.track_id}
                              className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                            >
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{index + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0 mr-3">
                                    {song.album_cover ? (
                                      <Image
                                        src={song.album_cover || "/placeholder.svg"}
                                        alt={song.album}
                                        width={40}
                                        height={40}
                                        className="rounded object-cover"
                                      />
                                    ) : (
                                      <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                        <Music className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">{song.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{song.artist}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{song.album}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {formatDuration(song.duration)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <Button variant="ghost" size="icon" onClick={() => handlePlaySong(song.track_id)}>
                                    <Play className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleLikeSong(song.track_id)}>
                                    <Heart className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openAddToPlaylistModal(song)}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6">
                      <p className="text-gray-600 dark:text-gray-400">No songs available. Try refreshing the page.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="artists" className="space-y-4">
                {/* Original artists tab content */}
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="aspect-square bg-gray-300 dark:bg-gray-700 rounded-lg mb-2"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recommendations?.artists && recommendations.artists.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {recommendations.artists.map((artist) => (
                      <Link href={`/artist/${artist.id}`} key={artist.id}>
                        <Card className="overflow-hidden transition-all hover:shadow-md">
                          <div className="aspect-square relative">
                            {artist.image ? (
                              <Image
                                src={artist.image || "/placeholder.svg"}
                                alt={artist.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <Music className="h-12 w-12 text-gray-500 dark:text-gray-400" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">{artist.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {artist.genres.slice(0, 2).join(", ")}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <p className="text-gray-600 dark:text-gray-400">No artists available. Try refreshing the page.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="playlists" className="space-y-4">
                {/* Original playlists tab content */}
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="aspect-square bg-gray-300 dark:bg-gray-700 rounded-lg mb-2"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full mb-1"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recommendations?.playlists && recommendations.playlists.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {recommendations.playlists.map((playlist) => (
                      <Link href={`/playlist/${playlist.id}`} key={playlist.id}>
                        <Card className="overflow-hidden transition-all hover:shadow-md">
                          <div className="aspect-square relative">
                            {playlist.cover_image ? (
                              <Image
                                src={playlist.cover_image || "/placeholder.svg"}
                                alt={playlist.name || "Playlist"}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <Music className="h-12 w-12 text-gray-500 dark:text-gray-400" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {playlist.name || playlist.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {playlist.description || "No description"}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>{playlist.song_count || 0} songs</span>
                              <span className="mx-1">•</span>
                              <span>By {playlist.owner || "Unknown"}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <p className="text-gray-600 dark:text-gray-400">No playlists available. Try refreshing the page.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recent" className="space-y-4">
                {/* Original recently played tab content */}
                {isLoading ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 animate-pulse">
                        <div className="h-10 w-10 bg-gray-300 dark:bg-gray-700 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                        <div className="h-8 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : recommendations?.recently_played && recommendations.recently_played.length > 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm">#</th>
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm">Title</th>
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm">Artist</th>
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm">Album</th>
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm">
                              <Clock className="h-4 w-4" />
                            </th>
                            <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-sm"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {recommendations.recently_played.map((song, index) => (
                            <tr
                              key={song.track_id}
                              className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                            >
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{index + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0 mr-3">
                                    {song.album_cover ? (
                                      <Image
                                        src={song.album_cover || "/placeholder.svg"}
                                        alt={song.album}
                                        width={40}
                                        height={40}
                                        className="rounded object-cover"
                                      />
                                    ) : (
                                      <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                        <Music className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">{song.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{song.artist}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{song.album}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {formatDuration(song.duration)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <Button variant="ghost" size="icon" onClick={() => handlePlaySong(song.track_id)}>
                                    <Play className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleLikeSong(song.track_id)}>
                                    <Heart className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openAddToPlaylistModal(song)}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <p className="text-gray-600 dark:text-gray-400">No recently played songs. Start listening!</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Playlist Modals */}
      <AddToPlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={closePlaylistModal}
        song={currentSong ? convertToProcessedSong(currentSong) : null}
        playlists={playlists.map((playlist) => convertToPlaylistForModal(playlist))}
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

// Add the SongCard component at the end of the file
function SongCard({ song, onAddToPlaylist, onPreview }: SongCardProps) {
  const router = useRouter()
  const [isHovering, setIsHovering] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleSongClick = () => {
    router.push(`/song/${song.spotifyTrackId || song.track_id}`)
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
    }
  }

  const handlePlayPreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
      return
    }

    try {
      if (!audioRef.current) {
        const trackId = song.spotifyTrackId || song.track_id
        const previewUrl = `https://p.scdn.co/mp3-preview/${trackId}`
        const audio = new Audio(previewUrl)
        audio.volume = 0.7

        audio.onended = () => {
          setIsPlaying(false)
        }

        audio.onerror = () => {
          console.error("Preview not available")
          setIsPlaying(false)
          window.open(`https://open.spotify.com/track/${trackId}`, "_blank")
        }

        audioRef.current = audio
      }

      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
          })
          .catch((error) => {
            console.error("Playback prevented:", error)
            window.open(`https://open.spotify.com/track/${song.spotifyTrackId || song.track_id}`, "_blank")
          })
      }
    } catch (error) {
      console.error("Error playing preview:", error)
      window.open(`https://open.spotify.com/track/${song.spotifyTrackId || song.track_id}`, "_blank")
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
            src={song.coverUrl || song.album_cover || "/placeholder.svg?height=200&width=200"}
            alt={`${song.title || song.name} cover`}
            className="w-full aspect-square rounded-md relative z-0 transition-transform duration-300 group-hover:scale-105"
          />

          {isHovering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md z-10">
              <div className="flex gap-2">
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

                <button
                  onClick={handlePlayPreview}
                  className="bg-pink-500 rounded-full p-3 shadow-lg hover:bg-pink-600 transition-colors"
                  title={isPlaying ? "Stop preview" : "Play preview"}
                >
                  <Play size={24} className="text-white" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/song/${song.spotifyTrackId || song.track_id}`)
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
            {song.title || song.name}
          </h3>
          <p className="text-sm text-white/80 truncate">{song.artist}</p>
        </div>
      </div>
    </div>
  )
}

