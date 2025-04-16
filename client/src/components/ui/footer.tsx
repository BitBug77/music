"use client"

import Link from "next/link"
import { Github, Twitter, Instagram, Music, Heart, HelpCircle, Shield, FileText, Mail, Facebook, Youtube } from "lucide-react"

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="text-white shadow-lg w-full bg-[#74686e] mt-auto">
      {/* Top promotional banner */}
      <div className="w-full py-4 bg-blue-900 text-center">
        <h2 className="text-2xl font-bold">Get Premium for 3 months free!</h2>
        <p className="mt-2 text-lg">Unlimited music, no ads, offline listening, and more.</p>
        <button className="mt-3 bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 px-6 rounded-full transition-colors text-lg">
          GET STARTED
        </button>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content - more compact */}
        <div className="py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Column 1: About */}
          <div>
            <h3 className="font-bold text-xl mb-3 flex items-center">
              <Music className="mr-2" size={24} />
              Musicapp
            </h3>
            <p className="text-base text-gray-300 mb-3">
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
              <Link href="#" className="hover:text-blue-400 transition-colors">
                <Facebook size={20} />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="#" className="hover:text-red-400 transition-colors">
                <Youtube size={20} />
                <span className="sr-only">YouTube</span>
              </Link>
              <Link href="#" className="hover:text-gray-400 transition-colors">
                <Github size={20} />
                <span className="sr-only">GitHub</span>
              </Link>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div>
            <h3 className="font-bold text-xl mb-3">Explore</h3>
            <ul className="grid grid-cols-2 gap-2 text-base">
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
              <li>
                <Link href="/new-releases" className="hover:text-blue-300 transition-colors">
                  New Releases
                </Link>
              </li>
              <li>
                <Link href="/charts" className="hover:text-blue-300 transition-colors">
                  Charts
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-blue-300 transition-colors">
                  Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="font-bold text-xl mb-3">Resources</h3>
            <ul className="grid grid-cols-2 gap-2 text-base">
              <li>
                <Link href="/help" className="hover:text-blue-300 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-blue-300 transition-colors">
                  Community
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-blue-300 transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-300 transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-blue-300 transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-blue-300 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-blue-300 transition-colors">
                  Developers
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-blue-300 transition-colors">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div>
            <h3 className="font-bold text-xl mb-3">Stay Updated</h3>
            <p className="text-base text-gray-300 mb-3">
              Subscribe to our newsletter for the latest updates.
            </p>
            <form className="mb-3">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="bg-blue-100 text-blue-800 rounded-full pl-4 pr-12 py-2 text-base w-full focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bg-pink-600 hover:bg-pink-700 text-white p-1 rounded-full"
                  aria-label="Subscribe"
                >
                  <Mail size={20} />
                </button>
              </div>
            </form>
            <div className="text-sm">
              <p>Download our app:</p>
              <div className="flex space-x-2 mt-2">
                <button className="bg-black text-white px-3 py-1 rounded text-xs">
                  App Store
                </button>
                <button className="bg-black text-white px-3 py-1 rounded text-xs">
                  Google Play
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar with copyright */}
        <div className="py-4 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center text-sm text-gray-300">
          <p>© {currentYear} Musicapp. All rights reserved.</p>
          <div className="flex space-x-6 mt-2 md:mt-0">
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