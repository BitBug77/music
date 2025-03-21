"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Music2 } from "lucide-react"
import Sidebar from "../../components/ui/sidebar"
import Navbar from "../../components/ui/navbar"
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
  isLoading?: boolean
  error?: string | null
}

export default function SavedPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false)
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("")
  const router = useRouter()

  // Fetch playlists on component mount
  useEffect(() => {
    async function fetchData() {
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
          throw new Error(`Failed to fetch playlists: ${response.status}`)
        }

        const data = await response.json()
        console.log("Playlists response:", data)

        if (data.status === "success" && Array.isArray(data.playlists)) {
          // Get all playlists
          const fetchedPlaylists = data.playlists.map((playlist: Playlist) => ({
            ...playlist,
            songs: [],
          }))

          setPlaylists(fetchedPlaylists)

          // Now fetch songs for each playlist
          for (const playlist of fetchedPlaylists) {
            try {
              const songsResponse = await fetch(`http://127.0.0.1:8000/playlists/${playlist.id}/songs/`, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              })

              if (songsResponse.ok) {
                const songsData = await songsResponse.json()
                console.log(`Songs for playlist ${playlist.id}:`, songsData)

                if (songsData.status === "success" && Array.isArray(songsData.songs)) {
                  // Update this specific playlist with its songs
                  setPlaylists((prevPlaylists) =>
                    prevPlaylists.map((p) => (p.id === playlist.id ? { ...p, songs: songsData.songs } : p)),
                  )
                }
              }
            } catch (err) {
              console.error(`Error fetching songs for playlist ${playlist.id}:`, err)
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

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
        // Refresh the page to show the new playlist
        window.location.reload()
      }
    } catch (error) {
      console.error("Error creating playlist:", error)
      alert(error instanceof Error ? error.message : "Failed to create playlist")
    }
  }

  const addSongToCurrentPlaylist = async (playlistId: number, spotifyId: string) => {
    try {
      const token = localStorage.getItem("access_token") || ""

      const response = await fetch(`http://127.0.0.1:8000/playlists/${playlistId}/songs/`, {
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
        alert("Song added to playlist successfully!")
        // Refresh the page to show the updated playlist
        window.location.reload()
      }
    } catch (error) {
      console.error("Error adding song:", error)
      alert(error instanceof Error ? error.message : "Failed to add song")
    }
  }

  const navigateToSong = (spotifyId: string) => {
    router.push(`/song/${spotifyId}`)
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
            <button className="p-2" onClick={() => setIsCreatePlaylistModalOpen(true)}>
              <Plus size={24} />
            </button>
          </header>

          {/* Content */}
          <div className="px-4 pb-8">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading playlists...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col justify-center items-center h-64">
                <p className="text-red-400 mb-2">Error: {error}</p>
                <button onClick={() => window.location.reload()} className="text-blue-400 hover:text-blue-300">
                  Refresh
                </button>
              </div>
            ) : playlists.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64">
                <Music2 size={48} className="text-gray-500 mb-4" />
                <p>No playlists found</p>
                <p className="text-gray-400 text-sm mt-2">Create your first playlist with the + button</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Playlist header */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold">My Saved Items</h1>
                </div>

                {/* Songs by playlist sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {playlists.map((playlist) => (
                    <div key={playlist.id} className="mb-4">
                      <div className="p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/60 transition-colors duration-200">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-bold">{playlist.title}</h2>
                          <Link href={`/playlist/${playlist.id}`}>
                            <span className="text-sm text-gray-400 hover:text-white">See all</span>
                          </Link>
                        </div>

                        {/* Display songs for this playlist */}
                        {!playlist.songs || playlist.songs.length === 0 ? (
                          <div className="flex flex-col justify-center items-center h-40">
                            <Music2 size={36} className="text-gray-500 mb-3" />
                            <p>No songs in this playlist</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {playlist.songs.slice(0, 4).map((song, index) => (
                              <div
                                key={`${song.id || index}`}
                                className="bg-gray-700 rounded-md overflow-hidden relative group cursor-pointer"
                                onClick={() => navigateToSong(song.spotify_id)}
                              >
                                <div className="aspect-square relative overflow-hidden">
                                  {song.album_cover ? (
                                    <>
                                      <img
                                        src={song.album_cover || "/placeholder.svg"}
                                        alt={song.name || "Song"}
                                        className="h-full w-full object-cover transition-all duration-200"
                                        onError={(e) => {
                                          e.currentTarget.src = "/placeholder.svg"
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-200"></div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                                      <Music2 size={32} className="text-gray-400" />
                                    </div>
                                  )}

                                  {/* Song info overlay */}
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                                    <div className="text-xs font-medium truncate">{song.name || "Unknown"}</div>
                                    <div className="text-xs text-gray-300 truncate">
                                      {song.artist || "Unknown artist"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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

