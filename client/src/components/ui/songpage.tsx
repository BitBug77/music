'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Heart, Share2, SkipBack, SkipForward, Music, BarChart2, Calendar, Clock, BookmarkPlus } from 'lucide-react';
import Navbar from './navbar';
import Sidebar from "./sidebar";

interface SongDetails {
  track_id: string;
  name: string;
  artist: string;
  album: string | { name: string; [key: string]: any };
  album_cover: string;
  release_date: string;
  duration: number;
  popularity: number;
  spotify_url: string;
  similar_songs: Array<{
    track_id: string;
    name: string;
    artist: string;
    album_cover: string;
  }>;
}

interface RecommendedSong {
  track_id: string;
  name: string;
  artist: string;
  album_cover: string;
  popularity: number;
}

interface RefreshTokenResponse {
  access: string;
}

interface SongStatusResponse {
  is_liked: boolean;
  is_saved: boolean;
}

export default function SongPage() {
  const params = useParams();
  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
  const [song, setSong] = useState<SongDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [recommendedSongs, setRecommendedSongs] = useState<RecommendedSong[]>([]);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchSongDetails = async () => {
      setIsLoading(true);
      try {
        if (id) {
          // Replace with actual API endpoint
          const response = await fetch(`http://127.0.0.1:8000/song/${id}`);
          if (!response.ok) throw new Error('Failed to fetch song details');
          const data = await response.json();
          
          console.log("Song data received:", data);
          
          const formattedData: SongDetails = {
            ...data,
            album: typeof data.album === 'object' ? data.album.name : data.album,
          };
          
          setSong(formattedData);
          
          // Log view interaction using the track_id from the API response
          if (formattedData.track_id) {
            await handleSongAction(formattedData.track_id, 'view');
            
            // Fetch current like and save status
            await fetchSongStatus(formattedData.track_id);
          }
        }
      } catch (error) {
        console.error("Error fetching song details:", error);
        setErrorMessage("Failed to load song details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRecommendedSongs = async () => {
      setIsRecommendationsLoading(true);
      try {
        if (id) {
          // Fetch recommended songs from API
          const response = await fetch(`http://127.0.0.1:8000/recommendations/${id}`);
          if (!response.ok) throw new Error('Failed to fetch recommendations');
          const data = await response.json();
          
          setRecommendedSongs(data.recommendations || []);
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        setRecommendedSongs([]);
      } finally {
        setIsRecommendationsLoading(false);
      }
    };

    if (id) {
      fetchSongDetails();
      fetchRecommendedSongs();
    }
  }, [id]);
  
  // Function to fetch the current like and save status for a song
  const fetchSongStatus = async (trackId: string) => {
    try {
      let accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        console.log('No access token found, user might not be logged in');
        return;
      }
      
      // Endpoint to get song status (like/save)
      const endpoint = `http://127.0.0.1:8000/songs/${trackId}/status/`;
      
      let response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });
      
      // Handle token refresh if needed
      if (response.status === 401) {
        const newToken = await handleTokenRefresh();
        if (!newToken) return;
        
        // Retry with new token
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
          credentials: 'include',
        });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch song status: ${response.status}`);
      }
      
      const data: SongStatusResponse = await response.json();
      console.log('Song status:', data);
      
      // Update state based on response
      setIsFavorite(data.is_liked);
      setIsSaved(data.is_saved);
      
    } catch (error) {
      console.error('Error fetching song status:', error);
      // Don't show an error message here, just keep defaults
    }
  };

  // Function to refresh the access token using the refresh token
  const refreshAccessToken = async (refreshToken: string): Promise<string> => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
  
      const data: RefreshTokenResponse = await response.json();
      return data.access;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  };
  
  // Handle token refresh and return new access token if successful
  const handleTokenRefresh = async (): Promise<string | null> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('Refresh token is missing. Please log in again.');
      }
      
      const accessToken = await refreshAccessToken(refreshToken);
      localStorage.setItem('access_token', accessToken);
      return accessToken;
    } catch (error) {
      console.error('Error during token refresh:', error);
      setErrorMessage('Your session has expired. Please log in again.');
      return null;
    }
  };
  
  // Function to handle API calls for specific song interactions
  const handleSongAction = async (trackId: string, actionType: string) => {
    try {
      setErrorMessage(null);
      let accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        throw new Error('Access token is missing. Please log in again.');
      }
      
      // Determine endpoint based on action type
      let endpoint = '';
      switch(actionType) {
        case 'like':
          endpoint = `http://127.0.0.1:8000/songs/${trackId}/like/`;
          break;
        case 'save':
          endpoint = `http://127.0.0.1:8000/songs/${trackId}/save/`;
          break;
        case 'play':
          endpoint = `http://127.0.0.1:8000/songs/${trackId}/play/`;
          break;
        case 'skip':
          endpoint = `http://127.0.0.1:8000/songs/${trackId}/skip/`;
          break;
        case 'view':
          endpoint = `http://127.0.0.1:8000/songs/${trackId}/view/`;
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }
      
      // Make the API call
      let response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });
      
      // Handle token refresh if needed
      if (response.status === 401) {
        const newToken = await handleTokenRefresh();
        if (!newToken) return;
        
        // Retry the request with the new token
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`,
          },
          credentials: 'include',
        });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to perform ${actionType} action: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`${actionType} action completed successfully`, data);
      
      return data;
    } catch (error) {
      console.error(`Error performing ${actionType} action:`, error);
      setErrorMessage(`Failed to log ${actionType} interaction. Please try again.`);
      throw error;
    }
  };
  
  const handleNextSong = () => {
    if (song?.similar_songs && song.similar_songs.length > 0) {
      const firstSimilarSong = song.similar_songs[0];
      // Log skip action to specific endpoint
      if (song.track_id) {
        handleSongAction(song.track_id, 'skip');
      }
      // Navigate to the first similar song
      window.location.href = `/song/${firstSimilarSong.track_id}`;
    }
  };

  const handlePreviousSong = () => {
    // For demonstration purposes - in a real app this would use browser history
    if (song?.track_id) {
      handleSongAction(song.track_id, 'skip');
    }
    window.history.back();
  };

  const handleToggleFavorite = async () => {
    if (song?.track_id) {
      try {
        await handleSongAction(song.track_id, 'like');
        setIsFavorite(!isFavorite);
      } catch (error) {
        console.error("Error toggling favorite:", error);
      }
    }
  };
  
  const handleToggleSave = async () => {
    if (song?.track_id) {
      try {
        await handleSongAction(song.track_id, 'save');
        setIsSaved(!isSaved);
      } catch (error) {
        console.error("Error toggling save:", error);
      }
    }
  };
  
  const handlePlaySong = async () => {
    if (song?.track_id) {
      try {
        await handleSongAction(song.track_id, 'play');
        console.log("Play action logged successfully");
      } catch (error) {
        console.error("Error logging play action:", error);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const safeRender = (value: any): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  const renderPopularityBars = (popularity: number) => {
    const maxBars = 5;
    const filledBars = Math.round((popularity / 100) * maxBars);
    
    return (
      <div className="flex space-x-1">
        {Array.from({ length: maxBars }).map((_, index) => (
          <div 
            key={index} 
            className={`h-2 w-6 rounded-sm ${index < filledBars ? 'bg-pink-500' : 'bg-gray-600'}`}
          ></div>
        ))}
      </div>
    );
  };

  // Extract Spotify track ID from the spotify_url
  const getSpotifyTrackId = (spotifyUrl: string) => {
    if (!spotifyUrl) return null;
    const urlParts = spotifyUrl.split('/');
    return urlParts[urlParts.length - 1].split('?')[0];
  };
  
  // Dismiss error message
  const dismissError = () => {
    setErrorMessage(null);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className='bg-[#74686e]'>
        <Navbar />
      </div>
      
      <Sidebar />
      
      <div className="flex-1 overflow-auto bg-[#151b27] text-white p-8">
        {/* Error Message Banner */}
        {errorMessage && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-md shadow-lg z-50 flex items-center">
            <span>{errorMessage}</span>
            <button 
              onClick={dismissError}
              className="ml-4 text-white hover:text-white/80"
            >
              ✕
            </button>
          </div>
        )}
      
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin h-12 w-12 border-4 border-pink-500 border-t-transparent rounded-full"></div>
          </div>
        ) : song ? (
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Song Album Cover */}
              <div className="w-full md:w-1/3">
                <div className="relative group">
                  <img 
                    src={song.album_cover || "/api/placeholder/300/300"} 
                    alt={`${song.name} album cover`}
                    className="w-full h-auto rounded-lg shadow-lg"
                  />
                </div>
                
                {/* Album details card */}
                <div className="mt-6 bg-[#1d2433] rounded-lg z-3 p-4">
                  <h3 className="text-lg font-medium mb-3">Album Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Music className="w-4 h-4 mr-2 text-pink-500" />
                      <span className="text-white/70">Album: </span>
                      <span className="ml-2">{safeRender(song.album)}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-pink-500" />
                      <span className="text-white/70">Released: </span>
                      <span className="ml-2">{song.release_date ? new Date(song.release_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-pink-500" />
                      <span className="text-white/70">Duration: </span>
                      <span className="ml-2">{song.duration ? formatDuration(song.duration / 1000) : 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <BarChart2 className="w-4 h-4 mr-2 text-pink-500" />
                      <span className="text-white/70">Popularity: </span>
                      <div className="ml-2">
                        {renderPopularityBars(song.popularity)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Song Details */}
              <div className="w-full md:w-2/3">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-white mb-2">{safeRender(song.name)}</h1>
                  <a 
                    href={song.spotify_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 px-3 py-1 rounded-full"
                    onClick={() => {
                      if (song.track_id) {
                        handleSongAction(song.track_id, 'view');
                      }
                    }}
                  >
                    <span>Open in Spotify</span>
                  </a>
                </div>
                <h2 className="text-xl text-pink-500 mb-4">{safeRender(song.artist)}</h2>
                
                {/* Tabs */}
                <div className="mb-6 border-b border-white/20">
                  <div className="flex space-x-4">
                    <button 
                      className={`py-2 px-4 ${activeTab === 'details' ? 'border-b-2 border-pink-500 text-white' : 'text-white/70 hover:text-white'}`}
                      onClick={() => setActiveTab('details')}
                    >
                      Details
                    </button>
                    <button 
                      className={`py-2 px-4 ${activeTab === 'lyrics' ? 'border-b-2 border-pink-500 text-white' : 'text-white/70 hover:text-white'}`}
                      onClick={() => setActiveTab('lyrics')}
                    >
                      Lyrics
                    </button>
                  </div>
                </div>
                
                {/* Tab content */}
                <div className="mb-6">
                  {activeTab === 'details' ? (
                    <div className="text-white/80 leading-relaxed">
                      <p>
                        "{safeRender(song.name)}" is a track by {safeRender(song.artist)} from the album {safeRender(song.album)}.
                        This track was released on {song.release_date ? new Date(song.release_date).toLocaleDateString() : 'N/A'} and
                        has gained significant popularity among listeners.
                      </p>
                      <p className="mt-4">
                        You can listen to the track directly below using the Spotify player.
                        If you enjoy this track, check out similar songs and recommendations below.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[#1d2433] rounded-lg p-4">
                      <p className="text-center text-white/60 italic py-8">
                        Lyrics are not available at the moment. Please check Spotify for the complete lyrics.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Spotify Embedded Player */}
                <div className="bg-[#1d2433] rounded-lg p-6 mb-8">
                  {song.spotify_url ? (
                    <div className="w-full">
                      <iframe 
                        src={`https://open.spotify.com/embed/track/${getSpotifyTrackId(song.spotify_url)}`}
                        width="100%" 
                        height="352" 
                        frameBorder="0" 
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                        loading="lazy"
                        className="rounded-md"
                        onLoad={() => handlePlaySong()}
                      ></iframe>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-white/60">Spotify player not available for this track.</p>
                      <a
                        href={`https://open.spotify.com/search/${encodeURIComponent(`${song.name} ${song.artist}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full"
                      >
                        Search on Spotify
                      </a>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex space-x-4">
                      <button 
                        onClick={handleToggleFavorite}
                        className={`p-2 rounded-full ${isFavorite ? 'text-pink-500 bg-pink-500/20' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        title={isFavorite ? "Unlike" : "Like"}
                      >
                        <Heart size={22} fill={isFavorite ? "#ec4899" : "none"} />
                      </button>
                      <button 
                        onClick={handleToggleSave}
                        className={`p-2 rounded-full ${isSaved ? 'text-pink-500 bg-pink-500/20' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        title={isSaved ? "Unsave" : "Save"}
                      >
                        <BookmarkPlus size={22} fill={isSaved ? "#ec4899" : "none"} />
                      </button>
                      <button 
                        className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                        title="Share"
                      >
                        <Share2 size={22} />
                      </button>
                    </div>
                    
                    <div className="flex space-x-4 items-center">
                      <button 
                        onClick={handlePreviousSong}
                        className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                        title="Previous Song"
                      >
                        <SkipBack size={22} />
                      </button>
                      <button 
                        onClick={handleNextSong}
                        className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                        title="Next Song"
                      >
                        <SkipForward size={22} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recommendations Section */}
            <div className="mt-12">
              <h3 className="text-xl font-semibold text-white mb-6">Recommended For You</h3>
              
              {isRecommendationsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-3 border-pink-500 border-t-transparent rounded-full"></div>
                </div>
              ) : recommendedSongs.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {recommendedSongs.map((song) => (
                    <a 
                      key={song.track_id}
                      href={`/song/${song.track_id}`}
                      className="bg-[#1d2433] p-4 rounded-lg hover:bg-[#2a3548] transition-colors group"
                      onClick={() => handleSongAction(song.track_id, 'view')}
                    >
                      <div className="relative overflow-hidden rounded-md mb-3">
                        <img 
                          src={song.album_cover || "/api/placeholder/150/150"} 
                          alt={`${song.name} album cover`}
                          className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-pink-500 rounded-full p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <h4 className="font-medium text-white truncate">{safeRender(song.name)}</h4>
                      <p className="text-sm text-white/70 truncate">{safeRender(song.artist)}</p>
                      {song.popularity && (
                        <div className="mt-2">
                          {renderPopularityBars(song.popularity)}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-[#1d2433] rounded-lg">
                  <p className="text-white/60">No recommendations found for this track.</p>
                  <p className="text-sm text-white/40 mt-2">Try exploring similar songs below.</p>
                </div>
              )}
            </div>
            
            {/* Similar Songs */}
            {song.similar_songs && song.similar_songs.length > 0 && (
              <div className="mt-12">
                <h3 className="text-xl font-semibold text-white mb-6">You might also like</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {song.similar_songs.map((similarSong) => (
                    <a 
                      key={similarSong.track_id}
                      href={`/song/${similarSong.track_id}`}
                      className="bg-[#74686e]/30 p-4 rounded-lg hover:bg-[#74686e]/50 transition-colors group"
                      onClick={() => handleSongAction(similarSong.track_id, 'view')}
                    >
                      <div className="relative overflow-hidden rounded-md mb-3">
                        <img 
                          src={similarSong.album_cover || "/api/placeholder/150/150"} 
                          alt={`${similarSong.name} album cover`}
                          className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-pink-500 rounded-full p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <h4 className="font-medium text-white truncate">{safeRender(similarSong.name)}</h4>
                      <p className="text-sm text-white/70 truncate">{safeRender(similarSong.artist)}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-semibold text-white mb-4">Song not found</h2>
            <p className="text-white/70">The song you're looking for doesn't exist or is unavailable.</p>
            <a href="/" className="mt-6 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-md">
              Back to Home
            </a>
          </div>
        )}
      </div>
    </div>
  );
}