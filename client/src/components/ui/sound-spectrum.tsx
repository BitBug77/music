"use client"

import { useCallback, useState } from "react"

interface ProcessedSong {
  id: number
  title: string
  artist: string
  popularity: number
  spotifyUrl: string
  spotifyTrackId: string
  coverUrl: string
}

interface SoundSpectrumProps {
  isLoading: boolean
  songs: ProcessedSong[]
  onExplore?: () => void
}

export default function SoundSpectrum({ isLoading, songs, onExplore }: SoundSpectrumProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const nextSlide = useCallback(() => {
    if (onExplore) {
      onExplore()
    }
  }, [onExplore])

  // Record album layout positions based on the reference image
  // These positions create an overlapping, scattered album cover layout
  const positions = [
    // Center dominant album
    { x: 42, y: 45, rotate: 0, scale: 1.2, zIndex: 5 },
    
    // Top row albums
    { x: 20, y: 15, rotate: -2, scale: 1.1, zIndex: 4 },
    { x: 45, y: 10, rotate: 1, scale: 1, zIndex: 3 },
    { x: 70, y: 15, rotate: -3, scale: 1.05, zIndex: 2 },
    
    // Middle-left album
    { x: 10, y: 45, rotate: 2, scale: 1.15, zIndex: 8 },
    
    // Middle-right albums
    { x: 75, y: 42, rotate: -1, scale: 1.1, zIndex: 7 },
    { x: 90, y: 48, rotate: 3, scale: 0.95, zIndex: 6 },
    
    // Bottom row albums
    { x: 15, y: 70, rotate: -2, scale: 1, zIndex: 9 },
    { x: 40, y: 75, rotate: 0, scale: 1.05, zIndex: 10 },
    { x: 65, y: 70, rotate: 2, scale: 1.1, zIndex: 11 },
    
    // Additional albums for more overlapping effect
    { x: 25, y: 30, rotate: 1, scale: 0.9, zIndex: 12 },
    { x: 55, y: 25, rotate: -1, scale: 0.95, zIndex: 13 },
    { x: 80, y: 30, rotate: 2, scale: 0.85, zIndex: 14 },
    { x: 30, y: 60, rotate: -2, scale: 0.9, zIndex: 15 },
    { x: 60, y: 55, rotate: 1, scale: 0.95, zIndex: 16 },
    { x: 85, y: 60, rotate: -3, scale: 0.9, zIndex: 17 },
    
    // Smaller albums in gaps
    { x: 35, y: 25, rotate: 2, scale: 0.8, zIndex: 18 },
    { x: 70, y: 35, rotate: -2, scale: 0.75, zIndex: 19 },
    { x: 20, y: 50, rotate: 1, scale: 0.8, zIndex: 20 },
    { x: 50, y: 65, rotate: -1, scale: 0.75, zIndex: 21 },
    
    // Extras for more fullness
    { x: 55, y: 40, rotate: 2, scale: 0.85, zIndex: 22 },
    { x: 15, y: -5, rotate: -2, scale: 0.9, zIndex: 1 },
    { x: 78, y: 85, rotate: 3, scale: 0.8, zIndex: 23 },
    { x: 0, y: 25, rotate: -1, scale: 0.7, zIndex: 24 },
  ]

  return (
    <div 
      className="relative h-[500px] rounded-xl overflow-hidden shadow-2xl bg-gray-600 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 z-0 transition-opacity duration-300 group-hover:opacity-30">
        {/* Subtle starry background */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => {
            const size = 1 + Math.random() * 2
            const opacity = 0.1 + Math.random() * 0.5
            const top = Math.random() * 100
            const left = Math.random() * 100

            return (
              <div
                key={`star-${i}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  top: `${top}%`,
                  left: `${left}%`,
                  opacity,
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Album art collage - scattered like the reference image */}
      <div className="absolute inset-0 z-10">
        {songs.slice(0, Math.min(24, songs.length)).map((song, index) => {
          // Use predefined positions
          const position = positions[index % positions.length]
          
          return (
            <div
              key={`album-${index}`}
              className="absolute cursor-pointer"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: `rotate(${position.rotate}deg) scale(${position.scale})`,
                zIndex: position.zIndex,
                transition: "none", // Ensure no transition/animation effects
                filter: isHovered ? "brightness(1.1)" : "brightness(1)",
              }}
            >
              <div 
                className="relative shadow-lg overflow-hidden transition-all duration-300" 
                style={{
                  width: "150px",
                  height: "150px",
                  borderRadius: "0px", // Square album covers like the reference image
                }}
              >
                <img
                  src={song.coverUrl || "/placeholder.svg"}
                  alt={song.title}
                  className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110"
                />
                <div className="absolute inset-0 bg-black/0 flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 opacity-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Overlay text */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 text-center bg-black/80 px-8 py-4 rounded-lg backdrop-blur-md transition-all duration-300 group-hover:bg-black/60">
        <h3 className="text-white text-2xl font-bold">DISCOVER MUSIC</h3>
        <p className="text-white/80 text-sm mt-2">Explore All →</p>
      </div>

      {/* Interactive button with enhanced hover effect */}
      <button
        className="absolute bottom-6 right-6 z-30 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-full px-4 py-2 transition-all duration-300 shadow-lg flex items-center gap-2 group-hover:bg-white/70 group-hover:text-black group-hover:shadow-xl group-hover:scale-110 group-hover:font-medium"
        onClick={nextSlide}
      >
        <span>Explore</span>
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
          className="group-hover:transform group-hover:translate-x-1 transition-transform"
        >
          <path d="M5 12h14"></path>
          <path d="M12 5l7 7-7 7"></path>
        </svg>
      </button>
    </div>
  )
}