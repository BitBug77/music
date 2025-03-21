"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Music2, Play } from "lucide-react"
import Sidebar from "../../../components/ui/sidebar"
import Navbar from "../../../components/ui/navbar"
import { useRouter } from "next/navigation"

// Define interfaces for type safety
interface Song {
  id: number
  spotify_id: string
  name: string
  artist: string
  album: string
  album_cover: string
}

interface Playlist {
  id: number
  title: string
  created_at: string
  songs?: Song[]
}

export default function PlaylistPage({ params }: { params: { id: string } }) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const playlistId = Number.parseInt(params.id)

  useEffect(() => {
    if (!isNaN(playlistId)) {
      fetchPlaylist(playlistId)
    } else {
      setError("Invalid playlist ID")
      setIsLoading(false)
    }
  }, [playlistId])

  const fetchPlaylist = async (id: number) => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("access_token") || ""

      // First fetch the playlist details
      const playlistResponse = await fetch(`http://127.0.0.1:8000/playlists/${id}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!playlistResponse.ok) {
        if (playlistResponse.status === 401) {
          throw new Error("Unauthorized. Please login again.")
        } else if (playlistResponse.status === 404) {
          throw new Error("Playlist not found.")
        } else {
          throw new Error(`API error: ${playlistResponse.status}`)
        }
      }

      const playlistData = await playlistResponse.json()

      // Then fetch the songs for this playlist
      const songsResponse = await fetch(`http://127.0.0.1:8000/playlists/${id}/songs/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!songsResponse.ok) {
        throw new Error(`Failed to fetch songs: ${songsResponse.status}`)
      }

      const songsData = await songsResponse.json()

      if (playlistData.status === "success" && songsData.status === "success") {
        setPlaylist({
          ...playlistData.playlist,
          songs: songsData.songs || [],
        })
      } else {
        throw new Error("Unexpected response format")
      }

      setError(null)
    } catch (error) {
      console.error(`Error fetching playlist ${id}:`, error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Modify the navigateToSong function to pass playlist context
  const navigateToSong = (spotifyId: string, index = 0) => {
    // Store playlist info in localStorage to maintain context between pages
    if (playlist) {
      localStorage.setItem(
        "currentPlaylist",
        JSON.stringify({
          id: playlist.id,
          title: playlist.title,
          songs: playlist.songs,
          currentIndex: index,
        }),
      )
    }
    router.push(`/song/${spotifyId}`)
  }

  const addSongToPlaylist = async (spotifyId: string) => {
    if (!playlist) return

    try {
      const token = localStorage.getItem("access_token") || ""

      const response = await fetch(`http://127.0.0.1:8000/playlists/${playlist.id}/songs/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spotify_track_id: spotifyId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to add song: ${response.status}`)
      }

      const data = await response.json()
      if (data.status === "success") {
        // Show a success message
        alert("Song added to playlist successfully!")

        // Refresh the playlist
        fetchPlaylist(playlist.id)
      }
    } catch (error) {
      console.error("Error adding song:", error)
      alert(error instanceof Error ? error.message : "Failed to add song")
    }
  }

  const removeSongFromPlaylist = async (songId: number) => {
    if (!playlist) return

    try {
      const token = localStorage.getItem("access_token") || ""

      const response = await fetch(`http://127.0.0.1:8000/playlists/${playlist.id}/songs/${songId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to remove song: ${response.status}`)
      }

      // Refresh the playlist
      fetchPlaylist(playlist.id)
    } catch (error) {
      console.error("Error removing song:", error)
      alert(error instanceof Error ? error.message : "Failed to remove song")
    }
  }

  return (
    <div className="min-h-screen bg-[#151b27] text-white flex">
      {/* Sidebar */}
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <header className="flex items-center p-4">
            <Link href="/saved" passHref>
              <button className="p-2">
                <ArrowLeft size={24} />
              </button>
            </Link>
            <h1 className="text-2xl font-bold ml-2">{isLoading ? "Loading..." : playlist?.title || "Playlist"}</h1>
          </header>

          {/* Content */}
          <div className="px-4 pb-8">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading playlist...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col justify-center items-center h-64">
                <p className="text-red-400 mb-2">Error: {error}</p>
                <p className="text-gray-400">Try refreshing the page</p>
              </div>
            ) : !playlist ? (
              <div className="flex flex-col justify-center items-center h-64">
                <p>Playlist not found</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Playlist header */}
                <div className="mb-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-800 rounded-lg p-4 w-40 h-40 flex items-center justify-center">
                      {playlist.songs && playlist.songs.length > 0 && playlist.songs[0].album_cover ? (
                        <img
                          src={playlist.songs[0].album_cover || "/placeholder.svg"}
                          alt={playlist.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Music2 size={64} className="text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold">{playlist.title}</h1>
                      <p className="text-gray-400 mt-1">{playlist.songs?.length || 0} songs</p>
                      <button
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full flex items-center gap-2"
                        onClick={() => {
                          if (playlist.songs && playlist.songs.length > 0) {
                            navigateToSong(playlist.songs[0].spotify_id, 0)
                          }
                        }}
                        disabled={!playlist.songs || playlist.songs.length === 0}
                      >
                        <Play size={18} />
                        Play
                      </button>
                    </div>
                  </div>
                </div>

                {/* Songs list */}
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4">Songs</h2>

                  {!playlist.songs || playlist.songs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 bg-gray-800/30 rounded-lg">
                      <Music2 size={48} className="text-gray-500 mb-4" />
                      <p>No songs in this playlist</p>
                      <Link href="/for-you" className="mt-4 text-blue-400 hover:text-blue-300">
                        Add songs from For You page
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {playlist.songs.map((song) => (
                        <div
                          key={song.id}
                          className="flex items-center p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors"
                          onClick={() =>
                            navigateToSong(
                              song.spotify_id,
                              playlist.songs ? playlist.songs.findIndex((s) => s.id === song.id) : 0,
                            )
                          }
                        >
                          <div className="w-12 h-12 mr-4">
                            {song.album_cover ? (
                              <img
                                src={song.album_cover || "/placeholder.svg"}
                                alt={song.album}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-700 flex items-center justify-center rounded">
                                <Music2 size={20} className="text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{song.name}</h3>
                            <p className="text-sm text-gray-400">{song.artist}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeSongFromPlaylist(song.id)
                            }}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Remove from playlist"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

