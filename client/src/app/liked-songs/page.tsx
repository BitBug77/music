"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Play, Clock, Music, Heart, Filter, ChevronDown, ListFilter, Shuffle } from "lucide-react"
import Navbar from "../../components/ui/navbar"
import Sidebar from "../../components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getAccessToken, getAuthHeader, withTokenRefresh } from "../../lib/jwt-utils"

// Define TypeScript interfaces
interface LikedSong {
  id: string
  name: string
  artist: string
  album: string
  duration: string
  added_at: string
  spotify_id: string
  play_count: number
}

// Global style to hide scrollbars in iframes
const iframeStyle = `
  iframe::-webkit-scrollbar {
    display: none;
  }
  iframe {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
`

export default function LikedSongsPage() {
  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState("recently_added")
  const [viewMode, setViewMode] = useState("list")

  const router = useRouter()

  // Fetch liked songs
  const fetchLikedSongs = async () => {
    try {
      setIsLoading(true)
      await withTokenRefresh(async () => {
        const accessToken = getAccessToken()
        if (!accessToken) return

        const response = await fetch("http://127.0.0.1:8000/liked-songs/", {
          method: "GET",
          headers: getAuthHeader(),
        })

        if (!response.ok) {
          throw new Error("Failed to fetch liked songs")
        }

        const data = await response.json()
        setLikedSongs(data.songs || [])
      })
    } catch (error) {
      console.error("Error fetching liked songs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Sort songs based on selected option
  const sortedSongs = () => {
    if (!likedSongs.length) return []

    const songs = [...likedSongs]

    switch (sortBy) {
      case "recently_added":
        return songs.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime())
      case "alphabetical":
        return songs.sort((a, b) => a.name.localeCompare(b.name))
      case "artist":
        return songs.sort((a, b) => a.artist.localeCompare(b.artist))
      case "most_played":
        return songs.sort((a, b) => b.play_count - a.play_count)
      default:
        return songs
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  // Format duration for display
  const formatDuration = (duration: string) => {
    const [minutes, seconds] = duration.split(":").map(Number)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Navigate to song page
  const navigateToSong = (spotifyId: string) => {
    router.push(`/song/${spotifyId}`)
  }

  // Handle shuffle play
  const handleShufflePlay = () => {
    if (likedSongs.length === 0) return

    // Get a random song from the liked songs
    const randomIndex = Math.floor(Math.random() * likedSongs.length)
    const randomSong = likedSongs[randomIndex]

    // Navigate to the song page
    navigateToSong(randomSong.spotify_id)
  }

  // Mock data for development
  useEffect(() => {
    // Comment this out when you have real API
    const mockLikedSongs: LikedSong[] = [
      {
        id: "1",
        name: "Blinding Lights",
        artist: "The Weeknd",
        album: "After Hours",
        duration: "3:20",
        added_at: "2023-12-15T14:30:00Z",
        spotify_id: "0VjIjW4GlUZAMYd2vXMi3b",
        play_count: 42,
      },
      {
        id: "2",
        name: "As It Was",
        artist: "Harry Styles",
        album: "Harry's House",
        duration: "2:47",
        added_at: "2023-11-20T09:15:00Z",
        spotify_id: "4Dvkj6JhhA12EX05fT7y2e",
        play_count: 28,
      },
      {
        id: "3",
        name: "Flowers",
        artist: "Miley Cyrus",
        album: "Endless Summer Vacation",
        duration: "3:21",
        added_at: "2024-01-05T18:45:00Z",
        spotify_id: "0yLdNVWF3Srea0uzk55zFn",
        play_count: 35,
      },
      {
        id: "4",
        name: "Cruel Summer",
        artist: "Taylor Swift",
        album: "Lover",
        duration: "2:58",
        added_at: "2023-10-10T12:20:00Z",
        spotify_id: "1BxfuPKGuaTgP7aM0Bbdwr",
        play_count: 56,
      },
      {
        id: "5",
        name: "Die For You",
        artist: "The Weeknd",
        album: "Starboy",
        duration: "4:20",
        added_at: "2023-09-28T15:10:00Z",
        spotify_id: "2LBqCSwhJGcFQeTHMVGwy3",
        play_count: 19,
      },
      {
        id: "6",
        name: "Creepin'",
        artist: "Metro Boomin, The Weeknd, 21 Savage",
        album: "HEROES & VILLAINS",
        duration: "3:41",
        added_at: "2024-02-01T10:05:00Z",
        spotify_id: "2dHHgzDwk4BJdRwy9uXhTO",
        play_count: 23,
      },
    ]

    setLikedSongs(mockLikedSongs)
    setIsLoading(false)

    // Uncomment this when you have real API
    // fetchLikedSongs()
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gray-800">
      <style jsx global>
        {iframeStyle}
      </style>
      <Navbar />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Liked Songs</h1>
              <p className="text-gray-400">
                {likedSongs.length} songs •{" "}
                {Math.round(
                  likedSongs.reduce((acc, song) => {
                    const [min, sec] = song.duration.split(":").map(Number)
                    return acc + min * 60 + sec
                  }, 0) / 60,
                )}{" "}
                mins
              </p>
            </div>

            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <Button
                variant="outline"
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                onClick={handleShufflePlay}
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Shuffle Play
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Play className="h-4 w-4 mr-2" />
                Play All
              </Button>
            </div>
          </div>

          {/* Tabs and Filters */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
              <Tabs defaultValue="all" className="w-full sm:w-auto">
                <TabsList className="bg-gray-700">
                  <TabsTrigger value="all" className="data-[state=active]:bg-indigo-600">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="recent" className="data-[state=active]:bg-indigo-600">
                    Recently Added
                  </TabsTrigger>
                  <TabsTrigger value="most_played" className="data-[state=active]:bg-indigo-600">
                    Most Played
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-gray-700 border-gray-600 text-white">
                      <ListFilter className="h-4 w-4 mr-2" />
                      Sort: {sortBy.replace("_", " ")}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-700 border-gray-600 text-white">
                    <DropdownMenuItem onClick={() => setSortBy("recently_added")}>Recently Added</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("alphabetical")}>Alphabetical</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("artist")}>Artist</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("most_played")}>Most Played</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex border border-gray-600 rounded-md overflow-hidden">
                  <Button
                    variant="ghost"
                    className={`px-3 py-2 ${viewMode === "list" ? "bg-gray-700" : "bg-gray-800"} text-white hover:bg-gray-700`}
                    onClick={() => setViewMode("list")}
                  >
                    <ListFilter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className={`px-3 py-2 ${viewMode === "grid" ? "bg-gray-700" : "bg-gray-800"} text-white hover:bg-gray-700`}
                    onClick={() => setViewMode("grid")}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Songs List */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          ) : likedSongs.length === 0 ? (
            <div className="text-center py-16 bg-gray-700 rounded-lg">
              <Heart className="h-16 w-16 mx-auto text-gray-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No liked songs yet</h3>
              <p className="text-gray-400 mb-6">Start liking songs to see them here</p>
              <Button className="bg-indigo-600 hover:bg-indigo-700">Discover Music</Button>
            </div>
          ) : viewMode === "list" ? (
            <div className="bg-gray-700 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-800">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      #
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      Album
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      Date Added
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      <Clock className="h-4 w-4" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-700 divide-y divide-gray-600">
                  {sortedSongs().map((song, index) => (
                    <tr
                      key={song.id}
                      className="hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => navigateToSong(song.spotify_id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <iframe
                            src={`https://open.spotify.com/embed/track/${song.spotify_id}?utm_source=generator&theme=0&hideScrollbar=1`}
                            width="80"
                            height="80"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="mr-4 overflow-hidden"
                            style={{ scrollbarWidth: "none" }}
                            onClick={(e) => e.stopPropagation()} // Prevent navigation when clicking the iframe
                          ></iframe>
                          <div>
                            <div className="text-sm font-medium text-white">{song.name}</div>
                            <div className="text-sm text-gray-400">{song.artist}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{song.album}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatDate(song.added_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDuration(song.duration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedSongs().map((song) => (
                <div
                  key={song.id}
                  className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors cursor-pointer"
                  onClick={() => navigateToSong(song.spotify_id)}
                >
                  <iframe
                    src={`https://open.spotify.com/embed/track/${song.spotify_id}?utm_source=generator&theme=0&hideScrollbar=1`}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="overflow-hidden"
                    style={{ scrollbarWidth: "none" }}
                    onClick={(e) => e.stopPropagation()} // Prevent navigation when clicking the iframe
                  ></iframe>
                  <div className="p-4">
                    <h3 className="text-white font-medium truncate">{song.name}</h3>
                    <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                      <span>Added {formatDate(song.added_at)}</span>
                      <span>{formatDuration(song.duration)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently Played Section */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Recently Played From Your Liked Songs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedSongs()
                .slice(0, 4)
                .map((song) => (
                  <div
                    key={`recent-${song.id}`}
                    className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => navigateToSong(song.spotify_id)}
                  >
                    <iframe
                      src={`https://open.spotify.com/embed/track/${song.spotify_id}?utm_source=generator&theme=0&hideScrollbar=1`}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="overflow-hidden"
                      style={{ scrollbarWidth: "none" }}
                      onClick={(e) => e.stopPropagation()} // Prevent navigation when clicking the iframe
                    ></iframe>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-white font-medium truncate">{song.name}</h3>
                          <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                        </div>
                        <div className="bg-indigo-600 text-white text-xs rounded-full px-2 py-1">
                          {song.play_count} plays
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Made For You Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Recommended Based on Your Liked Songs</h2>
            <div className="bg-gradient-to-r from-gray-700 to-gray-600 p-6 rounded-lg">
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/3 mb-6 md:mb-0 md:mr-6">
                  <Music className="h-24 w-24 text-indigo-500 mx-auto md:mx-0" />
                </div>
                <div className="md:w-2/3">
                  <h3 className="text-xl font-bold text-white mb-2">Weekly Discovery Playlist</h3>
                  <p className="text-gray-300 mb-4">
                    We've created a personalized playlist based on your liked songs. Discover new tracks that match your
                    taste every week.
                  </p>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">Listen Now</Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

