'use client';
import { useState, useEffect } from 'react';
import { ChevronRight, TrendingUp, Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import Navbar from '../navbar/page';
import Sidebar from "../../components/ui/sidebar";
// Define TypeScript interfaces for our data structures
interface ApiResponse {
  songs?: any[];
  data?: any[];
  items?: any[];
  results?: any[];
  // Add other possible root properties
}

interface ProcessedSong {
  id: number;
  title: string;
  artist: string;
  popularity: number;
  spotifyUrl: string;
  spotifyTrackId: string; // Made this a required field
  coverUrl: string;
}

interface SongCardProps {
  song: ProcessedSong;
}

export default function DiscoverPage() {
  const [popularSongs, setPopularSongs] = useState<ProcessedSong[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch popular songs from your API
    const fetchPopularSongs = async () => {
      try {
        setIsLoading(true);
    
        // Retrieve the access token from localStorage
        const accessToken = localStorage.getItem('access_token');
    
        if (!accessToken) {
          throw new Error('Access token is missing. Please log in again.');
        }
    
        // Set up the request headers with the Authorization header
        const response = await fetch('http://127.0.0.1:8000/popularity/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,  // Attach access token here
          },
        });
    
        if (!response.ok) {
          throw new Error('Failed to fetch popular songs');
        }
    
        const responseData = await response.json();
        console.log('API Response:', responseData); // Log the API response for debugging
        // Determine where the song array is in the response
        let songsArray: any[] = [];
        
        if (Array.isArray(responseData)) {
          // Direct array response
          songsArray = responseData;
        } else if (typeof responseData === 'object' && responseData !== null) {
          // Object response with possible array properties
          const apiResponse = responseData as ApiResponse;
          // Try to find the array in the response
          songsArray = apiResponse.songs || 
                       apiResponse.data || 
                       apiResponse.items || 
                       apiResponse.results || 
                       [];
                       
          // If still not found, look for any array property
          if (songsArray.length === 0) {
            for (const key in apiResponse) {
              if (Array.isArray(apiResponse[key as keyof ApiResponse])) {
                songsArray = apiResponse[key as keyof ApiResponse] as unknown as any[];
                break;
              }
            }
          }
        }
        
        if (songsArray.length === 0) {
          throw new Error('No songs found in API response');
        }
        
        // Process the songs array
        const processedSongs: ProcessedSong[] = songsArray.map((song, index) => {
          // Get artist name handling various possible structures
          let artistName = 'Unknown Artist';
          
          if (song.artist) {
            // Direct artist name as string
            artistName = song.artist;
          } else if (song.artists) {
            if (Array.isArray(song.artists) && song.artists.length > 0) {
              // Array of artist objects with name property
              if (typeof song.artists[0] === 'object' && song.artists[0].name) {
                artistName = song.artists[0].name;
              } else if (typeof song.artists[0] === 'string') {
                // Array of artist names as strings
                artistName = song.artists[0];
              }
            } else if (typeof song.artists === 'string') {
              // Single artist name as string
              artistName = song.artists;
            } else if (typeof song.artists === 'object' && song.artists !== null) {
              // Single artist object
              artistName = song.artists.name || 'Unknown Artist';
            }
          }
          
          // Look for spotifyTrackId directly in the API response
          let spotifyTrackId = '';
          
          // Check if spotifyTrackId is directly available
          if (song.spotifyTrackId) {
            spotifyTrackId = song.spotifyTrackId;
          } else if (song.spotify_id) {
            spotifyTrackId = song.spotify_id;
          } else if (song.track_id) {
            spotifyTrackId = song.track_id;
          }
          
          // Handle external URLs for Spotify
          let spotifyUrl = '#';
          if (song.external_urls && song.external_urls.spotify) {
            spotifyUrl = song.external_urls.spotify;
          } else if (song.spotifyUrl) {
            spotifyUrl = song.spotifyUrl;
          } else if (song.spotify_url) {
            spotifyUrl = song.spotify_url;
          } else if (song.url) {
            spotifyUrl = song.url;
          }
          
          // If we still don't have a track ID, try to extract it from URL
          if (!spotifyTrackId && spotifyUrl !== '#') {
            // Look for /track/ in the URL
            if (spotifyUrl.includes('/track/')) {
              const urlParts = spotifyUrl.split('/track/');
              if (urlParts.length > 1) {
                spotifyTrackId = urlParts[1].split('?')[0];
              }
            }
          }
          
          // Log for debugging
          console.log(`Song ${song.title || song.name}: spotifyTrackId = ${spotifyTrackId}`);
          
          return {
            id: index + 1,
            title: song.name || song.title || 'Unknown Title',
            artist: artistName,
            popularity: song.popularity || 50,
            spotifyUrl: spotifyUrl,
            spotifyTrackId: spotifyTrackId,
            // Use a fallback if album_cover is not available
            coverUrl: song.album_cover || song.cover || song.image || "/api/placeholder/40/40"
          };
        });
        
        // Sort by popularity (highest first)
        processedSongs.sort((a, b) => b.popularity - a.popularity);
        
        setPopularSongs(processedSongs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching popular songs:', err);
        
        // Fallback to mock data in case of API error
        setPopularSongs([
          {
            id: 1,
            title: "Blinding Lights",
            artist: "The Weeknd",
            popularity: 95,
            spotifyUrl: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
            spotifyTrackId: "0VjIjW4GlUZAMYd2vXMi3b",
            coverUrl: "/api/placeholder/40/40"
          },
          {
            id: 2,
            title: "As It Was",
            artist: "Harry Styles",
            popularity: 92,
            spotifyUrl: "https://open.spotify.com/track/4Dvkj6JhhA12EX05fT7y2e",
            spotifyTrackId: "4Dvkj6JhhA12EX05fT7y2e",
            coverUrl: "/api/placeholder/40/40"
          },
          // More fallback songs could be added here
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch actual API data
    fetchPopularSongs();
  }, []);

  return (
    <div className="flex flex-col h-screen text-black">
      {/* Navbar */}
      <div className='bg-[#74686e]'>
        <Navbar />
      </div>
      
      {/* Sidebar component */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-[#151b27]">
        {/* Header */}
        <div className="p-8">
          <h1 className="text-3xl text-blue-700 font-bold mb-4">Discover</h1>
          <p className="text-pink-600">Find your next favorite track based on what's trending now</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Top Trending Section */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center text-blue-700">
                <TrendingUp size={20} className="mr-2" />
                Top Trending
              </h2>
              <a href="#" className="text-sm text-pink-500 hover:underline">See All</a>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pink-500"></div>
              </div>
            ) : error ? (
              <div className="bg-pink-100 p-4 rounded-md">
                <p className="text-pink-600">Error: {error}</p>
                <p className="text-blue-600 mt-2">Showing mock data as fallback</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {popularSongs.slice(0, 4).map(song => (
                  <SongCard key={song.id} song={song} />
                ))}
              </div>
            )}
          </section>

          {/* Popular Tracks Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center text-blue-700">
                <Clock size={20} className="mr-2" />
                Popular Tracks
              </h2>
              <a href="#" className="text-sm text-pink-500 hover:underline">See All</a>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pink-500"></div>
              </div>
            ) : error ? (
              <div className="bg-pink-100 p-4 rounded-md mb-4">
                <p className="text-pink-600">Error: {error}</p>
                <p className="text-blue-600 mt-2">Showing mock data as fallback</p>
              </div>
            ) : null}
            
            {(isLoading === false) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {popularSongs.map((song) => (
                  <div key={song.id} className="bg-[#74686e] rounded-md p-4 shadow-md hover:shadow-lg transition duration-200">
                    <div className="flex items-center mb-3">
                      <img 
                        src={song.coverUrl} 
                        alt={`${song.title} cover`} 
                        className="h-12 w-12 rounded mr-3"
                      />
                      <div>
                        <h3 className="font-medium text-white">{song.title}</h3>
                        <p className="text-sm text-white/80">{song.artist}</p>
                      </div>
                    </div>
                    
                    {song.spotifyTrackId ? (
                      <div className="mt-2">
                        <iframe 
                          src={`https://open.spotify.com/embed/track/${song.spotifyTrackId}`} 
                          width="100%" 
                          height="152" 
                          frameBorder="0" 
                          allow="encrypted-media"
                          className="w-full rounded-md"
                        ></iframe>
                      </div>
                    ) : (
                      <a 
                        href={song.spotifyUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block text-center py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-200 mt-2"
                      >
                        Listen on Spotify
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SongCard({ song }: SongCardProps) {
  return (
    <div className="bg-[#74686e] rounded-md p-4 hover:shadow-md transition duration-200 cursor-pointer border border-blue-100">
      <div className="relative mb-4 group">
        <img 
          src={song.coverUrl}
          alt={`${song.title} cover`}
          className="w-full aspect-square rounded-md"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
          <a 
            href={song.spotifyUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-pink-500 rounded-full p-3 shadow-lg"
          >
            <ChevronRight size={24} className="text-white" />
          </a>
        </div>
      </div>

      
      <h3 className="font-medium truncate text-white">{song.title}</h3>
      <p className="text-sm text-white/80 truncate">{song.artist}</p>
      <div className="mt-2 flex items-center">
        <div className="h-1 w-full bg-yellow-100 rounded-full mr-2">
          <div 
            className="h-1 bg-pink-500 rounded-full" 
            style={{ width: `${song.popularity}%` }}
          ></div>
        </div>
        <span className="text-xs text-white">{song.popularity}</span>
      </div>
      
      {/* Spotify Player Embed */}
      {song.spotifyTrackId && (
        <div className="mt-4">
          <iframe 
            src={`https://open.spotify.com/embed/track/${song.spotifyTrackId}`} 
            width="100%" 
            height="80" 
            frameBorder="0" 
            allow="encrypted-media"
            className="rounded"
          ></iframe>
        </div>
      )}
    </div>
  );
}