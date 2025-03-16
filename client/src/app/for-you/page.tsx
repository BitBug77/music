"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Music, Play, Clock, Heart, MoreHorizontal, Loader2 } from "lucide-react"
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";
import { getAuthHeader, withTokenRefresh } from "../../lib/jwt-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Define TypeScript interfaces
interface Song {
  track_id: string
  name: string
  artist: string
  album: string
  album_cover?: string
  duration: number
  popularity: number
}

interface Artist {
  id: string
  name: string
  image?: string
  genres: string[]
  popularity: number
}

interface Playlist {
  id: string
  name: string
  description: string
  cover_image?: string
  owner: string
  song_count: number
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

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Fetch personalized recommendations
  const fetchRecommendations = async () => {
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
        setRecommendations(data)
      })
    } catch (error) {
      console.error("Error fetching recommendations:", error)
      setError("Failed to load personalized recommendations. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle song play
  const handlePlaySong = async (trackId: string) => {
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
  const handleLikeSong = async (trackId: string) => {
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

  useEffect(() => {
    fetchRecommendations()
  }, [])

  return (
    <div className="flex h-screen bg-gray-800 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-blue-900 dark:text-white">For You</h1>
            <p className="text-gray-400 dark:text-gray-400 mb-8">
              Personalized recommendations based on your listening history and preferences.
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading your recommendations...</span>
              </div>
            ) : error ? (
              <div className="bg-gray-600 dark:bg-red-900/20 border border-red-500 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-700 dark:text-red-400">{error}</p>
                <Button variant="outline" className="mt-2 justify-right " onClick={fetchRecommendations}>
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <Tabs defaultValue="songs" className="mb-8" onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="songs">Songs</TabsTrigger>
                    <TabsTrigger value="artists">Artists</TabsTrigger>
                    <TabsTrigger value="playlists">Playlists</TabsTrigger>
                    <TabsTrigger value="recent">Recently Played</TabsTrigger>
                  </TabsList>

                  <TabsContent value="songs" className="space-y-4">
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
                            {recommendations?.songs.map((song, index) => (
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
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="artists" className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {recommendations?.artists.map((artist) => (
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
                  </TabsContent>

                  <TabsContent value="playlists" className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {recommendations?.playlists.map((playlist) => (
                        <Link href={`/playlist/${playlist.id}`} key={playlist.id}>
                          <Card className="overflow-hidden transition-all hover:shadow-md">
                            <div className="aspect-square relative">
                              {playlist.cover_image ? (
                                <Image
                                  src={playlist.cover_image || "/placeholder.svg"}
                                  alt={playlist.name}
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
                              <h3 className="font-medium text-gray-900 dark:text-white truncate">{playlist.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {playlist.description}
                              </p>
                              <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{playlist.song_count} songs</span>
                                <span className="mx-1">•</span>
                                <span>By {playlist.owner}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="recent" className="space-y-4">
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
                            {recommendations?.recently_played.map((song, index) => (
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
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

