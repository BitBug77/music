"use client"

import { useState, useMemo } from "react"
import { Play } from "lucide-react"

interface ProcessedSong {
  id: number
  title: string
  artist: string
  popularity: number
  spotifyUrl: string
  spotifyTrackId: string
  coverUrl: string
  duration?: string // Added duration field
}

interface TopChartsProps {
  isLoading: boolean
  songs: ProcessedSong[]
  onExplore?: () => void
}

export default function TopCharts({ isLoading, songs, onExplore }: TopChartsProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const tracksPerPage = 8

  // Generate stable durations - only once when component mounts
  const trackList = useMemo(() => {
    return songs.map((song) => ({
      ...song,
      // If song already has duration, use it, otherwise generate a stable one
      duration: song.duration || `${Math.floor(Math.random() * 2) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
    }));
  }, [songs]);

  // Get current page of tracks
  const currentTracks = trackList.slice(
    currentPage * tracksPerPage, 
    (currentPage + 1) * tracksPerPage
  );

  return (
    <div className="flex flex-col p-2 ">
      {/* Track Listing / Chart Section */}
      <div className="relative h-[713px] rounded-xl overflow-hidden shadow-2xl bg-gray-900 text-white border border-gray-700">
        {/* Dark background with subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800"></div>
        
        {/* Track list container - removed scrollbar */}
        <div className="relative z-10 h-full w-full overflow-y-auto p-6 no-scrollbar">
          {/* Larger title */}
          <h2 className="text-3xl font-bold mb-6 text-white">Top Charts</h2>
          
          {/* Track list with more spacing */}
          <div className="space-y-4">
            {currentTracks.map((track, index) => (
              <div 
                key={`track-${track.id || index}`}
                className="flex items-center p-4 hover:bg-gray-800/50 rounded-lg transition-colors duration-200 cursor-pointer"
              >
                {/* Larger track thumbnail */}
                <div className="relative w-20 h-20 mr-5 flex-shrink-0">
                  <img 
                    src={track.coverUrl || "/placeholder.svg"} 
                    alt={track.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                    <Play size={24} className="text-white" />
                  </div>
                </div>
                
                {/* Larger track info */}
                <div className="flex-grow min-w-0">
                  <h3 className="font-medium text-xl text-white truncate">{track.title}</h3>
                  <p className="text-base text-gray-400 truncate mt-1">{track.artist}</p>
                </div>
                
                {/* Fixed track duration */}
                <div className="text-base text-gray-400 ml-4 w-12 text-right">
                  {track.duration}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add custom CSS for hiding scrollbars */}
      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  )
}