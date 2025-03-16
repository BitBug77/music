// pages/saved.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Music2 } from 'lucide-react';
import Sidebar from "../../components/ui/sidebar";
import Navbar from "../../components/ui/navbar";

interface Song {
  id: number;
  title: string;
  artist: string;
  coverUrl: string;
}

export default function SavedPage() {
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedSongs = async () => {
      try {
        setIsLoading(true);
        
        // Get auth token from localStorage or your auth state management
        const token = localStorage.getItem('access_token') || '';
        
        // Make the API call to Django backend
        const response = await fetch('http://127.0.0.1:8000/playlists/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 401) {
            throw new Error('Unauthorized. Please login again.');
          } else if (response.status === 404) {
            throw new Error('No saved songs found.');
          } else {
            throw new Error(`API error: ${response.status}`);
          }
        }

        // Parse response data
        const data = await response.json();
        console.log('Saved songs:', data);
        
        // Assuming the API returns an object with a songs array
        // Adjust according to your Django API response structure
        const songs = Array.isArray(data) ? data : data.songs || [];
        
        setSavedSongs(songs);
        setError(null);
      } catch (error) {
        console.error('Error fetching saved songs:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedSongs();
  }, []);

  return (
    <div className="min-h-screen bg-[#151b27] text-white flex">
      {/* Sidebar */}
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <Navbar />
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <header className="flex justify-between items-center p-4">
            <Link href="/library" passHref>
              <button className="p-2">
                <ArrowLeft size={24} />
              </button>
            </Link>
            <h1 className="text-2xl font-bold">Saved</h1>
            <button className="p-2">
              <Plus size={24} />
            </button>
          </header>

          {/* Content */}
          <div className="px-4 pb-8">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading saved songs...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col justify-center items-center h-64">
                <p className="text-red-400 mb-2">Error: {error}</p>
                <p className="text-gray-400">Try refreshing the page</p>
              </div>
            ) : savedSongs.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64">
                <Music2 size={48} className="text-gray-500 mb-4" />
                <p>No saved songs found</p>
                <p className="text-gray-400 text-sm mt-2">Songs you save will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {savedSongs.map((song) => (
                  <Link href={`/song/${song.id}`} key={song.id} passHref>
                    <div className="aspect-square relative overflow-hidden">
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <Music2 size={32} className="text-gray-500" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                        <p className="text-sm truncate">{song.title}</p>
                        <p className="text-xs text-gray-300 truncate">{song.artist}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}