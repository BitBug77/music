"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Music2 } from "lucide-react"
import Sidebar from "../../components/ui/sidebar"
import Navbar from "../../components/ui/navbar"

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
}

export default function SavedPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false)
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("")

  useEffect(() => {
    fetchPlaylists()
  }, [])

  // Fetch songs when a playlist is selected
  useEffect(() => {
    if (selectedPlaylist !== null) {
      fetchPlaylistSongs(selectedPlaylist)
    }
  }, [selectedPlaylist])

  const fetchPlaylists = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("access_token") || ""
      const response = await fetch("http://127.0.0.1:8000/playlists/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized. Please login again.")
        } else {
          throw new Error(`Failed to fetch playlists: ${response.status}`)
        }
      }

      const data = await response.json()
      console.log("Playlists response:", data)

      // Based on your backend code, the playlists are in data.playlists
      if (data.status === "success" && Array.isArray(data.playlists)) {
        setPlaylists(data.playlists)
        // Select the first playlist automatically if available
        if (data.playlists.length > 0) {
          setSelectedPlaylist(data.playlists[0].id)
        }
      } else {
        throw new Error("Unexpected response format")
      }

      setError(null)
    } catch (error) {
      console.error("Error fetching playlists:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPlaylistSongs = async (playlistId: number) => {
    try {
      setIsLoading(true)

      const token = localStorage.getItem("access_token") || ""

      const response = await fetch(`http://127.0.0.1:8000/playlists/${playlistId}/songs/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized. Please login again.")
        } else if (response.status === 404) {
          throw new Error("Playlist not found.")
        } else {
          throw new Error(`API error: ${response.status}`)
        }
      }

      const data = await response.json()
      console.log("Playlist songs:", data)

      if (data.status === "success") {
        setPlaylistSongs(data.songs || [])
      } else {
        throw new Error("Unexpected response format")
      }

      setError(null)
    } catch (error) {
      console.error("Error fetching playlist songs:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      setPlaylistSongs([])
    } finally {
      setIsLoading(false)
    }
  }

  const createNewPlaylist = async () => {
    if (!newPlaylistTitle.trim()) return

    try {
      const token = localStorage.getItem("access_token") || ""

      const response = await fetch("http://127.0.0.1:8000/playlists/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: newPlaylistTitle }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create playlist: ${response.status}`)
      }

      const data = await response.json()
      console.log("New playlist:", data)

      if (data.status === "success") {
        // Refresh playlists
        fetchPlaylists()
        // Reset form
        setNewPlaylistTitle("")
        setIsCreatePlaylistModalOpen(false)
      }
    } catch (error) {
      console.error("Error creating playlist:", error)
      alert(error instanceof Error ? error.message : "Failed to create playlist")
    }
  }

  const addSongToPlaylist = async () => {
    if (selectedPlaylist === null) return

    try {
      // Navigate to the "For You" page
      window.location.href = "/for-you"
    } catch (error) {
      console.error("Error adding song:", error)
      alert(error instanceof Error ? error.message : "Failed to add song")
    }
  }

  const getSelectedPlaylistTitle = () => {
    if (selectedPlaylist === null) return ""
    const playlist = playlists.find((p) => p.id === selectedPlaylist)
    return playlist ? playlist.title : ""
  }

  const addSongToCurrentPlaylist = async (spotifyId: string) => {
    if (selectedPlaylist === null) {
      alert("Please select a playlist first")
      return
    }

    try {
      const token = localStorage.getItem("access_token") || ""

      const response = await fetch(`http://127.0.0.1:8000/playlists/${selectedPlaylist}/songs/`, {
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

        // Refresh the songs list
        fetchPlaylistSongs(selectedPlaylist)

        // Navigate to the "For You" page
        window.location.href = "/for-you"
      }
    } catch (error) {
      console.error("Error adding song:", error)
      alert(error instanceof Error ? error.message : "Failed to add song")
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
          <header className="flex justify-between items-center p-4">
            <Link href="/library" passHref>
              <button className="p-2">
                <ArrowLeft size={24} />
              </button>
            </Link>
            <h1 className="text-2xl font-bold">My Playlists</h1>
            <button className="p-2" onClick={() => setIsCreatePlaylistModalOpen(true)}>
              <Plus size={24} />
            </button>
          </header>

          {/* Content */}
          <div className="px-4 pb-8">
            {isLoading && playlists.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading playlists...</p>
              </div>
            ) : error && playlists.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64">
                <p className="text-red-400 mb-2">Error: {error}</p>
                <p className="text-gray-400">Try refreshing the page</p>
              </div>
            ) : playlists.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64">
                <Music2 size={48} className="text-gray-500 mb-4" />
                <p>No playlists found</p>
                <p className="text-gray-400 text-sm mt-2">Create your first playlist with the + button</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Playlist selector */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <select
                      className="bg-gray-800 text-white p-2 rounded-md w-48"
                      value={selectedPlaylist || ""}
                      onChange={(e) => setSelectedPlaylist(Number(e.target.value))}
                    >
                      {playlists.map((playlist) => (
                        <option key={playlist.id} value={playlist.id}>
                          {playlist.title}
                        </option>
                      ))}
                    </select>
                    <button
                      className="p-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      onClick={addSongToPlaylist}
                    >
                      Add Song
                    </button>
                  </div>
                  <h2 className="text-xl font-medium mt-4">{getSelectedPlaylistTitle()}</h2>
                </div>

                {/* Songs list */}
                {isLoading && selectedPlaylist !== null ? (
                  <div className="flex justify-center items-center h-40">
                    <p>Loading songs...</p>
                  </div>
                ) : playlistSongs.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-40">
                    <Music2 size={36} className="text-gray-500 mb-3" />
                    <p>No songs in this playlist</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {playlistSongs.map((song) => (
                      <div key={song.id} className="bg-gray-800 rounded-md overflow-hidden relative group">
                        <Link href={`/song/${song.id}`} passHref>
                          <div className="cursor-pointer hover:bg-gray-700 transition-colors">
                            <div className="aspect-square relative overflow-hidden">
                              {song.album_cover ? (
                                <img
                                  src={song.album_cover || "/placeholder.svg"}
                                  alt={song.album}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                  <Music2 size={32} className="text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="font-medium truncate">{song.name}</p>
                              <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                            </div>
                          </div>
                        </Link>

                        {/* Add to Playlist button that appears on hover */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addSongToCurrentPlaylist(song.spotify_id)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg"
                            title="Add to playlist"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Playlist Modal */}
      {isCreatePlaylistModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create New Playlist</h3>
            <input
              type="text"
              value={newPlaylistTitle}
              onChange={(e) => setNewPlaylistTitle(e.target.value)}
              placeholder="Playlist name"
              className="w-full p-3 bg-gray-700 rounded-md text-white mb-4"
              autoFocus
            />
            <div className="flex flex-col gap-4">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsCreatePlaylistModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewPlaylist}
                  className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
              </div>

              <div className="border-t border-gray-700 pt-4 mt-2">
                <button
                  onClick={() => {
                    if (newPlaylistTitle.trim()) {
                      createNewPlaylist().then(() => {
                        window.location.href = "/for-you"
                      })
                    } else {
                      window.location.href = "/for-you"
                    }
                  }}
                  className="w-full py-3 bg-green-600 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Song to Playlist & Go to For You
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

