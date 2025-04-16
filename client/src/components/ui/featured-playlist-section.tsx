"use client"

import { useState, useEffect, useRef } from "react"
import FeaturedPlaylistCard from "./featured-playlist-card"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Song {
  name: string
  artist: string
  popularity: number
  spotify_url: string
  album_cover: string
  spotify_track_id?: string
}

interface Playlist {
  id: string
  title: string
  imageUrl: string
  provider: string
  description: string
  coverArtist?: string
  songs?: Song[]
}

export default function FeaturedPlaylistsSection() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchSongsAndCreatePlaylists = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Retrieve the access token from localStorage
        const accessToken = localStorage.getItem("access_token")

        if (!accessToken) {
          throw new Error("Access token is missing. Please log in again.")
        }

        // Fetch songs from the popularity endpoint
        const response = await fetch("http://127.0.0.1:8000/popularity/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch popular songs: ${response.status}`)
        }

        const responseData = await response.json()
        console.log("Popularity API Response:", responseData)

        if (responseData.status !== "success" || !Array.isArray(responseData.songs)) {
          throw new Error("Invalid response format from API")
        }

        const songs = responseData.songs as Song[]

        // Extract Spotify track IDs from URLs if not directly provided
        const processedSongs = songs.map((song) => {
          let spotifyTrackId = song.spotify_track_id || ""

          // If track ID is not available, try to extract from URL
          if (!spotifyTrackId && song.spotify_url && song.spotify_url.includes("/track/")) {
            const urlParts = song.spotify_url.split("/track/")
            if (urlParts.length > 1) {
              spotifyTrackId = urlParts[1].split("?")[0]
            }
          }

          return {
            ...song,
            spotify_track_id: spotifyTrackId,
          }
        })

        // Create curated playlists from the songs
        const generatedPlaylists = createPlaylistsFromSongs(processedSongs)
        setPlaylists(generatedPlaylists)
      } catch (err) {
        console.error("Error fetching songs:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")

        // Fallback to mock playlists
        setPlaylists(getMockPlaylists())
      } finally {
        setIsLoading(false)
      }
    }

    fetchSongsAndCreatePlaylists()
  }, [])

  // Function to create playlist groupings from songs
  const createPlaylistsFromSongs = (songs: Song[]): Playlist[] => {
    // Sort songs by popularity (highest first)
    const sortedSongs = [...songs].sort((a, b) => b.popularity - a.popularity)

    // Filter out songs without album covers
    const songsWithCovers = sortedSongs.filter((song) => song.album_cover)

    // Group 1: Top Hits (highest popularity)
    const topHits = songsWithCovers.slice(0, 8)

    // Group 2: Group by artist - find artists with multiple songs
    const artistCounts = songsWithCovers.reduce<Record<string, number>>((acc, song) => {
      acc[song.artist] = (acc[song.artist] || 0) + 1
      return acc
    }, {})

    const popularArtists = Object.entries(artistCounts)
      .filter(([_, count]) => count > 1)
      .sort(([_, countA], [__, countB]) => countB - countA)
      .map(([artist]) => artist)
      .slice(0, 4)

    // Create artist playlists
    const artistPlaylists = popularArtists.map((artist) => {
      const artistSongs = songsWithCovers.filter((song) => song.artist === artist)
      return {
        id: `artist-${artist.replace(/\s+/g, "-").toLowerCase()}`,
        title: `Best of ${artist}`,
        imageUrl: artistSongs[0]?.album_cover || "/placeholder.svg?height=400&width=400",
        provider: "Spotify",
        description: `The top tracks from ${artist}`,
        coverArtist: artist,
        songs: artistSongs,
      }
    })

    // Group 3: Dance Hits (songs with "dance" in the title)
    const danceSongs = songsWithCovers.filter((song) => song.name.toLowerCase().includes("dance"))

    // Group 4: Create genre-based playlists (simulated since we don't have genre data)
    // We'll use popularity ranges as a proxy for genres
    const highPopularity = songsWithCovers.filter((song) => song.popularity >= 40)
    const midPopularity = songsWithCovers.filter((song) => song.popularity >= 20 && song.popularity < 40)

    // Create the final playlist array
    const generatedPlaylists: Playlist[] = [
      {
        id: "top-hits",
        title: "Today's Top Hits",
        imageUrl: topHits[0]?.album_cover || "/placeholder.svg?height=400&width=400",
        provider: "Spotify",
        description: "The most popular tracks right now.",
        songs: topHits,
      },
      {
        id: "dance-hits",
        title: "Dance Hits",
        imageUrl: danceSongs[0]?.album_cover || "/placeholder.svg?height=400&width=400",
        provider: "Spotify",
        description: "The best dance tracks to get you moving.",
        coverArtist: danceSongs[0]?.artist,
        songs: danceSongs,
      },
      ...artistPlaylists,
      {
        id: "trending-now",
        title: "Trending Now",
        imageUrl: highPopularity[0]?.album_cover || "/placeholder.svg?height=400&width=400",
        provider: "Spotify",
        description: "What's trending in the music world right now.",
        coverArtist: highPopularity[0]?.artist,
        songs: highPopularity,
      },
      {
        id: "discover-weekly",
        title: "Discover Weekly",
        imageUrl: midPopularity[0]?.album_cover || "/placeholder.svg?height=400&width=400",
        provider: "Spotify",
        description: "Your weekly mixtape of fresh music.",
        songs: midPopularity,
      },
    ]

    // Ensure we have at least 8 playlists by adding mock ones if needed
    const mockPlaylists = getMockPlaylists()
    while (generatedPlaylists.length < 8) {
      generatedPlaylists.push(mockPlaylists[generatedPlaylists.length])
    }

    return generatedPlaylists.slice(0, 8) // Limit to 8 playlists
  }

  // Fallback mock playlists
  const getMockPlaylists = (): Playlist[] => [
    {
      id: "1",
      title: "I Love My '00s R&B",
      imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-wySuwc4xA1jyf8EqrGmhch9xlL6K1f.png",
      provider: "Spotify",
      description: "The most essential R&B songs from the '00s.",
      coverArtist: "Janet Jackson",
    },
    {
      id: "2",
      title: "2010s Hip-Hop",
      imageUrl: "/placeholder.svg?height=400&width=400",
      provider: "Spotify",
      description: "Taking it back to the 2010s. Cover: Megan Thee Stallion",
    },
    {
      id: "3",
      title: "I Love My '90s R&B",
      imageUrl: "/placeholder.svg?height=400&width=400",
      provider: "Spotify",
      description: "The most essential R&B songs from the '90s. Cover: Mariah Carey",
    },
    {
      id: "4",
      title: "I Love My '90s Hip-Hop",
      imageUrl: "/placeholder.svg?height=400&width=400",
      provider: "Spotify",
      description: "Real rap music from the golden era.",
    },
    {
      id: "5",
      title: "Happy Mix",
      imageUrl: "/placeholder.svg?height=400&width=400",
      provider: "Spotify",
      description: "Jonas, Harry Styles, Lady Gaga and more.",
    },
    {
      id: "6",
      title: "Throwback Thursday",
      imageUrl: "/placeholder.svg?height=400&width=400",
      provider: "Spotify",
      description: "#TBTMTV takes you back to 2015. Cover: The Weeknd",
    },
    {
      id: "7",
      title: "Upbeat Mix",
      imageUrl: "/placeholder.svg?height=400&width=400",
      provider: "Spotify",
      description: "Beyoncé, The Chainsmokers, Tiësto and more.",
    },
    {
      id: "8",
      title: "Acoustic Throwbacks",
      imageUrl: "/placeholder.svg?height=400&width=400",
      provider: "Spotify",
      description: "Highlights from the world of acoustics.",
    },
  ]

  const handlePlaylistClick = (playlistId: string) => {
    console.log(`Opening playlist ${playlistId}`)
    // In a real app, you would navigate to the playlist page or open a modal
  }

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      // Scroll by 4 playlist cards
      const scrollAmount = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      // Scroll by 4 playlist cards
      const scrollAmount = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  return (
    <section className="mb-16 relative">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Featured Playlists</h2>
        <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
          Browse All
        </a>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900/30 rounded-md p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-1">Showing mock data as fallback</p>
        </div>
      )}

      <div className="relative">
        {/* Navigation Arrows */}
        <button 
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 shadow-lg"
          aria-label="Scroll left"
        >
          <ChevronLeft size={24} />
        </button>

        <button 
          onClick={scrollRight}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 shadow-lg"
          aria-label="Scroll right"
        >
          <ChevronRight size={24} />
        </button>

        {isLoading ? (
          <div className="flex space-x-8 overflow-hidden pb-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex-shrink-0 w-1/5 aspect-[4/5] bg-gray-800 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div 
            ref={scrollContainerRef}
            className="flex space-x-8 overflow-x-auto pb-4 scrollbar-hide px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollSnapType: 'x mandatory' }}
          >
            {playlists.map((playlist) => (
              <div 
                key={playlist.id} 
                className="flex-shrink-0 w-1/5 min-w-[calc(20%-24px)]"
                style={{ scrollSnapAlign: 'start' }}
              >
                <FeaturedPlaylistCard
                  title={playlist.title}
                  imageUrl={playlist.imageUrl}
                  provider={playlist.provider}
                  description={playlist.description}
                  coverArtist={playlist.coverArtist}
                  onClick={() => handlePlaylistClick(playlist.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}