"use client"
import { useState } from "react"
import type React from "react"

import { X, Check, PlusCircle } from "lucide-react"

interface Playlist {
  id: number
  title: string
  created_at: string
}

interface Song {
  id: string | number
  title?: string
  name?: string
  artist: string
  spotifyTrackId?: string
  spotify_id?: string
  coverUrl?: string
  album_cover?: string
  popularity?: number
}

// Add to Playlist Modal
export interface AddToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  song: Song | null
  playlists: Playlist[]
  onAddToPlaylist: (playlistId: number, spotifyTrackId: string) => Promise<boolean>
  onCreatePlaylistClick: () => void
  addingToPlaylistId: number | null
  addedToPlaylistId: number | null
}

export function AddToPlaylistModal({
  isOpen,
  onClose,
  song,
  playlists,
  onAddToPlaylist,
  onCreatePlaylistClick,
  addingToPlaylistId,
  addedToPlaylistId,
}: AddToPlaylistModalProps) {
  if (!isOpen || !song) return null

  // Get the correct values regardless of property names
  const songTitle = song.title || song.name || "Unknown Song"
  const songArtist = song.artist || "Unknown Artist"
  const songCoverUrl = song.coverUrl || song.album_cover || "/placeholder.svg"
  const songTrackId = song.spotifyTrackId || song.spotify_id || ""

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fadeIn">
      <div
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md text-white shadow-2xl border border-gray-700"
        style={{
          animation: "scaleIn 0.2s ease-out forwards",
          transform: "scale(0.95)",
          opacity: 0.9,
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Add to Playlist</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-1.5 transition-colors duration-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
            <img
              src={songCoverUrl || "/placeholder.svg"}
              alt={`${songTitle} cover`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <p className="font-medium text-white truncate">{songTitle}</p>
            <p className="text-sm text-gray-400 truncate">{songArtist}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-300 font-medium">Select a playlist:</p>
          <button
            onClick={onCreatePlaylistClick}
            className="flex items-center text-sm text-teal-400 hover:text-teal-300 transition-colors duration-200"
          >
            <PlusCircle size={16} className="mr-1" />
            New Playlist
          </button>
        </div>

        {playlists.length === 0 ? (
          <div className="bg-gray-700/50 rounded-lg p-4 text-center mb-4">
            <p className="text-gray-400">You don't have any playlists yet.</p>
            <button
              onClick={onCreatePlaylistClick}
              className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors duration-200 text-white font-medium"
            >
              Create Your First Playlist
            </button>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto mb-6 space-y-2 pr-1 custom-scrollbar">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => onAddToPlaylist(playlist.id, songTrackId)}
                disabled={addingToPlaylistId !== null || addedToPlaylistId === playlist.id}
                className={`
                  w-full text-left p-4 rounded-lg transition-all duration-200 flex justify-between items-center
                  ${
                    addedToPlaylistId === playlist.id
                      ? "bg-green-500/20 border border-green-500/30"
                      : "hover:bg-gray-700/70 border border-transparent hover:border-gray-600"
                  }
                  ${addingToPlaylistId === playlist.id ? "bg-gray-700/50" : ""}
                `}
              >
                <span className="font-medium">{playlist.title}</span>
                <span className="flex items-center">
                  {addingToPlaylistId === playlist.id && (
                    <div className="animate-spin h-5 w-5 text-teal-500">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                  )}
                  {addedToPlaylistId === playlist.id && (
                    <div className="text-green-500 animate-fadeIn">
                      <Check size={20} strokeWidth={3} />
                    </div>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Create Playlist Modal
export interface CreatePlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  onCreatePlaylist: (title: string) => Promise<void>
  isCreating: boolean
}

export function CreatePlaylistModal({ isOpen, onClose, onCreatePlaylist, isCreating }: CreatePlaylistModalProps) {
  const [playlistTitle, setPlaylistTitle] = useState("")

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlistTitle.trim()) return

    await onCreatePlaylist(playlistTitle)
    setPlaylistTitle("") // Reset the input after submission
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fadeIn">
      <div
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md text-white shadow-2xl border border-gray-700"
        style={{
          animation: "scaleIn 0.2s ease-out forwards",
          transform: "scale(0.95)",
          opacity: 0.9,
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Create New Playlist</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-1.5 transition-colors duration-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="playlist-name" className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Name
            </label>
            <input
              type="text"
              id="playlist-name"
              value={playlistTitle}
              onChange={(e) => setPlaylistTitle(e.target.value)}
              placeholder="Enter playlist name"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-white placeholder-gray-400"
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !playlistTitle.trim()}
              className={`
                px-5 py-2.5 rounded-lg transition-colors duration-200 font-medium flex items-center
                ${!playlistTitle.trim() ? "bg-teal-600/50 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700"}
              `}
            >
              {isCreating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Playlist"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add global styles for animations
export function PlaylistModalStyles() {
  return (
    <style jsx global>{`
      @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0.9; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .animate-fadeIn {
        animation: fadeIn 0.2s ease-out forwards;
      }
      
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `}</style>
  )
}

