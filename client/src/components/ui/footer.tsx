"use client"

import Link from "next/link"
import { Github, Twitter, Instagram, Music, Heart, HelpCircle, Shield, FileText, Mail } from "lucide-react"

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="text-white shadow-lg w-full bg-[#74686e] mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: About */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center">
              <Music className="mr-2" size={20} />
              Musicapp
            </h3>
            <p className="text-sm text-gray-300 mb-4">
              Discover new music, connect with friends, and share your favorite tracks. Your personalized music
              experience starts here.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="hover:text-blue-400 transition-colors">
                <Twitter size={20} />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="#" className="hover:text-pink-400 transition-colors">
                <Instagram size={20} />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href="#" className="hover:text-gray-400 transition-colors">
                <Github size={20} />
                <span className="sr-only">GitHub</span>
              </Link>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div>
            <h3 className="font-bold text-lg mb-4">Explore</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/for-you" className="hover:text-blue-300 transition-colors">
                  For You
                </Link>
              </li>
              <li>
                <Link href="/discover" className="hover:text-blue-300 transition-colors">
                  Discover
                </Link>
              </li>
              <li>
                <Link href="/artists" className="hover:text-blue-300 transition-colors">
                  Artists
                </Link>
              </li>
              <li>
                <Link href="/playlists" className="hover:text-blue-300 transition-colors">
                  Playlists
                </Link>
              </li>
              <li>
                <Link href="/genres" className="hover:text-blue-300 transition-colors">
                  Genres
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="font-bold text-lg mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="hover:text-blue-300 transition-colors flex items-center">
                  <HelpCircle className="mr-2" size={16} />
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-blue-300 transition-colors flex items-center">
                  <Heart className="mr-2" size={16} />
                  Community
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-blue-300 transition-colors flex items-center">
                  <Shield className="mr-2" size={16} />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-300 transition-colors flex items-center">
                  <FileText className="mr-2" size={16} />
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div>
            <h3 className="font-bold text-lg mb-4">Stay Updated</h3>
            <p className="text-sm text-gray-300 mb-4">
              Subscribe to our newsletter for the latest music updates and features.
            </p>
            <form className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="bg-blue-100 text-blue-800 rounded-full pl-4 pr-10 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bg-pink-600 hover:bg-pink-700 text-white p-1 rounded-full"
                  aria-label="Subscribe"
                >
                  <Mail size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom bar with copyright */}
        <div className="py-4 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center text-sm text-gray-300">
          <p>© {currentYear} Musicapp. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-blue-300 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-blue-300 transition-colors">
              Terms
            </Link>
            <Link href="/cookies" className="hover:text-blue-300 transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

