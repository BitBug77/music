"use client"

import { Play } from "lucide-react"
import { useState } from "react"

interface FeaturedPlaylistProps {
  title: string
  imageUrl: string
  provider?: string
  description?: string
  coverArtist?: string
  onClick?: () => void
}

export default function FeaturedPlaylistCard({
  title,
  imageUrl,
  provider = "Spotify",
  description = "",
  coverArtist = "",
  onClick,
}: FeaturedPlaylistProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [imageError, setImageError] = useState(false)

  return (
    <div
      className="group cursor-pointer relative rounded-lg overflow-hidden shadow-lg aspect-[4/5]"
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Background image */}
      <img
        src={imageError ? "/placeholder.svg?height=400&width=400" : imageUrl}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true)
          setIsLoading(false)
        }}
      />
      {isLoading && <div className="absolute inset-0 bg-gray-800 animate-pulse"></div>}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>

      {/* Top content - Title and provider */}
      <div className="absolute top-0 left-0 p-4 w-full">
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <p className="text-gray-300 text-xs">Playlist • {provider}</p>
      </div>

      {/* Bottom content - Description and controls */}
      <div className="absolute bottom-0 left-0 p-4 w-full">
        <p className="text-white/80 text-xs mb-3 line-clamp-2">
          {description}
          {coverArtist && <span className="text-white/60"> Cover: {coverArtist}</span>}
        </p>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button className="text-white/70 text-xs bg-white/10 px-2 py-1 rounded-full hover:bg-white/20 transition-colors">
            Preview
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-1 h-1 bg-white/50 rounded-full"></div>
              <div className="w-1 h-1 bg-white/50 rounded-full mx-1"></div>
              <div className="w-1 h-1 bg-white/50 rounded-full"></div>
            </div>

            <button
              className="bg-white rounded-full p-2 shadow-lg hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation()
                onClick?.()
              }}
            >
              <Play size={16} className="text-black fill-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
