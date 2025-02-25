
import { Music, Search, Headphones, Heart, TrendingUp, Menu } from "lucide-react";
import React from "react";
import ScrollPage from "@/components/functions/ScrollPage";

const LandingPage = () => {
  return (
    <div className="relative min-h-screen bg-gray-900 text-yellow-50 overflow-hidden">
      <ScrollPage />
      {/* Fixed position video container */}
      <div className="fixed top-0 left-0 w-full h-full">
        <video 
          autoPlay 
          loop 
          muted 
          className="w-full h-full object-cover opacity-90"
        >
          <source src="/components/video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      
      {/* Navigation */}
      <header className="relative z-10 px-6 py-4">
        <nav className="flex justify-between items-center">
          <div className="flex items-center">
            <Music className="text-yellow-100 mr-2" />
            <span className="font-bold text-xl text-yellow-100"></span>
          </div>
          
          <div className="hidden md:flex space-x-6">
            <a href="#discover" className="text-yellow-100 hover:text-yellow-200 transition">Discover</a>
            <a href="#genres" className="text-yellow-100 hover:text-yellow-200 transition">Genres</a>
            <a href="#trending" className="text-yellow-100 hover:text-yellow-200 transition">Trending</a>
            <a href="#playlists" className="text-yellow-100 hover:text-yellow-200 transition">Playlists</a>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="hover:bg-black hover:bg-opacity-30 text-yellow-100 px-4 py-1 border-2 border-yellow-100  rounded-full text-sm transition">
              Sign Up
            </button>
            <button className="md:hidden">
              <Menu className="text-yellow-100" />
            </button>
          </div>
        </nav>
      </header>
      
      {/* Description Section */}
      <main className="relative z-10 px-6 flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-5xl md:text-6xl font-bold text mb-6">Discover Your Perfect Sound</h1>
        <p className="text-xl md:text-2xl max-w-2xl text-yellow-50 mb-8">
          Personalized music recommendations based on your unique taste and listening habits
        </p>
        
        {/* Search Bar */}
        <div className="relative w-full max-w-lg mb-12">
          <input 
            type="text" 
            placeholder="Search artists, songs, or genres..." 
            className="w-full bg-gray-800 bg-opacity-30 border border-gray-700 rounded-full py-3 px-6 pl-12 text-yellow-50 placeholder-yellow-100 placeholder-opacity-60 focus:outline-none focus:ring-1 focus:ring-black-200"
          />
          <Search className="absolute left-4 top-3 text-yellow-100 opacity-70" />
        </div>
        
        {/* Feature Icons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-purple-200 bg-opacity-20 p-4 mb-4">
              <Headphones size={32} className="text-yellow-100" />
            </div>
            <h3 className="text-lg font-semibold text-yellow-100 mb-2">Personalized Playlists</h3>
            <p className="text-yellow-50 text-sm">Curated music collections based on your listening habits.</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-purple-200 bg-opacity-20 p-4 mb-4">
              <Heart size={32} className="text-yellow-100" />
            </div>
            <h3 className="text-lg font-semibold text-yellow-100 mb-2">Taste Matching</h3>
            <p className="text-yellow-50 text-sm">Connect with users who share your musical preferences.</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-purple-200 bg-opacity-20 p-4 mb-4">
              <TrendingUp size={32} className="text-yellow-100" />
            </div>
            <h3 className="text-lg font-semibold text-yellow-100 mb-2">Weekly Trends</h3>
            <p className="text-yellow-50 text-sm">Stay updated with the latest music trends and releases.</p>
          </div>
        </div>
        
        {/* CTA Button */}
        {/*<button className="mt-12 bg-gradient-to-r from-yellow-200 to-pink-400 hover:from-purple-600 hover:to-pink-500 text-yellow-50 px-8 py-3 rounded-full font-medium text-lg transition transform hover:scale-105">
          Start Discovering
        </button>*/}
      </main>
    
    </div>
  );
};

export default LandingPage;