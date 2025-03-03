'use client';
import { useState, useEffect } from 'react';
import { Home, Search, Library, PlusCircle, Heart, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';

interface MenuItemProps {
  icon: ReactNode;
  label: string;
  href: string;
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when clicking outside of it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest('#sidebar')) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      {/* Sidebar */}
      <div 
        id="sidebar"
        className={`fixed top-0 left-0 z-20 w-64 bg-[#543c43] p-6 flex flex-col h-full text-white transition-all duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="mb-8 mt-14">
          <div className="space-y-4">
            <MenuItem icon={<Home size={20} />} label="Home" href="/discover" />
            <MenuItem icon={<Search size={20} />} label="Search" href="/search" />
            <MenuItem icon={<Library size={20} />} label="Your Library" href="/library" />
            <MenuItem icon={<Users size={20} />} label="Find People Like You" href="/find-people" />
          </div>
        </div>
        
        <div className="mt-4 mb-6">
          <MenuItem icon={<PlusCircle size={20} />} label="Create Playlist" href="/create-playlist" />
          <MenuItem icon={<Heart size={20} />} label="Liked Songs" href="/liked-songs" />
        </div>
        
        <div className="border-t border-[#74686e]/30 pt-4 mt-auto">
          <a href="#" className="text-sm text-white/80 hover:text-white transition duration-200">Cookies</a>
          <a href="#" className="text-sm block mt-2 text-white/80 hover:text-white transition duration-200">Privacy Policy</a>
        </div>
      </div>

      {/* Overlay to detect hover from left edge */}
      <div 
        className="fixed top-0 left-0 w-6 h-full z-10"
        onMouseEnter={() => setIsOpen(true)}
      ></div>
    </>
  );
}

// MenuItem Component
function MenuItem({ icon, label, href }: MenuItemProps) {
  return (
    <Link 
      href={href}
      className="flex items-center py-2 text-white/90 hover:text-white transition duration-200"
    >
      <span className="mr-4">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}