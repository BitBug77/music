// components/Navbar.tsx
import React, { useState } from 'react';
import Link from 'next/link';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <span className="font-bold text-xl cursor-pointer">MusicMatcher</span>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">Home</Link>
                <Link href="/discover" className="bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">Discover</Link>
                <Link href="/playlists" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">Playlists</Link>
                <Link href="/artists" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">Artists</Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <div className="relative">
                <input
                  className="bg-gray-800 rounded-full px-4 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="text"
                  placeholder="Search..."
                />
              </div>
              <button className="ml-4 p-1 rounded-full text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                <span>Profile</span>
              </button>
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/" className="hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium">Home</Link>
            <Link href="/discover" className="bg-gray-700 block px-3 py-2 rounded-md text-base font-medium">Discover</Link>
            <Link href="/playlists" className="hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium">Playlists</Link>
            <Link href="/artists" className="hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium">Artists</Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="flex items-center px-5">
              <input
                className="bg-gray-800 rounded-full px-4 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="text"
                placeholder="Search..."
              />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;