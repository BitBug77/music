'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserCircle, Search } from 'lucide-react';

// Define TypeScript interfaces for our data structures
interface Song {
  track_id: string;
  name: string;
  artist: string;
  album_cover?: string;
  spotify_url: string;
}

const Navbar: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(true);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debounce function to limit API calls
  const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
    let timer: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

  // Fetch search results with debounce
  const fetchSearchResults = debounce(async (searchQuery: string) => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
  // Retrieve the access token from localStorage
  const accessToken = localStorage.getItem('access_token');

  if (!accessToken) {
    throw new Error('Access token is missing. Please log in again.');
  }

  // Make the GET request to search songs
  const response = await fetch(`http://127.0.0.1:8000/search-songs/?q=${encodeURIComponent(searchQuery)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,  // Add the access token here
    },
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const data: { songs: Song[] } = await response.json();
      const songs: Song[] = data.songs;

      setSearchResults(songs.slice(0, 10)); // Limit to 10 suggestions for better UX
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error during fetch:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, 300); // 300ms debounce delay

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const searchQuery = e.target.value;
    setQuery(searchQuery);
    fetchSearchResults(searchQuery);
  };

  const handleSuggestionClick = (suggestion: Song): void => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    
    // Navigate to the song page with the track_id
    router.push(`/song/${suggestion.track_id}`);
    
    // Log this interaction to the database
    logUserInteraction(suggestion.track_id, 'song_click');
  };
  
  // Function to log user interactions
  const logUserInteraction = async (trackId: string, interactionType: string) => {
    try {
      await fetch('http://127.0.0.1:8000/log-interaction/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          track_id: trackId,
          interaction_type: interactionType,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  };

  const handleClickOutside = (event: MouseEvent): void => {
    if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
      setShowSuggestions(false);
      setIsSearchActive(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setIsSearchActive(false);
    } else if (e.key === 'ArrowDown' && searchResults.length > 0) {
      setActiveSuggestion((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp' && searchResults.length > 0) {
      setActiveSuggestion((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      handleSuggestionClick(searchResults[activeSuggestion]);
    }
  };

  // Focus on input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="text-white shadow-lg z-10 w-full bg-[#74686e]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 pl-0">
            <Link href="/">
              <span className="font-bold px-10 text-xl cursor-pointer">Musicapp</span>
            </Link>
          </div>
          <div className="hidden md:block flex-grow mx-8">
            <div className="relative w-full" ref={searchRef}>
              <div className={`relative w-2/4 transition-all duration-300 ${isSearchActive ? 'w-3/4 scale-105' : 'w-2/4'}`}>
                <input
                  ref={inputRef}
                  className={`bg-blue-100 text-blue-800 rounded-full pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 ${isSearchActive ? 'ring-2 ring-pink-500 shadow-lg' : 'focus:ring-pink-500'}`}
                  type="text"
                  placeholder="Search for songs, artists, or albums..."
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setIsSearchActive(true);
                    if (query.trim() !== '') setShowSuggestions(true);
                  }}
                  value={query}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className={`${isSearchActive ? 'text-pink-600' : 'text-blue-600'}`} />
                </div>
                {isLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {showSuggestions && (
                  <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg z-10 overflow-hidden">
                    {searchResults.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto py-1 text-sm">
                        {searchResults.map((result, index) => (
                          <li
                            key={result.track_id}
                            className={`px-4 py-2 cursor-pointer flex items-center text-gray-800 ${index === activeSuggestion ? 'bg-gray-200' : ''}`}
                            onClick={() => handleSuggestionClick(result)}
                            onMouseEnter={() => setActiveSuggestion(index)}
                          >
                            {result.album_cover && (
                              <img src={result.album_cover} alt="" className="w-8 h-8 mr-3 rounded" />
                            )}
                            <div>
                              <p className="font-medium">{result.name}</p>
                              <p className="text-xs text-gray-500">{result.artist}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-700">No results found for "{query}"</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center pr-0 space-x-4">
            <Link href="/" className="hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium">Home</Link>
            <Link href="/discover" className="bg-blue-700 px-3 py-2 rounded-md text-sm font-medium">Discover</Link>
            <Link href="/playlists" className="hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium">Playlists</Link>
            <Link href="/artists" className="hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium">Artists</Link>
            <button className="ml-2 p-2 rounded-full text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-white">
              <UserCircle size={24} />
            </button>
          </div>
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-white"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/" className="hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium">Home</Link>
            <Link href="/discover" className="bg-blue-700 block px-3 py-2 rounded-md text-base font-medium">Discover</Link>
            <Link href="/playlists" className="hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium">Playlists</Link>
            <Link href="/artists" className="hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium">Artists</Link>
          </div>
          <div className="pt-4 pb-3 border-t border-blue-700">
            <div className="px-5 relative" ref={searchRef}>
              <div className="relative">
                <input
                  className={`bg-blue-100 text-blue-800 rounded-full pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 ${isSearchActive ? 'ring-2 ring-pink-500 shadow-lg' : 'focus:ring-pink-500'}`}
                  type="text"
                  placeholder="Search for songs, artists, or albums..."
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setIsSearchActive(true);
                    if (query.trim() !== '') setShowSuggestions(true);
                  }}
                  value={query}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className={`${isSearchActive ? 'text-pink-600' : 'text-blue-600'}`} />
                </div>
                {isLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {showSuggestions && (
                  <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg z-10 overflow-hidden">
                    {searchResults.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto py-1 text-sm">
                        {searchResults.map((result, index) => (
                          <li
                            key={result.track_id}
                            className={`px-4 py-2 cursor-pointer flex items-center text-gray-800 ${index === activeSuggestion ? 'bg-gray-200' : ''}`}
                            onClick={() => handleSuggestionClick(result)}
                            onMouseEnter={() => setActiveSuggestion(index)}
                          >
                            {result.album_cover && (
                              <img src={result.album_cover} alt="" className="w-8 h-8 mr-3 rounded" />
                            )}
                            <div>
                              <p className="font-medium">{result.name}</p>
                              <p className="text-xs text-gray-500">{result.artist}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-700">No results found for "{query}"</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 px-5 flex justify-center">
              <button className="flex items-center py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 transition duration-150">
                <UserCircle size={20} className="mr-2" />
                <span>My Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;