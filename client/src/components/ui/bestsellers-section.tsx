"use client";

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface Song {
  name: string;
  artist: string;
  popularity: number;
  spotify_url: string;
  album_cover: string;
}

export default function BestsellersSection() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchPopularSongs = async () => {
      try {
        const response = await fetch('http://localhost:8000/popularity', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch songs');
        }

        const data = await response.json();
        setSongs(data.songs);
        setLoading(false);
      } catch (err) {
        setError('Failed to load songs');
        setLoading(false);
      }
    };

    fetchPopularSongs();
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  // Create column groups following the pattern:
  // 1. Two small albums
  // 2. One large album
  // 3. Two columns with two small albums each
  // 4. One large album
  // Repeat
  const createItemGroups = () => {
    if (!songs.length) return [];
    
    const groups = [];
    let i = 0;
    
    while (i < songs.length) {
      // Pattern: small pair, large, small pair, small pair, large, repeat
      const currentPosition = groups.length % 5;
      
      if (currentPosition === 1 || currentPosition === 4) {
        // Add a large card (positions 1 and 4 in the pattern)
        if (i < songs.length) {
          groups.push({
            type: 'large',
            songs: [songs[i]]
          });
          i++;
        }
      } else {
        // Add a column with two small cards (if available)
        const columnSongs = [];
        
        if (i < songs.length) {
          columnSongs.push(songs[i]);
          i++;
        }
        
        if (i < songs.length) {
          columnSongs.push(songs[i]);
          i++;
        }
        
        if (columnSongs.length > 0) {
          groups.push({
            type: 'small-pair',
            songs: columnSongs
          });
        }
      }
    }
    
    return groups;
  };

  if (loading) {
    return (
      <div className="mb-16 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Underrated</h2>
        </div>
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-64 h-64 bg-gray-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-16 p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const itemGroups = createItemGroups();

  return (
    <section 
      className="mb-16 p-6 relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Underrated</h2>
        <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
          View All
        </a>
      </div>
      
      <div className="relative">
        {/* Left navigation arrow */}
        <button 
          onClick={scrollLeft}
          className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 transition-all ${isHovering ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Scroll left"
          style={{ transform: 'translateY(-50%) translateX(-16px)' }}
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto pb-4 gap-6 scroll-smooth hide-scrollbar" /* increased gap from 4 to 6 */
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {itemGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex-shrink-0">
              {group.type === 'large' ? (
                // Large single card
                <SongCard 
                  song={group.songs[0]} 
                  size="large" 
                />
              ) : (
                // Column with two small cards
                <div className="flex flex-col gap-6"> {/* increased gap from 4 to 6 */}
                  {group.songs.map((song, idx) => (
                    <SongCard 
                      key={song.spotify_url} 
                      song={song} 
                      size="small" 
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right navigation arrow */}
        <button 
          onClick={scrollRight}
          className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 transition-all ${isHovering ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Scroll right"
          style={{ transform: 'translateY(-50%) translateX(16px)' }}
        >
          <ChevronRight size={20} className="text-white" />
        </button>
      </div>

      {/* CSS for hiding scrollbar */}
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

// Extracted SongCard component for reusability
const SongCard = ({ song, size }: { song: Song, size: 'small' | 'large' }) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-lg transition-transform duration-300 hover:scale-105 ${
        size === 'large' 
          ? 'w-64 h-64 md:w-80 md:h-80'
          : 'w-48 h-32 md:w-56 md:h-40'
      }`}
    >
      <Image
        src={song.album_cover}
        alt={`${song.name} by ${song.artist}`}
        fill
        className="object-cover"
        sizes={size === 'large' ? "(max-width: 800px) 256px, 320px" : "(max-width: 768px) 192px, 224px"}
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity duration-300">
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center p-4">
          <h3 className={`font-bold truncate w-full ${size === 'large' ? 'text-xl' : 'text-base'}`}>{song.name}</h3>
          <p className="text-sm truncate w-full">{song.artist}</p>
          {size === 'large' && (
            <p className="text-xs mt-2">Popularity: {song.popularity}</p>
          )}
          <div className={`flex gap-2 ${size === 'large' ? 'mt-4' : 'mt-2'}`}>
            <button className="bg-gray-500 rounded-full p-1.5 shadow-lg hover:bg-gray-400 transition-colors">
              <Plus size={16} className="text-white" />
            </button>
            <a
              href={song.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs hover:bg-white/20 transition-colors"
            >
              {size === 'large' ? 'Listen on Spotify' : 'Listen'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};