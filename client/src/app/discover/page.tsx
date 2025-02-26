// pages/discover.tsx
'use client';
import { useState, useEffect } from 'react';
import { ChevronRight, Music, TrendingUp, Clock, Home, Search, Library, PlusCircle, Heart, Disc } from 'lucide-react';
import type { ReactNode } from 'react';

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

interface MenuItemProps {
  icon: ReactNode;
  label: string;
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
        // Replace with your actual API endpoint
        const response = await fetch('http://127.0.0.1:8000/popularity/');
        
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
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-black p-6 flex flex-col h-full">
        <div className="mb-8">
          <h1 className="text-xl font-bold mb-6">MusicApp</h1>
          
          <div className="space-y-4">
            <MenuItem icon={<Home size={20} />} label="Home" />
            <MenuItem icon={<Search size={20} />} label="Search" />
            <MenuItem icon={<Library size={20} />} label="Your Library" />
          </div>
        </div>
        
        <div className="mt-4 mb-6">
          <MenuItem icon={<PlusCircle size={20} />} label="Create Playlist" />
          <MenuItem icon={<Heart size={20} />} label="Liked Songs" />
        </div>
        
        <div className="border-t border-gray-800 pt-4 mt-auto">
          <a href="#" className="text-sm text-gray-400 hover:text-white transition duration-200">Cookies</a>
          <a href="#" className="text-sm block mt-2 text-gray-400 hover:text-white transition duration-200">Privacy Policy</a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-b from-purple-900 to-gray-900 p-8">
          <h1 className="text-3xl font-bold mb-4">Discover</h1>
          <p className="text-gray-300">Find your next favorite track based on what's trending now</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Top Trending Section */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <TrendingUp size={20} className="mr-2" />
                Top Trending
              </h2>
              <a href="#" className="text-sm text-purple-400 hover:underline">See All</a>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-900 bg-opacity-20 p-4 rounded-md">
                <p className="text-red-400">Error: {error}</p>
                <p className="text-gray-400 mt-2">Showing mock data as fallback</p>
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
              <h2 className="text-xl font-bold flex items-center">
                <Clock size={20} className="mr-2" />
                Popular Tracks
              </h2>
              <a href="#" className="text-sm text-purple-400 hover:underline">See All</a>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-900 bg-opacity-20 p-4 rounded-md mb-4">
                <p className="text-red-400">Error: {error}</p>
                <p className="text-gray-400 mt-2">Showing mock data as fallback</p>
              </div>
            ) : null}
            
            {(isLoading === false) && (
              <div className="bg-gray-800 rounded-md overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-gray-400 text-sm">
                      <th className="p-4 w-12">#</th>
                      <th className="p-4">Title</th>
                      <th className="p-4 hidden md:table-cell">Artist</th>
                      <th className="p-4 text-right">Popularity</th>
                      <th className="p-4">Player</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popularSongs.map((song, index) => (
                      <tr key={song.id} className="hover:bg-gray-700 transition duration-200 group">
                        <td className="p-4 text-gray-400 group-hover:text-white">{index + 1}</td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <img 
                              src={song.coverUrl} 
                              alt={`${song.title} cover`} 
                              className="h-10 w-10 mr-4 rounded"
                            />
                            <div>
                              <div className="font-medium">{song.title}</div>
                              <div className="text-sm text-gray-400 md:hidden">{song.artist}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-400 hidden md:table-cell">{song.artist}</td>
                        <td className="p-4 text-gray-400 text-right">
                          <div className="flex items-center justify-end">
                            <div className="h-1 w-16 bg-gray-700 rounded-full mr-2">
                              <div 
                                className="h-1 bg-green-500 rounded-full" 
                                style={{ width: `${song.popularity}%` }}
                              ></div>
                            </div>
                            <span>{song.popularity}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {song.spotifyTrackId ? (
                            <div>
                              <h3 className="text-sm mb-2">{song.title} - {song.artist}</h3>
                              <iframe 
                                src={`https://open.spotify.com/embed/track/${song.spotifyTrackId}`} 
                                width="300" 
                                height="80" 
                                frameBorder="0" 
                                allow="encrypted-media" 
                                className="w-full"
                              ></iframe>
                            </div>
                          ) : (
                            <a 
                              href={song.spotifyUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-green-500 hover:text-green-400"
                            >
                              <Music size={18} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// Components
function MenuItem({ icon, label }: MenuItemProps) {
  return (
    <a 
      href="#" 
      className="flex items-center py-2 text-gray-300 hover:text-white transition duration-200"
    >
      <span className="mr-4">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function SongCard({ song }: SongCardProps) {
  return (
    <div className="bg-gray-800 rounded-md p-4 hover:bg-gray-700 transition duration-200 cursor-pointer">
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
            className="bg-green-500 rounded-full p-3 shadow-lg"
          >
            <ChevronRight size={24} />
          </a>
        </div>
      </div>
      <h3 className="font-medium truncate">{song.title}</h3>
      <p className="text-sm text-gray-400 truncate">{song.artist}</p>
      <div className="mt-2 flex items-center">
        <div className="h-1 w-full bg-gray-700 rounded-full mr-2">
          <div 
            className="h-1 bg-green-500 rounded-full" 
            style={{ width: `${song.popularity}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-400">{song.popularity}</span>
      </div>
      
      {/* Spotify Player Embed */}
      {song.spotifyTrackId && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">{song.title} - {song.artist}</h3>
          <iframe 
            src={`https://open.spotify.com/embed/track/${song.spotifyTrackId}`} 
            width="100%" 
            height="80" 
            frameBorder="0" 
            allow="encrypted-media"
          ></iframe>
        </div>
      )}
    </div>
  );
}